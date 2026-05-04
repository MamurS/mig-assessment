// functions/api/start-attempt.ts
//
// Creates a new attempt OR resumes an existing in-progress one (after a session reset).
// Accepts a `version` field ('reinsurance' | 'health') indicating which test version
// the candidate is taking. One email = one attempt across BOTH versions (existing
// behavior preserved): if the candidate already submitted reinsurance, they cannot
// start health, and vice versa.
//
// On resume:
//   - The original started_at is preserved → 90-min timer continues from where it was
//   - Returns the same questionOrder so questions stay in same position
//   - Returns the original version (server's value) — the frontend trusts this even
//     if the candidate selected a different version on the landing page during resume
//   - Does NOT return any saved answers (candidate sees blank state)
//
// Note: actual answers in DB stay intact for admin review. They will be
// overwritten as the candidate re-enters answers.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY: string;
}

type Version = 'reinsurance' | 'health';
const VALID_VERSIONS: Version[] = ['reinsurance', 'health'];

interface StartBody {
  name: string;
  email: string;
  lang: 'en' | 'ru' | 'uz';
  version: Version;
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
  const version: Version = VALID_VERSIONS.includes(body.version) ? body.version : 'reinsurance';
  if (!email || !name) return json({ error: 'invalid_body' }, 400);

  // Look up any existing attempt for this email (across BOTH versions)
  const lookup = await sb(
    context.env,
    `attempts?candidate_email=eq.${encodeURIComponent(email)}&select=id,status,started_at,question_order,violation_count,version&order=started_at.desc&limit=1`
  );
  if (lookup.ok) {
    const rows = (await lookup.json()) as Array<{
      id: string;
      status: string;
      started_at: string;
      question_order: string[];
      violation_count: number;
      version: Version;
    }>;
    if (rows && rows.length > 0) {
      const a = rows[0];
      if (a.status === 'submitted' || a.status === 'graded') {
        return json({ error: 'already_taken' }, 409);
      }
      if (a.status === 'in_progress') {
        // Resume: original started_at preserved → timer continues.
        // Return the stored version so the frontend loads the correct question set,
        // even if the candidate selected a different version on this landing visit.
        return json({
          attemptId: a.id,
          startedAt: a.started_at,
          questionOrder: a.question_order,
          version: a.version,
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
        version,
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
    version,
    resumed: false,
  });
};
