import { HTMLAttributes } from "react";

type Variant = "neutral" | "accent" | "secondary" | "success" | "warning" | "error";

const variants: Record<Variant, string> = {
  neutral: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent-hover)]",
  secondary: "bg-[var(--color-secondary-soft)] text-[var(--color-secondary)]",
  success: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  error: "bg-[var(--color-error-soft)] text-[var(--color-error)]",
};

export default function Badge({
  variant = "neutral",
  className = "",
  children,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-full)] px-3 py-1 text-xs font-semibold uppercase tracking-wide ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
