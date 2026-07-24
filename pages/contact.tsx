import Head from "next/head";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import Container from "@/components/Container";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

const SUPPORT_EMAIL = "contact@artisync.in";
const SUPPORT_PHONE_DISPLAY = "+91 89673 63493";
const SUPPORT_PHONE_TEL = "+918967363493";

const title = "Contact us";
const description = `Get in touch with the ${SITE_NAME} team.`;

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--color-page)] flex flex-col">
      <Head>
        <title>{title} | {SITE_NAME}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/contact`} />
      </Head>
      <AppHeader />
      <Container className="py-14 sm:py-20 flex-1 max-w-2xl">
        <h1 className="text-3xl">{title}</h1>
        <p className="mt-3 text-[var(--color-text-secondary)]">
          For account issues, reporting a problem, or general questions, reach us directly:
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Email</p>
              <p className="font-medium text-[var(--color-text)]">{SUPPORT_EMAIL}</p>
            </div>
          </a>

          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Phone</p>
              <p className="font-medium text-[var(--color-text)]">{SUPPORT_PHONE_DISPLAY}</p>
            </div>
          </a>
        </div>

        <div className="mt-8 space-y-3 text-[var(--color-text-secondary)] leading-relaxed">
          <p>
            If you&apos;ve run into an issue with a specific conversation, using the Report option inside
            that conversation reaches the right place fastest.
          </p>
          <p>
            {SITE_NAME} doesn&apos;t manage bookings, payments, or disputes between clients and
            artists directly — those are handled between the two parties.
          </p>
        </div>
      </Container>
      <Footer />
    </div>
  );
}
