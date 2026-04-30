// functions/api/report-violation.ts
//
// Called by the test page when anti-cheat detects a tab switch / focus loss / refresh
// and the user does not return within the grace period.
//
// Behavior:
//   - Increments violation_count on the attempt
//   - Stores last violation timestamp and reason
//   - Does NOT delete answers (kept for admin review)
//   - Candidate's sessionStorage is cleared client-side, so on their next /start-attempt
//     call they'll resume with blank state but same timer.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface Body {
  attemptId: string;
  reason: 'visibility' | 'blur' | 'unload' | 'manual';
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
  let body: Body;
  try {
    body = (await context.request.json()) as Body;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  const attemptId = (body.attemptId || '').trim();
  if (!attemptId) return json({ error: 'invalid_body' }, 400);

  // Look up attempt to get current violation_count
  const lookup = await sb(
    context.env,
    `attempts?id=eq.${encodeURIComponent(attemptId)}&select=id,status,violation_count&limit=1`
  );
  if (!lookup.ok) return json({ error: 'lookup_failed' }, 500);
  const rows = (await lookup.json()) as Array<{ id: string; status: string; violation_count: number }>;
  if (!rows || rows.length === 0) return json({ error: 'not_found' }, 404);

  const a = rows[0];
  if (a.status !== 'in_progress') {
    // Don't bump violations on already-submitted attempts
    return json({ ok: false, status: a.status }, 200);
  }

  const newCount = (a.violation_count ?? 0) + 1;

  const upd = await sb(
    context.env,
    `attempts?id=eq.${encodeURIComponent(attemptId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        violation_count: newCount,
        last_violation_at: new Date().toISOString(),
        last_violation_reason: body.reason,
      }),
    }
  );

  if (!upd.ok) {
    const err = await upd.text();
    console.error('violation update failed:', err);
    return json({ error: 'update_failed' }, 500);
  }

  return json({ ok: true, violationCount: newCount });
};
