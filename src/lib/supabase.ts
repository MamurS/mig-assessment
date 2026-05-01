import { createClient } from '@supabase/supabase-js';

const url = 'https://fuovlibdyokjprqjkjtr.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1b3ZsaWJkeW9ranBycWpranRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODcyOTgsImV4cCI6MjA5Mjg2MzI5OH0.iWwML8_TKBXmHTPZIvjNgeklfUQiOtMJgS91iGw52MI';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'mig-assessment-auth',
  },
});
