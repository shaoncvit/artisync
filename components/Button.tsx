import { AnchorHTMLAttributes, ButtonHTMLAttributes, forwardRef } from "react";
import Link, { LinkProps } from "next/link";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-md)] " +
  "transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-sm)]",
  secondary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-sm)]",
  outline: "bg-transparent text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-primary-soft)]",
  ghost: "bg-transparent text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-4 min-h-[38px]",
  md: "text-sm px-5 min-h-[44px]",
  lg: "text-base px-7 min-h-[52px]",
};

function classesFor(variant: Variant, size: Size, fullWidth?: boolean, className?: string) {
  return `${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className ?? ""}`;
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Pick<LinkProps, "href"> & {
    href: LinkProps["href"];
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, className, ...rest },
  ref
) {
  const classes = classesFor(variant, size, fullWidth, className);

  if ("href" in rest && rest.href !== undefined) {
    const { href, children, ...anchorRest } = rest as ButtonAsLink;
    return (
      <Link href={href} ref={ref as React.Ref<HTMLAnchorElement>} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const { children, ...buttonRest } = rest as ButtonAsButton;
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} className={classes} {...buttonRest}>
      {children}
    </button>
  );
});

export default Button;
