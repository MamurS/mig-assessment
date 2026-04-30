// src/components/AntiCheatGuard.tsx
//
// Maximum-deterrent anti-cheat guard.
// On tab/window/app switch:
//   1. Audio alarm (plays even when tab is not focused)
//   2. Tab title flashes "⚠️ RETURN TO TEST"
//   3. Browser notification (if user has granted permission)
//   4. Red overlay with 5-second countdown (visible when they come back)
//   5. If they don't return in time → violation reported, sessionStorage wiped, redirected

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  attemptId: string;
  graceSeconds?: number;
  paused?: boolean;
}

export default function AntiCheatGuard({ attemptId, graceSeconds = 15, paused = false }: Props) {
  const navigate = useNavigate();
  const [warning, setWarning] = useState<{ reason: string; remaining: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const titleFlashRef = useRef<number | null>(null);
  const warnedRef = useRef(false);
  const triggeredRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const originalTitleRef = useRef<string>('');
  const notificationRef = useRef<Notification | null>(null);

  useEffect(() => {
    originalTitleRef.current = document.title;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      document.title = originalTitleRef.current;
      stopTitleFlash();
      stopAlarm();
      closeNotification();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startAlarm() {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);

      const startT = ctx.currentTime;
      for (let i = 0; i < 60; i++) {
        const t = startT + i * 0.4;
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.setValueAtTime(0.0, t + 0.2);
        osc.frequency.setValueAtTime(i % 2 === 0 ? 880 : 660, t);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('audio alarm failed', e);
    }
  }

  function stopAlarm() {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    } catch {}
  }

  function startTitleFlash() {
    stopTitleFlash();
    let flip = false;
    const original = originalTitleRef.current || 'Mosaic Trainee Assessment';
    titleFlashRef.current = window.setInterval(() => {
      flip = !flip;
      document.title = flip ? '⚠️ RETURN TO TEST ⚠️' : original;
    }, 700);
  }

  function stopTitleFlash() {
    if (titleFlashRef.current !== null) {
      window.clearInterval(titleFlashRef.current);
      titleFlashRef.current = null;
    }
    document.title = originalTitleRef.current || 'Mosaic Trainee Assessment';
  }

  function showNotification() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      closeNotification();
      notificationRef.current = new Notification('⚠️ Return to the test', {
        body: 'Switching tabs or apps during the test is not allowed. Return immediately or your session will be reset.',
        requireInteraction: true,
        silent: false,
      });
      notificationRef.current.onclick = () => {
        window.focus();
        if (notificationRef.current) {
          notificationRef.current.close();
        }
      };
    } catch (e) {
      console.warn('notification failed', e);
    }
  }

  function closeNotification() {
    if (notificationRef.current) {
      try { notificationRef.current.close(); } catch {}
      notificationRef.current = null;
    }
  }

  function clearWarningTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function reportAndReset(reason: 'visibility' | 'blur' | 'unload' | 'manual') {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    stopAlarm();
    stopTitleFlash();
    closeNotification();
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
    startAlarm();
    startTitleFlash();
    showNotification();

    try { window.focus(); } catch {}

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
    stopAlarm();
    stopTitleFlash();
    closeNotification();
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
      stopTitleFlash();
      stopAlarm();
      closeNotification();
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
