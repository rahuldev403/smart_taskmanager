import type { ReactNode } from "react";
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  isClosing?: boolean;
};

type ToastViewportProps = {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
};

const variantClasses: Record<ToastVariant, string> = {
  success: "border-green-500/40 bg-green-500/10",
  error: "border-destructive/40 bg-destructive/10",
  info: "border-border bg-card",
};

const variantIcon: Record<ToastVariant, ReactNode> = {
  success: <FiCheckCircle className="mt-0.5 shrink-0" />,
  error: <FiAlertCircle className="mt-0.5 shrink-0" />,
  info: <FiInfo className="mt-0.5 shrink-0" />,
};

export function ToastViewport({ toasts, onRemove }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`overflow-hidden rounded-md border p-3 text-sm shadow-lg ${variantClasses[toast.variant ?? "info"]} ${
            toast.isClosing ? "toast-exit" : "toast-enter"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              {variantIcon[toast.variant ?? "info"]}
              <div>
                <p className="font-medium">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toast.description}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              aria-label="Close notification"
              title="Close notification"
              onClick={() => onRemove(toast.id)}
            >
              <FiX />
            </button>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded bg-border/50">
            <div className="toast-progress h-full bg-primary" />
          </div>
        </div>
      ))}
    </div>
  );
}
