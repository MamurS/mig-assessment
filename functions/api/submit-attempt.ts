import { Env, jsonResponse, errorResponse, sbSelect, sbUpdate } from './_shared';
import { ANSWER_KEY } from './_answerkey';

interface Body {
  attemptId: string;
}

interface AnswerRow {
  id: string;
  attempt_id: string;
  question_id: string;
  question_type: 'mcq_single' | 'mcq_multi' | 'open';
  response: string[] | string;
}

interface AttemptRow {
  id: string;
  candidate_email: string;
  lang: 'en' | 'ru' | 'uz';
  status: string;
}

// ---------------------------------------------------------------------------
// MCQ scoring (mirrors src/lib/scoring.ts — duplicated because the function
// runs in a separate bundle and can't easily import from src/)
// ---------------------------------------------------------------------------
function scoreMCQ(
  type: 'mcq_single' | 'mcq_multi',
  correct: string[],
  response: unknown,
  points: number
): number {
  if (!Array.isArray(response)) return 0;
  const normResp = [...new Set(response.map((s) => String(s).toUpperCase().trim()))].sort();
  const normCorrect = [...correct.map((s) => s.toUpperCase().trim())].sort();
  if (type === 'mcq_single') {
    return normResp.length === 1 && normResp[0] === normCorrect[0] ? points : 0;
  }
  if (normResp.length !== normCorrect.length) return 0;
  for (let i = 0; i < normResp.length; i++) {
    if (normResp[i] !== normCorrect[i]) return 0;
  }
  return points;
}

// ---------------------------------------------------------------------------
// AI grading via Claude API
// ---------------------------------------------------------------------------
interface AIGrade {
  points: number;
  feedback: string;
}

async function gradeOpenWithAI(
  env: Env,
  questionText: string,
  rubric: string,
  candidateAnswer: string,
  maxPoints: number,
  lang: 'en' | 'ru' | 'uz'
): Promise<AIGrade> {
  if (!candidateAnswer || !candidateAnswer.trim()) {
    return { points: 0, feedback: 'No answer provided.' };
  }

  // Localized feedback hint — the grader writes feedback in the same language
  // as the candidate, so the admin sees it in context.
  const feedbackLang =
    lang === 'ru' ? 'Russian' : lang === 'uz' ? 'Uzbek (Latin script)' : 'English';

  const prompt = `You are a strict but fair examiner grading a junior insurance underwriter's written answer against an internal rubric. Be precise and reference the rubric directly.

QUESTION:
${questionText}

RUBRIC (model answer with point allocation):
${rubric}

CANDIDATE'S ANSWER:
${candidateAnswer}

INSTRUCTIONS:
- Award points strictly per the rubric. Maximum: ${maxPoints} points. Minimum: 0.
- Half-point increments allowed (e.g. 0, 0.5, 1.0, 1.5, ...).
- Vague or generic answers should lose marks even if directionally correct.
- Calculation errors lose the calculation marks but candidate keeps method marks if logic is right.
- Write feedback in ${feedbackLang}, addressing the candidate (you/вы/siz).
- Feedback should: (1) state the score and why, (2) note what was correct, (3) note what was missing or wrong, (4) be 3-6 sentences total.

Respond ONLY with a single JSON object, no prose, no markdown, no code fences:
{"points": <number>, "feedback": "<string>"}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Anthropic API error:', res.status, txt);
      return { points: 0, feedback: `[Auto-grading failed: ${res.status} — ${txt.slice(0, 200)}]` };
    }

    const data = await res.json() as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');

    // Strip code fences if Claude returned them despite instructions
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: { points: number; feedback: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract a JSON object from the text
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no_json_in_response');
      parsed = JSON.parse(match[0]);
    }

    // Clamp and sanitize
    let pts = typeof parsed.points === 'number' ? parsed.points : 0;
    pts = Math.max(0, Math.min(maxPoints, pts));
    pts = Math.round(pts * 2) / 2; // round to nearest 0.5

    const feedback = typeof parsed.feedback === 'string'
      ? parsed.feedback.slice(0, 2000)
      : '';

    return { points: pts, feedback };
  } catch (e) {
    console.error('AI grading exception:', e);
    return { points: 0, feedback: '[Auto-grading failed — please grade manually]' };
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_json');
  }

  const { attemptId } = body;
  if (!attemptId || typeof attemptId !== 'string') {
    return errorResponse('missing_attempt_id');
  }

  // 1. Load attempt
  const attempts = await sbSelect<AttemptRow>(
    env,
    'attempts',
    `select=id,candidate_email,lang,status&id=eq.${encodeURIComponent(attemptId)}`
  );
  const attempt = attempts[0];
  if (!attempt) return errorResponse('attempt_not_found', 404);

  // Idempotent: if already submitted/graded, just return ok
  if (attempt.status !== 'in_progress') {
    return jsonResponse({ ok: true, alreadyDone: true });
  }

  // 2. Load all answers for this attempt
  const answers = await sbSelect<AnswerRow>(
    env,
    'answers',
    `select=id,attempt_id,question_id,question_type,response&attempt_id=eq.${encodeURIComponent(attemptId)}`
  );

  // 3. Score each answer
  let totalAuto = 0;

  for (const ans of answers) {
    const key = ANSWER_KEY[ans.question_id];
    if (!key) {
      // Unknown question — skip but log
      console.warn('Unknown question id:', ans.question_id);
      continue;
    }

    let points = 0;
    let feedback: string | null = null;

    if (key.type === 'mcq_single' || key.type === 'mcq_multi') {
      points = scoreMCQ(key.type, key.correct ?? [], ans.response, key.points);
    } else if (key.type === 'open') {
      const candidateText = typeof ans.response === 'string' ? ans.response : '';
      const grade = await gradeOpenWithAI(
        env,
        key.questionText ?? '',
        key.rubric ?? '',
        candidateText,
        key.points,
        attempt.lang
      );
      points = grade.points;
      feedback = grade.feedback;
    }

    totalAuto += points;

    // Update the answer row with auto_points and ai_feedback
    await sbUpdate(env, 'answers', `id=eq.${ans.id}`, {
      auto_points: points,
      ai_feedback: feedback,
    });
  }

  // 4. Update attempt: status -> submitted, auto_score, submitted_at
  // We use a direct PATCH so we can set submitted_at = now() server-side.
  // PostgREST doesn't support now() in the body, so we send an ISO timestamp.
  const submittedAt = new Date().toISOString();
  await sbUpdate(env, 'attempts', `id=eq.${attemptId}`, {
    status: 'submitted',
    auto_score: totalAuto,
    submitted_at: submittedAt,
  });

  return jsonResponse({ ok: true, autoScore: totalAuto });
};
