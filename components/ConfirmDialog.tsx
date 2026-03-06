"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div className="card max-w-md">
        <h2 id="confirm-dialog-title" className="text-section-title font-semibold text-text-primary">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-body text-text-secondary">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDanger ? "btn-danger" : "btn-primary"}
            onClick={() => onConfirm()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
