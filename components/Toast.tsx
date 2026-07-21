import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

type ToastVariant = "info" | "success" | "warning" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClasses: Record<ToastVariant, string> = {
  info: "bg-[var(--color-primary)] text-white",
  success: "bg-[var(--color-success)] text-white",
  warning: "bg-[var(--color-warning)] text-white",
  error: "bg-[var(--color-error)] text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium shadow-[var(--shadow-lg)] ${variantClasses[t.variant]}`}
            style={{ animation: "toast-in 0.2s ease-out" }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
