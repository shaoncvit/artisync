// Server-only — must never be imported from a client component or page.
// It reads RESEND_API_KEY, which is intentionally not NEXT_PUBLIC_-prefixed
// so Next.js never bundles it into client-side JS. Only pages/api/*.ts
// files should import this.

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ skipped: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return { skipped: true };
  }

  const from = process.env.EMAIL_FROM || "ArtiSync <notifications@artisync.in>";
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${text}`);
  }

  return { skipped: false };
}
