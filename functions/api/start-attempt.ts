import { Env, jsonResponse, errorResponse, sbSelect, sbInsert } from './_shared';

interface Body {
  name: string;
  email: string;
  lang: 'en' | 'ru' | 'uz';
  questionOrder: string[];
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_json');
  }

  const { name, email, lang, questionOrder } = body;
  if (!name || !email || !lang || !Array.isArray(questionOrder) || questionOrder.length === 0) {
    return errorResponse('missing_fields');
  }
  if (!['en', 'ru', 'uz'].includes(lang)) {
    return errorResponse('invalid_lang');
  }

  // Check if email has already submitted/graded a test
  const existing = await sbSelect<{ id: string; status: string }>(
    env,
    'attempts',
    `select=id,status&candidate_email=eq.${encodeURIComponent(email.toLowerCase())}&status=in.(submitted,graded)`
  );
  if (existing.length > 0) {
    return errorResponse('already_taken', 409);
  }

  // Create new attempt
  const ip = request.headers.get('cf-connecting-ip') ?? null;
  const ua = request.headers.get('user-agent') ?? null;

  const inserted = await sbInsert<{ id: string; started_at: string }>(env, 'attempts', {
    candidate_name: name,
    candidate_email: email.toLowerCase(),
    lang,
    question_order: questionOrder,
    ip,
    user_agent: ua,
  });

  if (!inserted[0]) {
    return errorResponse('insert_failed', 500);
  }

  return jsonResponse({
    attemptId: inserted[0].id,
    startedAt: inserted[0].started_at,
    questionOrder,
  });
};
