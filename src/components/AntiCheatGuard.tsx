// src/components/AntiCheatGuard.tsx
//
// Detects tab switching, focus loss, alt-tab, refresh, etc.
// Shows a 5-second countdown warning. If user doesn't return in time,
// reports a violation and clears sessionStorage so they're forced
// back to landing. Original answers stay in DB for admin review.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  attemptId: string;
  graceSeconds?: number;
  /**
   * When true, all anti-cheat detection is paused.
   * Use this during submit (so the candidate can't accidentally trigger a reset
   * while waiting 10-15 seconds for AI grading to finish).
   */
  paused?: boolean;
}

export default function AntiCheatGuard({ attemptId, graceSeconds = 5, paused = false }: Props) {
  const navigate = useNavigate();
  const [warning, setWarning] = useState<{ reason: string; remaining: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const warnedRef = useRef(false);
  const triggeredRef = useRef(false);

  function clearWarningTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function reportAndReset(reason: 'visibility' | 'blur' | 'unload' | 'manual') {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    try {
      await fetch('/api/report-violation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ attemptId, reason }),
        keepalive: true,
      });
    } catch (e) {
      console.error('violation report failed', e);
    }
    try {
      sessionStorage.removeItem(`attempt-${attemptId}`);
    } catch {}
    navigate('/');
  }

  function startCountdown(reason: string) {
    if (warnedRef.current) return;
    warnedRef.current = true;
    setWarning({ reason, remaining: graceSeconds });

    let remaining = graceSeconds;
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearWarningTimer();
        reportAndReset(reason as 'visibility' | 'blur' | 'unload' | 'manual');
      } else {
        setWarning({ reason, remaining });
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (!warnedRef.current) return;
    clearWarningTimer();
    setWarning(null);
    warnedRef.current = false;
  }

  useEffect(() => {
    function onVisibility() {
      if (paused) return;
      if (document.visibilityState === 'hidden') {
        startCountdown('visibility');
      } else if (document.visibilityState === 'visible') {
        cancelCountdown();
      }
    }

    function onBlur() {
      if (paused) return;
      if (!warnedRef.current) {
        startCountdown('blur');
      }
    }

    function onFocus() {
      cancelCountdown();
    }

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (paused) return;
      try {
        const blob = new Blob([JSON.stringify({ attemptId, reason: 'unload' })], {
          type: 'application/json',
        });
        navigator.sendBeacon('/api/report-violation', blob);
      } catch {}
      try {
        sessionStorage.removeItem(`attempt-${attemptId}`);
      } catch {}
      e.preventDefault();
      e.returnValue = '';
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      clearWarningTimer();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, paused]);

  if (!warning) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-red-900/95 backdrop-blur flex items-center justify-center p-6"
      role="alertdialog"
      aria-live="assertive"
    >
      <div className="max-w-lg text-center text-white">
        <div className="text-6xl font-bold mb-4">⚠️</div>
        <h2 className="text-3xl font-bold mb-3">Return to the test</h2>
        <p className="text-lg mb-6">
          Switching tabs, windows, or applications during the test is not allowed.
          Return to this tab within <span className="font-bold text-yellow-300">{warning.remaining}s</span> or
          your session will be reset and all answers cleared.
        </p>
        <div className="text-7xl font-mono font-bold text-yellow-300">
          {warning.remaining}
        </div>
      </div>
    </div>
  );
}
