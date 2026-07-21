import { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, forwardRef } from "react";
import Link, { LinkProps } from "next/link";

const base =
  "block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] " +
  "shadow-[var(--shadow-sm)] transition-all duration-150";

const interactive =
  "cursor-pointer hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 hover:border-[var(--color-accent)] " +
  "active:translate-y-0 active:shadow-[var(--shadow-sm)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]";

type CardDivProps = HTMLAttributes<HTMLDivElement> & { interactive?: false; href?: undefined };
type CardButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { interactive: true; href?: undefined };
type CardLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & Pick<LinkProps, "href"> & { interactive?: true };

export type CardProps = CardDivProps | CardButtonProps | CardLinkProps;

const Card = forwardRef<HTMLDivElement | HTMLButtonElement | HTMLAnchorElement, CardProps>(function Card(
  { className = "", ...rest },
  ref
) {
  if ("href" in rest && rest.href !== undefined) {
    const { href, children, ...linkRest } = rest as CardLinkProps;
    return (
      <Link href={href} ref={ref as React.Ref<HTMLAnchorElement>} className={`${base} ${interactive} ${className}`} {...linkRest}>
        {children}
      </Link>
    );
  }

  if ("interactive" in rest && rest.interactive) {
    const { interactive, children, ...buttonRest } = rest as CardButtonProps;
    void interactive;
    return (
      <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className={`${base} ${interactive} text-left w-full ${className}`} {...buttonRest}>
        {children}
      </button>
    );
  }

  const { children, ...divRest } = rest as CardDivProps;
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={`${base} ${className}`} {...divRest}>
      {children}
    </div>
  );
});

export default Card;
