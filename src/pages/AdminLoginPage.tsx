import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandHeader from '@/components/BrandHeader';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.user) {
      setErr(error?.message ?? 'Invalid credentials.');
      setBusy(false);
      return;
    }

    // Verify admin row exists
    const { data: row, error: e2 } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (e2 || !row) {
      await supabase.auth.signOut();
      setErr('This account is not an authorized admin.');
      setBusy(false);
      return;
    }

    navigate('/admin');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="card p-10 w-full max-w-md">
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent-500 font-medium mb-2">
            Restricted access
          </div>
          <h1 className="font-display text-3xl text-ink-900 mb-1">Admin sign in</h1>
          <p className="text-ink-500 text-sm mb-8">For test administrators only.</p>

          <div className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {err && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? '…' : 'Sign in'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
