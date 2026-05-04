import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getTest, formatDuration } from '@/lib/test-content';
import QuestionRenderer from '@/components/QuestionRenderer';
import BrandHeader from '@/components/BrandHeader';
import AntiCheatGuard from '@/components/AntiCheatGuard';
import ConfirmModal from '@/components/ConfirmModal';
import type { Lang, Question, Version } from '@/types';

interface AttemptState {
  version: Version;
  lang: Lang;
  startedAt: string;
  endsAt: string;
  questionOrder: string[];
}

export default function TestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const stateRaw = attemptId ? sessionStorage.getItem(`attempt-${attemptId}`) : null;
  const attemptState: AttemptState | null = stateRaw ? JSON.parse(stateRaw) : null;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string[] | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const t = useMemo(
    () => (attemptState ? getTest(attemptState.version ?? 'reinsurance', attemptState.lang) : null),
    [attemptState]
  );

  const orderedQuestions: Question[] = useMemo(() => {
    if (!t || !attemptState) return [];
    const map = new Map<string, Question>();
    for (const q of t.questions) map.set(q.id, q);
    return attemptState.questionOrder.map((id) => map.get(id)!).filter(Boolean);
  }, [t, attemptState]);

  useEffect(() => {
    if (!attemptState) return;
    function tick() {
      const ends = new Date(attemptState!.endsAt).getTime();
      const now = Date.now();
      const left = Math.max(0, Math.floor((ends - now) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        // Time's up — auto-submit without confirmation
        doSubmit();
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAnswer = useCallback(
    async (questionId: string, response: string[] | string, type: string) => {
      if (!attemptId) return;
      const { error } = await supabase.from('answers').upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          question_type: type,
          response: response,
        },
        { onConflict: 'attempt_id,question_id' }
      );
      if (error) {
        console.error('autosave failed', error);
      }
    },
    [attemptId]
  );

  useEffect(() => {
    const cur = orderedQuestions[currentIdx];
    if (!cur) return;
    const resp = responses[cur.id];
    if (resp === undefined) return;
    const handle = setTimeout(() => {
      saveAnswer(cur.id, resp, cur.type);
    }, 600);
    return () => clearTimeout(handle);
  }, [responses, currentIdx, orderedQuestions, saveAnswer]);

  // Internal submit — does the actual work. Used by both the confirm-modal
  // path and the auto-submit-on-timeout path.
  async function doSubmit() {
    if (submitting) return;
    if (!attemptId) return;

    setSubmitting(true);
    setSubmitErr(null);

    try {
      // Final pass: persist any answers the autosave debounce hasn't flushed yet.
      // Run all the saves IN PARALLEL — previously this was a sequential for-await
      // loop that took ~150-300ms per question = 2-5 seconds for 16 questions.
      await Promise.all(
        orderedQuestions
          .filter((q) => responses[q.id] !== undefined)
          .map((q) => saveAnswer(q.id, responses[q.id], q.type))
      );

      // Submit the attempt. The server now responds quickly (just MCQ scoring
      // + DB write), and AI grading runs in the background via waitUntil().
      const res = await fetch('/api/submit-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitErr(data.error || (t?.ui.error ?? 'Error'));
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem(`attempt-${attemptId}`);
      navigate(`/submitted/${attemptId}`);
    } catch (e) {
      console.error(e);
      setSubmitErr(t?.ui.error ?? 'Error');
      setSubmitting(false);
    }
  }

  // User-initiated submit — opens the confirmation modal.
  function handleSubmitClick() {
    if (submitting) return;
    setShowConfirm(true);
  }

  if (!attemptId || !attemptState) {
    return <Navigate to="/" replace />;
  }
  if (!t) return null;

  const cur = orderedQuestions[currentIdx];
  if (!cur) return null;

  const partLabel = t.partLabels[cur.part] ?? '';
  const isLast = currentIdx === orderedQuestions.length - 1;
  const isFirst = currentIdx === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <AntiCheatGuard attemptId={attemptId} paused={submitting} />
      <BrandHeader small />

      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-ink-100">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-medium">
              {t.ui.time_remaining}
            </div>
            <div
              className={`font-mono text-lg font-medium tabular-nums ${
                secondsLeft < 300 ? 'text-red-600' : 'text-ink-900'
              }`}
            >
              {formatDuration(secondsLeft)}
            </div>
          </div>
          <div className="flex-1 max-w-md mx-6">
            <div className="h-1.5 bg-ink-100 rounded overflow-hidden">
              <div
                className="h-full bg-accent-500 transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / orderedQuestions.length) * 100}%` }}
              />
            </div>
            <div className="text-[11px] text-ink-500 mt-1 text-center">
              {currentIdx + 1} / {orderedQuestions.length}
            </div>
          </div>
          <button
            onClick={handleSubmitClick}
            className="btn-outline text-xs"
            disabled={submitting}
          >
            {t.ui.submit}
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <div className="card p-8 md:p-10">
          <QuestionRenderer
            question={cur}
            response={responses[cur.id]}
            onChange={(val) => setResponses((r) => ({ ...r, [cur.id]: val }))}
            pageLabel={t.ui.page_label}
            totalCount={orderedQuestions.length}
            currentIndex={currentIdx}
            openAnswerPlaceholder={t.ui.open_answer_placeholder}
            partLabel={partLabel}
          />

          {submitErr && (
            <div className="mt-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitErr}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-ink-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="btn-ghost"
              disabled={isFirst}
            >
              ← {t.ui.prev}
            </button>

            {isLast ? (
              <button
                onClick={handleSubmitClick}
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? t.ui.submitting : `${t.ui.submit} →`}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(orderedQuestions.length - 1, i + 1))}
                className="btn-primary"
              >
                {t.ui.next} →
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
          {orderedQuestions.map((q, idx) => {
            const answered = responses[q.id] !== undefined &&
              (Array.isArray(responses[q.id])
                ? (responses[q.id] as string[]).length > 0
                : (responses[q.id] as string).trim().length > 0);
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`
                  w-9 h-9 rounded text-xs font-medium transition-all
                  ${idx === currentIdx
                    ? 'bg-accent-500 text-white ring-2 ring-accent-500/30 ring-offset-2 ring-offset-sand-50'
                    : answered
                    ? 'bg-accent-50 text-accent-600 border border-accent-500/30'
                    : 'bg-white text-ink-500 border border-ink-200 hover:border-ink-300'}
                `}
                title={`${t.ui.page_label} ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </main>

      <ConfirmModal
        open={showConfirm}
        title={t.ui.submit}
        description={t.ui.submit_confirm}
        confirmLabel={t.ui.submit}
        cancelLabel={t.ui.prev}
        onConfirm={() => {
          setShowConfirm(false);
          doSubmit();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
