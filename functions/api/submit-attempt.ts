// functions/api/submit-attempt.ts
//
// Two-phase submission:
//   1. SYNCHRONOUS (fast — typically <1s):
//      • Score the MCQ answers (deterministic, no API calls)
//      • Mark attempt as 'submitted', set submitted_at and grading_status='pending'
//      • Write MCQ scores to answers table
//      • Return success to the candidate immediately
//
//   2. BACKGROUND (via context.waitUntil — runs after the response is sent):
//      • Grade open questions with AI in parallel (3 calls × ~5-15s each)
//      • Update each open question's auto_points and ai_feedback
//      • Update the attempt's auto_score (now including AI points) and
//        grading_status='complete'
//
// Candidate experience: clicks Submit → "Test submitted" appears within ~1s
// regardless of how long AI grading takes.
//
// Admin experience: dashboard shows a "Grading…" badge for ~10-30 seconds
// after submit, then the badge clears and final auto_score appears.

import { Env, jsonResponse, errorResponse, sbSelect, sbUpdate } from './_shared';
import { ANSWER_KEY, type Version } from './_answerkey';

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
  version: Version;
  status: string;
}

// ---------------------------------------------------------------------------
// MCQ scoring — deterministic, fast
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
// AI grading via Claude (Cloudflare AI Gateway)
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

  const feedbackLang =
    lang === 'ru' ? 'Russian' : lang === 'uz' ? 'Uzbek (Latin script)' : 'English';

  const prompt = `You are a fair and lenient examiner grading a junior insurance underwriter's written answer against an internal rubric. Be generous — these are entry-to-mid-level candidates and the goal is to identify whether they understand the concept, not to penalise minor imperfections.

QUESTION:
${questionText}

RUBRIC (model answer with point allocation):
${rubric}

CANDIDATE'S ANSWER:
${candidateAnswer}

GRADING PHILOSOPHY — IMPORTANT:
- Be GENEROUS overall. When in doubt between two scores, choose the higher one.
- Award FULL marks for any answer that demonstrates correct understanding of the concept, even if expressed informally, briefly, or with imperfect terminology.
- Reward correct REASONING and METHOD over precise wording or perfect detail.
- Treat the rubric as a guide for what counts as a good answer, NOT as a strict checklist where every bullet must appear verbatim. If the candidate captures the spirit of the rubric, award full or near-full marks.

ARITHMETIC ERRORS — DO NOT PENALISE:
- Calculation/arithmetic mistakes do NOT lose marks. Award full marks for the calculation portion as long as the METHOD and APPROACH are correct.
- If the candidate sets up the right formula or shows the right reasoning but arrives at a wrong number, give them the full points for that part.
- Only deduct calculation marks if the candidate uses a fundamentally wrong method (e.g. uses combined ratio formula when asked for loss ratio).

INSTRUCTIONS:
- Award points strictly per the rubric. Maximum: ${maxPoints} points. Minimum: 0.
- Half-point increments allowed (e.g. 0, 0.5, 1.0, 1.5, ...).
- A blank or "I don't know" answer gets 0. Anything that shows engagement with the question deserves at least partial credit.
- Write feedback in ${feedbackLang}, addressing the candidate (you/вы/siz).
- Feedback should: (1) state the score and why, (2) note what was correct, (3) note what could have been added or strengthened (frame as suggestion, not criticism), (4) be 3-6 sentences total, encouraging in tone.

Respond ONLY with a single JSON object, no prose, no markdown, no code fences:
{"points": <number>, "feedback": "<string>"}`;

  try {
    const res = await fetch('https://gateway.ai.cloudflare.com/v1/8c3ca6927707ade25ff2412c2368fee4/mig-grading-1/anthropic/v1/messages', {
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

    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: { points: number; feedback: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no_json_in_response');
      parsed = JSON.parse(match[0]);
    }

    let pts = typeof parsed.points === 'number' ? parsed.points : 0;
    pts = Math.max(0, Math.min(maxPoints, pts));
    pts = Math.round(pts * 2) / 2;

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
// Background grading task — runs after response is sent.
// Grades all open questions in parallel, writes results, updates attempt totals.
// ---------------------------------------------------------------------------
async function backgroundGradeOpenQuestions(
  env: Env,
  attemptId: string,
  attemptLang: 'en' | 'ru' | 'uz',
  version: Version,
  openAnswers: AnswerRow[],
  mcqScoreSoFar: number
): Promise<void> {
  const KEY = ANSWER_KEY[version];

  try {
    const tasks = openAnswers.map(async (ans) => {
      const key = KEY[ans.question_id];
      if (!key || key.type !== 'open') return { ans, points: 0, feedback: null };
      const candidateText = typeof ans.response === 'string' ? ans.response : '';
      const grade = await gradeOpenWithAI(
        env,
        key.questionText ?? '',
        key.rubric ?? '',
        candidateText,
        key.points,
        attemptLang
      );
      return { ans, points: grade.points, feedback: grade.feedback };
    });

    const results = await Promise.all(tasks);

    // Sum AI-graded points; mcqScoreSoFar already has the deterministic MCQ total.
    let openTotal = 0;
    for (const r of results) openTotal += r.points;

    // Write each open answer's auto_points + ai_feedback in parallel.
    await Promise.all(
      results.map((r) =>
        sbUpdate(env, 'answers', `id=eq.${r.ans.id}`, {
          auto_points: r.points,
          ai_feedback: r.feedback,
        })
      )
    );

    // Update attempt total auto_score and grading_status='complete'.
    const finalAutoScore = mcqScoreSoFar + openTotal;
    await sbUpdate(env, 'attempts', `id=eq.${attemptId}`, {
      auto_score: finalAutoScore,
      grading_status: 'complete',
    });
  } catch (e) {
    console.error('Background grading failed:', e);
    // Mark grading as failed so the admin knows to grade manually.
    await sbUpdate(env, 'attempts', `id=eq.${attemptId}`, {
      grading_status: 'failed',
    }).catch((err) => console.error('Could not mark grading_status=failed:', err));
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

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
    `select=id,candidate_email,lang,version,status&id=eq.${encodeURIComponent(attemptId)}`
  );
  const attempt = attempts[0];
  if (!attempt) return errorResponse('attempt_not_found', 404);

  // Idempotent: if already submitted/graded, just return ok
  if (attempt.status !== 'in_progress') {
    return jsonResponse({ ok: true, alreadyDone: true });
  }

  // Resolve version (defensive — defaults to reinsurance for any pre-migration rows)
  const version: Version = (attempt.version === 'health' || attempt.version === 'reinsurance')
    ? attempt.version
    : 'reinsurance';
  const KEY = ANSWER_KEY[version];

  // 2. Load all answers
  const answers = await sbSelect<AnswerRow>(
    env,
    'answers',
    `select=id,attempt_id,question_id,question_type,response&attempt_id=eq.${encodeURIComponent(attemptId)}`
  );

  // 3. Score MCQs synchronously and collect open questions for background grading.
  const mcqUpdates: Array<{ id: string; points: number }> = [];
  const openAnswers: AnswerRow[] = [];
  let mcqTotal = 0;

  for (const ans of answers) {
    const key = KEY[ans.question_id];
    if (!key) {
      console.warn(`Unknown question id for version ${version}:`, ans.question_id);
      continue;
    }

    if (key.type === 'mcq_single' || key.type === 'mcq_multi') {
      const points = scoreMCQ(key.type, key.correct ?? [], ans.response, key.points);
      mcqTotal += points;
      mcqUpdates.push({ id: ans.id, points });
    } else if (key.type === 'open') {
      openAnswers.push(ans);
    }
  }

  // 4. Write MCQ scores synchronously (all in parallel, but we await before responding).
  await Promise.all(
    mcqUpdates.map((u) =>
      sbUpdate(env, 'answers', `id=eq.${u.id}`, {
        auto_points: u.points,
        ai_feedback: null,
      })
    )
  );

  // 5. Mark attempt as submitted with the partial (MCQ-only) auto_score.
  // grading_status='pending' tells admin UI that AI grading is still running.
  // If there are no open questions, mark grading_status='complete' immediately.
  const submittedAt = new Date().toISOString();
  const initialStatus = openAnswers.length > 0 ? 'pending' : 'complete';
  await sbUpdate(env, 'attempts', `id=eq.${attemptId}`, {
    status: 'submitted',
    auto_score: mcqTotal,
    submitted_at: submittedAt,
    grading_status: initialStatus,
  });

  // 6. Kick off background AI grading (non-blocking).
  // context.waitUntil() lets the Worker keep running this task after we return.
  if (openAnswers.length > 0) {
    context.waitUntil(
      backgroundGradeOpenQuestions(
        env,
        attemptId,
        attempt.lang,
        version,
        openAnswers,
        mcqTotal
      )
    );
  }

  // 7. Respond immediately. Candidate sees "Test submitted" with no spinner wait.
  return jsonResponse({
    ok: true,
    autoScore: mcqTotal,         // partial — will increase once AI grading finishes
    gradingStatus: initialStatus, // 'pending' or 'complete' (if no open questions)
  });
};
