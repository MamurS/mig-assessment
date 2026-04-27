import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import BrandHeader from '@/components/BrandHeader';
import { supabase } from '@/lib/supabase';
import { getTest, formatDate } from '@/lib/test-content';
import type { Attempt, AnswerRecord, Question } from '@/types';

export default function AdminAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let mounted = true;
    async function load() {
      const [att, ans] = await Promise.all([
        supabase.from('attempts').select('*').eq('id', attemptId).single(),
        supabase.from('answers').select('*').eq('attempt_id', attemptId),
      ]);
      if (!mounted) return;
      if (att.data) setAttempt(att.data as Attempt);
      if (ans.data) setAnswers(ans.data as AnswerRecord[]);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [attemptId]);

  const test = attempt ? getTest(attempt.lang) : null;

  const questionMap = useMemo(() => {
    if (!test) return new Map<string, Question>();
    const m = new Map<string, Question>();
    for (const q of test.questions) m.set(q.id, q);
    return m;
  }, [test]);

  const orderedAnswers = useMemo(() => {
    if (!attempt || !test) return [];
    return attempt.question_order
      .map((id) => ({
        question: questionMap.get(id)!,
        answer: answers.find((a) => a.question_id === id) ?? null,
      }))
      .filter((x) => !!x.question);
  }, [attempt, test, answers, questionMap]);

  const totals = useMemo(() => {
    let auto = 0;
    let final = 0;
    let max = 0;
    for (const { question, answer } of orderedAnswers) {
      max += question.points;
      const a = answer?.auto_points ?? 0;
      const m = answer?.manual_points ?? answer?.auto_points ?? 0;
      auto += a;
      final += m;
    }
    return { auto, final, max };
  }, [orderedAnswers]);

  async function updateAnswer(answerId: string, patch: Partial<AnswerRecord>) {
    setSaving(true);
    const { error } = await supabase.from('answers').update(patch).eq('id', answerId);
    if (error) {
      console.error(error);
      alert('Save failed: ' + error.message);
      setSaving(false);
      return;
    }
    setAnswers((prev) =>
      prev.map((a) => (a.id === answerId ? { ...a, ...patch } : a))
    );
    setSavedAt(new Date());
    setSaving(false);
  }

  async function finalizeGrading() {
    if (!attempt) return;
    const { error } = await supabase
      .from('attempts')
      .update({
        manual_score: totals.final,
        status: 'graded',
      })
      .eq('id', attempt.id);
    if (error) {
      alert('Save failed: ' + error.message);
      return;
    }
    setAttempt({ ...attempt, manual_score: totals.final, status: 'graded' });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <BrandHeader small />
        <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!attempt || !test) {
    return (
      <div className="min-h-screen flex flex-col">
        <BrandHeader small />
        <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">Not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader small />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        {/* Header / candidate info */}
        <div className="no-print mb-6 flex items-center justify-between">
          <Link to="/admin" className="text-sm text-ink-500 hover:text-accent-500">
            ← Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            {savedAt && (
              <span className="text-xs text-ink-400">
                Saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            <button onClick={() => window.print()} className="btn-outline text-sm">
              ⎙ Print / Save PDF
            </button>
            {attempt.status !== 'graded' && (
              <button onClick={finalizeGrading} className="btn-primary text-sm">
                Finalize grading
              </button>
            )}
          </div>
        </div>

        {/* Report header (also visible in print) */}
        <div className="card p-8 mb-6 print-keep">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-accent-500 font-medium">
                Assessment Report
              </div>
              <h1 className="font-display text-3xl text-ink-900 mt-1">{attempt.candidate_name}</h1>
              <p className="text-ink-500 text-sm">{attempt.candidate_email}</p>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">Final score</div>
              <div className="font-display text-4xl font-semibold text-ink-900 mt-1">
                {totals.final.toFixed(1)}
                <span className="text-ink-300 text-2xl">/{totals.max}</span>
              </div>
              <div className="text-xs text-ink-500 mt-1">
                Auto: {totals.auto.toFixed(1)} · Adjusted: {(totals.final - totals.auto).toFixed(1)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-ink-100 text-sm">
            <Field label="Language" value={attempt.lang.toUpperCase()} />
            <Field label="Started" value={formatDate(attempt.started_at)} />
            <Field label="Submitted" value={formatDate(attempt.submitted_at)} />
            <Field label="Status" value={attempt.status.replace('_', ' ')} />
          </div>
        </div>

        {/* Per-question review */}
        <div className="space-y-4">
          {orderedAnswers.map(({ question, answer }, idx) => (
            <QuestionReview
              key={question.id}
              question={question}
              answer={answer}
              displayIdx={idx}
              onUpdate={(patch) => answer && updateAnswer(answer.id, patch)}
              saving={saving}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400 font-medium">{label}</div>
      <div className="text-ink-800 mt-0.5">{value}</div>
    </div>
  );
}

interface ReviewProps {
  question: Question;
  answer: AnswerRecord | null;
  displayIdx: number;
  onUpdate: (patch: Partial<AnswerRecord>) => void;
  saving: boolean;
}

function QuestionReview({ question, answer, displayIdx, onUpdate, saving }: ReviewProps) {
  const points = answer?.manual_points ?? answer?.auto_points ?? 0;
  const isOpen = question.type === 'open';
  const correct = question.type !== 'open' ? question.correct.join(', ') : '';
  const response = answer?.response;
  const responseText = Array.isArray(response) ? response.join(', ') : (response ?? '');

  const [localPts, setLocalPts] = useState(points);
  const [localComment, setLocalComment] = useState(answer?.admin_comment ?? '');

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-ink-500">Q{displayIdx + 1}</span>
          <span className="text-[11px] uppercase tracking-wider text-accent-500 font-medium">
            {question.part}
          </span>
          <span className="chip bg-ink-100 text-ink-600">{question.type.replace('_', ' ')}</span>
        </div>
        <div className="text-right">
          <span className="font-mono font-medium text-ink-900">
            {points.toFixed(1)}
            <span className="text-ink-400"> / {question.points}</span>
          </span>
        </div>
      </div>

      <div className="text-sm text-ink-800 leading-relaxed mb-4">{question.text}</div>

      {/* Candidate's response */}
      <div className="bg-sand-50 border border-sand-100 rounded-md p-4 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-medium mb-1.5">
          Candidate response
        </div>
        {isOpen ? (
          <div className="font-mono text-[13px] text-ink-800 whitespace-pre-wrap leading-relaxed">
            {responseText || <span className="italic text-ink-400">(no answer)</span>}
          </div>
        ) : (
          <div className="text-sm text-ink-800">
            Selected: <span className="font-mono font-medium">{responseText || '—'}</span>
            <span className="ml-3 text-ink-500 text-xs">
              Correct: <span className="font-mono">{correct}</span>
            </span>
          </div>
        )}
      </div>

      {/* AI feedback (open only) */}
      {isOpen && answer?.ai_feedback && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-md p-4 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-blue-600 font-medium mb-1.5">
            AI feedback (auto: {answer.auto_points?.toFixed(1) ?? '—'} / {question.points})
          </div>
          <div className="text-[13px] text-ink-800 whitespace-pre-wrap leading-relaxed">
            {answer.ai_feedback}
          </div>
        </div>
      )}

      {/* Admin controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-ink-100 no-print">
        <div>
          <label className="label">Adjusted points</label>
          <input
            type="number"
            min={0}
            max={question.points}
            step={0.5}
            className="input font-mono"
            value={localPts}
            onChange={(e) => setLocalPts(parseFloat(e.target.value || '0'))}
            onBlur={() => onUpdate({ manual_points: localPts })}
            disabled={saving}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Admin comment</label>
          <textarea
            className="input min-h-[60px] text-sm"
            placeholder="Optional comment for the report…"
            value={localComment}
            onChange={(e) => setLocalComment(e.target.value)}
            onBlur={() => onUpdate({ admin_comment: localComment })}
            disabled={saving}
          />
        </div>
      </div>

      {/* Show comment in print */}
      {answer?.admin_comment && (
        <div className="hidden print:block mt-3 pt-3 border-t border-ink-100 text-sm">
          <span className="font-medium text-ink-700">Comment: </span>
          <span className="text-ink-600">{answer.admin_comment}</span>
        </div>
      )}
    </div>
  );
}
