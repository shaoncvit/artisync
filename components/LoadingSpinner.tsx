type Size = "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-[3px]",
};

export default function LoadingSpinner({ size = "md", className = "", label = "Loading" }: { size?: Size; className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={`inline-block ${className}`}>
      <span
        className={`block rounded-full border-[var(--color-primary-soft)] border-t-[var(--color-accent)] animate-spin motion-reduce:animate-pulse motion-reduce:duration-1000 ${sizes[size]}`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
