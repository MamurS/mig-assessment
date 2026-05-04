import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Visual treatment of the confirm button. Default 'primary'. Use 'danger'
   *  for destructive actions (red), or 'primary' for neutral confirmations. */
  variant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered confirmation dialog with backdrop. Replaces window.confirm() with
 * a native-looking webapp modal that matches the rest of the assessment UI.
 *
 * Accessibility:
 *  - ESC closes (cancel)
 *  - Click on backdrop closes (cancel)
 *  - Focus is moved to the cancel button on open (safer default)
 *  - Body scroll is locked while open
 *
 * Usage:
 *   <ConfirmModal
 *     open={showConfirm}
 *     title="Submit your test?"
 *     description="You cannot change answers after this."
 *     confirmLabel="Submit"
 *     cancelLabel="Cancel"
 *     onConfirm={() => { setShowConfirm(false); doSubmit(); }}
 *     onCancel={() => setShowConfirm(false)}
 *   />
 */
export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'primary',
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scroll, attach ESC handler, focus the cancel button on open.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);

    // Defer focus to next tick so the element is in the DOM
    const focusTimer = window.setTimeout(() => {
      cancelRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const confirmBtnClass = variant === 'danger'
    ? 'btn bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-ink-300 disabled:cursor-not-allowed'
    : 'btn-primary';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onCancel}
      />

      {/* Dialog body */}
      <div className="card relative max-w-md w-full p-7 shadow-xl animate-in zoom-in-95 fade-in duration-150">
        <h2
          id="confirm-modal-title"
          className="font-display text-xl text-ink-900 mb-2"
        >
          {title}
        </h2>
        {description && (
          <p className="text-ink-600 leading-relaxed text-sm">{description}</p>
        )}

        <div className="mt-6 flex gap-2 justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="btn-outline"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmBtnClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
