// Shared utilities for Cloudflare Pages Functions.
// These run in a Workers (V8 isolate) environment.

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY: string;
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: string, status = 400): Response {
  return jsonResponse({ error }, status);
}

// Minimal Supabase REST client using fetch (no SDK needed in Workers).
export async function supabaseRequest(
  env: Env,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
  return fetch(url, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers ?? {}),
    },
  });
}

// Query helper
export async function sbSelect<T = unknown>(
  env: Env,
  table: string,
  query: string
): Promise<T[]> {
  const res = await supabaseRequest(env, `${table}?${query}`);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase select ${table} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function sbInsert<T = unknown>(
  env: Env,
  table: string,
  body: unknown
): Promise<T[]> {
  const res = await supabaseRequest(env, table, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase insert ${table} failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function sbUpdate(
  env: Env,
  table: string,
  query: string,
  body: unknown
): Promise<unknown> {
  const res = await supabaseRequest(env, `${table}?${query}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase update ${table} failed: ${res.status} ${txt}`);
  }
  return res.json();
}
