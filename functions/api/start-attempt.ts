// functions/api/start-attempt.ts
//
// Creates a new attempt OR resumes an existing in-progress one (after a session reset).
// On resume:
//   - The original started_at is preserved → 90-min timer continues from where it was
//   - Returns the same questionOrder so questions stay in same position
//   - Does NOT return any saved answers (candidate sees blank state)
//
// Note: actual answers in DB stay intact for admin review. They will be
// overwritten as the candidate re-enters answers.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY: string;
}

interface StartBody {
  name: string;
  email: string;
  lang: 'en' | 'ru' | 'uz';
  questionOrder: string[];
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function sb(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: StartBody;
  try {
    body = (await context.request.json()) as StartBody;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  if (!email || !name) return json({ error: 'invalid_body' }, 400);

  // Look up any existing attempt for this email
  const lookup = await sb(
    context.env,
    `attempts?candidate_email=eq.${encodeURIComponent(email)}&select=id,status,started_at,question_order,violation_count&order=started_at.desc&limit=1`
  );
  if (lookup.ok) {
    const rows = (await lookup.json()) as Array<{
      id: string;
      status: string;
      started_at: string;
      question_order: string[];
      violation_count: number;
    }>;
    if (rows && rows.length > 0) {
      const a = rows[0];
      if (a.status === 'submitted' || a.status === 'graded') {
        return json({ error: 'already_taken' }, 409);
      }
      if (a.status === 'in_progress') {
        // Resume: original started_at preserved → timer continues.
        // We DO return the same question order so the candidate sees identical questions
        // in the same positions, but we do NOT return any saved answers.
        return json({
          attemptId: a.id,
          startedAt: a.started_at,
          questionOrder: a.question_order,
          resumed: true,
        });
      }
    }
  }

  // Fresh attempt
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const insert = await sb(context.env, 'attempts', {
    method: 'POST',
    body: JSON.stringify([
      {
        id,
        candidate_name: name,
        candidate_email: email,
        lang: body.lang,
        question_order: body.questionOrder,
        started_at: now,
        status: 'in_progress',
        violation_count: 0,
      },
    ]),
  });

  if (!insert.ok) {
    const err = await insert.text();
    console.error('insert failed:', err);
    return json({ error: 'insert_failed' }, 500);
  }

  return json({
    attemptId: id,
    startedAt: now,
    questionOrder: body.questionOrder,
    resumed: false,
  });
};
