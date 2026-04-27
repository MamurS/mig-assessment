import type { Question } from '@/types';

interface Props {
  question: Question;
  response: string[] | string | undefined;
  onChange: (val: string[] | string) => void;
  pageLabel: string;
  totalCount: number;
  currentIndex: number;
  openAnswerPlaceholder: string;
  partLabel: string;
  readOnly?: boolean;
}

export default function QuestionRenderer({
  question,
  response,
  onChange,
  pageLabel,
  totalCount,
  currentIndex,
  openAnswerPlaceholder,
  partLabel,
  readOnly = false,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between border-b border-ink-100 pb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-accent-500 font-medium">
            {partLabel}
          </div>
          <h2 className="font-display text-2xl text-ink-900 mt-1">
            {pageLabel} {currentIndex + 1} <span className="text-ink-400">/ {totalCount}</span>
          </h2>
        </div>
        <div className="text-right">
          <span className="chip bg-ink-100 text-ink-700">{question.points} pts</span>
        </div>
      </div>

      <div className="prose prose-sm max-w-none">
        <p className="text-ink-900 text-base leading-relaxed whitespace-pre-wrap">
          {question.text}
        </p>
      </div>

      {(question.type === 'mcq_single' || question.type === 'mcq_multi') && (
        <div className="space-y-2">
          {question.type === 'mcq_multi' && (
            <div className="text-xs text-ink-500 italic">
              ☑ Multiple selection — select two answers
            </div>
          )}
          {question.options.map((opt) => {
            const selected = Array.isArray(response) && response.includes(opt.letter);
            const id = `${question.id}-${opt.letter}`;
            return (
              <label
                key={opt.letter}
                htmlFor={id}
                className={`
                  flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all
                  ${selected
                    ? 'border-accent-500 bg-accent-50 ring-1 ring-accent-500/20'
                    : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50'}
                  ${readOnly ? 'cursor-default pointer-events-none' : ''}
                `}
              >
                <input
                  id={id}
                  type={question.type === 'mcq_multi' ? 'checkbox' : 'radio'}
                  name={question.id}
                  value={opt.letter}
                  checked={selected}
                  disabled={readOnly}
                  onChange={() => {
                    if (readOnly) return;
                    if (question.type === 'mcq_multi') {
                      const arr = Array.isArray(response) ? [...response] : [];
                      if (arr.includes(opt.letter)) {
                        onChange(arr.filter((x) => x !== opt.letter));
                      } else {
                        onChange([...arr, opt.letter]);
                      }
                    } else {
                      onChange([opt.letter]);
                    }
                  }}
                  className="mt-1 accent-accent-500"
                />
                <span className="flex-1">
                  <span className="font-semibold text-ink-900 mr-2">{opt.letter})</span>
                  <span className="text-ink-700">{opt.text}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {question.type === 'open' && (
        <div>
          <textarea
            className="input min-h-[280px] font-mono text-[13px] leading-relaxed"
            placeholder={openAnswerPlaceholder}
            value={typeof response === 'string' ? response : ''}
            onChange={(e) => !readOnly && onChange(e.target.value)}
            disabled={readOnly}
            spellCheck
          />
          <div className="text-xs text-ink-400 mt-1.5 text-right">
            {(typeof response === 'string' ? response.length : 0)} characters
          </div>
        </div>
      )}
    </div>
  );
}
