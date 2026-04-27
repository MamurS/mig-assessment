import BrandHeader from '@/components/BrandHeader';
import { Link } from 'react-router-dom';
import { getTest } from '@/lib/test-content';
import type { Lang } from '@/types';
import { useState, useEffect } from 'react';

export default function SubmittedPage() {
  // We don't always know the lang here (sessionStorage may have been cleared),
  // so default to EN but try to read from localStorage if present.
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    const stored = localStorage.getItem('mig-last-lang');
    if (stored === 'en' || stored === 'ru' || stored === 'uz') setLang(stored);
  }, []);
  const t = getTest(lang);

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="card p-12 max-w-xl text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-50 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-ink-900 mb-3">{t.ui.submitted_title}</h1>
          <p className="text-ink-600 leading-relaxed">{t.ui.submitted_body}</p>

          <div className="mt-10 pt-6 border-t border-ink-100">
            <Link to="/" className="text-sm text-ink-500 hover:text-accent-500">
              ← Back to start
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
