import Link from "next/link";

type LogoProps = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  variant?: "dark" | "light";
  className?: string;
};

const ICON_SIZE = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" };
const TEXT_SIZE = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

export default function Logo({ href = "/", size = "md", iconOnly = false, variant = "dark", className = "" }: LogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo_2.png" alt="ArtiSync" className={`${ICON_SIZE[size]} w-auto object-contain flex-shrink-0`} />
      {!iconOnly && (
        <span className={`font-heading font-extrabold tracking-tight ${TEXT_SIZE[size]} ${variant === "light" ? "text-white" : "text-[var(--color-text)]"}`}>
          Arti<span className="text-[var(--color-accent)]">Sync</span>
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] rounded-md" aria-label="ArtiSync home">
      {content}
    </Link>
  );
}
