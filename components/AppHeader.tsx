import { useState } from "react";
import Container from "./Container";
import Logo from "./Logo";
import Button from "./Button";

const NAV_LINKS = [
  { label: "Find Artists", href: "/artists" },
  { label: "For Artists", href: "/#for-artists" },
  { label: "How It Works", href: "/#how-it-works" },
];

export default function AppHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface)]/90 backdrop-blur-md border-b border-[var(--color-border)]">
      <Container className="flex h-16 items-center justify-between">
        <Logo size="md" />

        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Button href="/signup?role=artist" variant="ghost" size="md">Sign In</Button>
          <Button href="/signup?role=artist" variant="primary" size="md">Join ArtiSync</Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text)]
            hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-md)] px-3 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 px-1">
              <Button href="/signup?role=artist" variant="outline" size="md" fullWidth>Sign In</Button>
              <Button href="/signup?role=artist" variant="primary" size="md" fullWidth>Join ArtiSync</Button>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
