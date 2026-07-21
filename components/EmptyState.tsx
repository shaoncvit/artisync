import { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center px-6 py-16 ${className}`}>
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
