import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandHeader from '@/components/BrandHeader';
import { LANGUAGES, getTest, isValidEmail, shuffleQuestionOrder, TEST_DURATION_MINUTES } from '@/lib/test-content';
import type { Lang } from '@/types';

export default function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>('en');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const t = getTest(lang);

  async function handleStart() {
    setErr(null);

    if (!name.trim()) return setErr(t.ui.required);
    if (!isValidEmail(email)) return setErr(t.ui.invalid_email);

    setBusy(true);
    try {
      const res = await fetch('/api/start-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          lang,
          questionOrder: shuffleQuestionOrder(t.questions),
        }),
      });

      const data = (await res.json()) as
        | { error: string }
        | { attemptId: string; startedAt: string; questionOrder: string[] };
      if (!res.ok) {
        const errKey = (data as { error: string }).error;
        setErr(errKey === 'already_taken' ? t.ui.already_taken : t.ui.error);
        setBusy(false);
        return;
      }
      const ok = data as { attemptId: string; startedAt: string; questionOrder: string[] };

      sessionStorage.setItem(`attempt-${ok.attemptId}`, JSON.stringify({
        lang,
        startedAt: ok.startedAt,
        endsAt: new Date(new Date(ok.startedAt).getTime() + TEST_DURATION_MINUTES * 60_000).toISOString(),
        questionOrder: ok.questionOrder,
      }));

      navigate(`/test/${ok.attemptId}`);
    } catch (e) {
      console.error(e);
      setErr(t.ui.error);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="card w-full max-w-2xl p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-accent-500/30" />
            <div className="text-[10px] uppercase tracking-[0.25em] text-accent-500 font-medium">
              Confidential · Internal Use
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-accent-500/30" />
          </div>

          <h1 className="font-display text-4xl text-ink-900 mb-2">{t.title}</h1>
          <p className="text-ink-500 text-sm italic mb-1">{t.subtitle}</p>
          <p className="text-ink-700 mt-6 leading-relaxed">{t.ui.welcome_body}</p>
          <p className="text-xs text-ink-500 mt-3 leading-relaxed">{t.instructions}</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="label">{t.ui.select_lang}</label>
              <div className="flex gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLang(l.value)}
                    className={`flex-1 px-4 py-2.5 rounded-md border text-sm font-medium transition-all ${lang === l.value ? 'border-accent-500 bg-accent-50 text-accent-600' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">{t.ui.candidate_name}</label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="label">{t.ui.candidate_email}</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            {err && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            )}

            <button
              className="btn-primary w-full mt-2"
              onClick={handleStart}
              disabled={busy}
            >
              {busy ? '…' : t.ui.start} →
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-ink-100 text-center">
            <p className="text-xs text-ink-400">
              {t.org} · {TEST_DURATION_MINUTES} minutes · 100 points
            </p>
            <p className="mt-3">
              
                href="/admin/login"
                className="text-[11px] text-ink-300 hover:text-accent-500 transition-colors uppercase tracking-wider"
              <a>
                Admin
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
