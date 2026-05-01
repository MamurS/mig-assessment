import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
console.log('SUPABASE KEY AT BUILD:', anonKey ? `present (${anonKey.slice(0,10)}...)` : 'MISSING');

if (!url || !anonKey) {
  // Fail fast in dev so we don't silently submit to nowhere.
  // eslint-disable-next-line no-console
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'mig-assessment-auth',
  },
});
