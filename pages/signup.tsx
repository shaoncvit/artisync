import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { resolveEntryPath, type EntryRole } from "@/lib/roleRouting";
import Logo from "@/components/Logo";
import Container from "@/components/Container";
import Button from "@/components/Button";
import Input from "@/components/Input";
import PasswordInput from "@/components/PasswordInput";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";

const MIN_PASSWORD_LENGTH = 6;

const ROLE_COPY: Record<EntryRole, { heading: string; supporting: string }> = {
  artist: {
    heading: "Create your artist account",
    supporting: "Build your profile, showcase your work, and connect with potential clients.",
  },
  client: {
    heading: "Create your client account",
    supporting: "Find and connect with artists who match your event or project.",
  },
};

export default function SignupPage() {
  const router = useRouter();
  const role: EntryRole = useMemo(() => (router.query.role === "client" ? "client" : "artist"), [router.query.role]);
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpStatus, setOtpStatus] = useState<"idle" | "sending" | "sent" | "cooldown">("idle");
  const [otpError, setOtpError] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // If the visitor is already signed in — e.g. they hit Back or reloaded
  // after logging in — send them straight to where they belong instead of
  // showing the login form again, which looks like they got signed out.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) { setCheckingSession(false); return; }
      // This tab is the one that just opened a verification link — stay put
      // and show a confirmation instead of whisking it off to the dashboard,
      // since the original signup tab (which has the password fields) still
      // needs to finish the flow.
      if (router.query.verified === "1") { setCheckingSession(false); return; }
      const destination = await resolveEntryPath(session.user.id, role);
      const returnTo = typeof router.query.returnTo === "string" ? router.query.returnTo : undefined;
      if (returnTo && destination === "/artists") {
        router.replace(returnTo);
      } else if (returnTo && (destination === "/client-onboarding" || destination === "/client-preferences")) {
        router.replace({ pathname: destination, query: { returnTo } });
      } else {
        router.replace(destination);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setError(null);
    setFieldErrors({});
    setEmailVerified(false);
    setOtpSent(false);
    setOtpStatus("idle");
    setOtpError(null);
  }, [mode]);

  // Once a verification link has been sent, watch for the session it creates
  // when clicked — either because it navigated this same tab, or because
  // Supabase broadcasts the new session to other tabs open on this origin
  // (e.g. the link opened in a new tab in the same browser).
  useEffect(() => {
    if (mode !== "signup" || !otpSent || emailVerified) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email && session.user.email.toLowerCase() === email.toLowerCase()) {
        setEmailVerified(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [mode, otpSent, emailVerified, email]);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (emailVerified || otpSent) {
      setEmailVerified(false);
      setOtpSent(false);
      setOtpStatus("idle");
      setOtpError(null);
    }
  }

  async function handleSendLink() {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setOtpError("Enter a valid email address first.");
      return;
    }
    setOtpStatus("sending");
    setOtpError(null);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/signup?verified=1` },
      });
      if (otpErr) throw otpErr;
      setOtpSent(true);
      setOtpStatus("cooldown");
      setTimeout(() => setOtpStatus((s) => (s === "cooldown" ? "sent" : s)), 30000);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : "Could not send verification link.");
      setOtpStatus("idle");
    }
  }

  if (checkingSession) {
    return <div className="min-h-screen" />;
  }

  if (router.query.verified === "1") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl">Email verified</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Go back to the browser tab where you started creating your account — it should now let you set your password and finish signing up.
          </p>
        </div>
      </div>
    );
  }

  function validate(): boolean {
    const next: typeof fieldErrors = {};
    if (mode === "signup") {
      if (password.length < MIN_PASSWORD_LENGTH) {
        next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      }
      if (confirmPassword !== password) {
        next.confirmPassword = "Passwords do not match.";
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    if (mode === "signup" && !emailVerified) {
      setError("Please verify your email address first.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } =
        mode === "signup"
          ? await supabase.auth.updateUser({ password })
          : await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const userId = data.user?.id;
      const destination = userId ? await resolveEntryPath(userId, role) : role === "client" ? "/client-onboarding" : "/create-profile";
      const returnTo = typeof router.query.returnTo === "string" ? router.query.returnTo : undefined;
      if (returnTo && destination === "/artists") {
        router.replace(returnTo);
      } else if (returnTo && (destination === "/client-onboarding" || destination === "/client-preferences")) {
        router.replace({ pathname: destination, query: { returnTo } });
      } else {
        router.replace(destination);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      // /auth/callback resolves the role-aware destination once the user lands
      // back on this domain, since an OAuth redirect can't run our own JS mid-flight.
      const returnTo = typeof router.query.returnTo === "string" ? `&returnTo=${encodeURIComponent(router.query.returnTo)}` : "";
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?role=${role}${returnTo}` },
      });
      if (authError) throw authError;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotStatus("sending");
    setForgotError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setForgotStatus("sent");
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Could not send reset email");
      setForgotStatus("error");
    }
  }

  const heading = mode === "signin" ? "Welcome back" : ROLE_COPY[role].heading;
  const supporting = mode === "signin" ? "Sign in to continue to your account." : ROLE_COPY[role].supporting;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Left: brand panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-1/2 relative flex-col justify-between bg-[var(--color-primary)] text-white p-12 xl:p-16 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-16 h-80 w-80 rounded-full bg-[var(--color-accent)]/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[var(--color-secondary)]/20 blur-3xl" />

        <Logo href={null} variant="light" size="lg" />

        <div className="relative">
          <h1 className="text-white text-4xl xl:text-5xl">Where artists and opportunities meet.</h1>
          <p className="mt-4 max-w-md text-[var(--color-text-on-dark-soft)]">
            Discover talent. Create together.
          </p>
        </div>

        <p className="relative text-xs text-[var(--color-text-on-dark-soft)]">
          © {new Date().getFullYear()} ArtiSync. All rights reserved.
        </p>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col bg-[var(--color-page)]">
        <header className="lg:hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <Container className="flex h-16 items-center">
            <Logo size="md" />
          </Container>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
          <div className="w-full max-w-[460px]">
            <div className="mb-6 flex items-center justify-center gap-2">
              <Badge variant="neutral" className="normal-case tracking-normal">
                Role: {role === "artist" ? "Artist" : "Client"}
              </Badge>
              <Link
                href={{ pathname: "/signup", query: { role: role === "artist" ? "client" : "artist" } }}
                className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] underline underline-offset-2
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
              >
                Change role
              </Link>
            </div>

            <div className="mb-7 grid grid-cols-2 gap-1 rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-[calc(var(--radius-md)-4px)] px-4 py-2.5 text-sm font-semibold transition-all min-h-[40px]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]
                  ${mode === "signin" ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-[calc(var(--radius-md)-4px)] px-4 py-2.5 text-sm font-semibold transition-all min-h-[40px]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]
                  ${mode === "signup" ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"}`}
              >
                Create Account
              </button>
            </div>

            <h2 className="text-2xl">{heading}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{supporting}</p>

            <form onSubmit={handleEmailAuth} className="mt-6 space-y-4" noValidate>
              {mode === "signup" ? (
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Email address
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={handleEmailChange}
                      disabled={emailVerified || otpSent}
                      className="w-full min-h-[44px] rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)]
                        placeholder-[var(--color-text-secondary)] transition-colors border-[var(--color-border)] focus:border-[var(--color-accent)]
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]
                        disabled:opacity-70 disabled:bg-[var(--color-primary-soft)]"
                    />
                    {emailVerified ? (
                      <span className="flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] bg-[var(--color-success-soft)] px-3 text-sm font-semibold text-[var(--color-success)]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Verified
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        disabled={otpStatus === "sending" || otpStatus === "cooldown" || !email}
                        onClick={handleSendLink}
                        className="whitespace-nowrap"
                      >
                        {otpStatus === "sending" ? "Sending…" : otpStatus === "cooldown" ? "Sent" : otpSent ? "Resend link" : "Verify"}
                      </Button>
                    )}
                  </div>

                  {otpSent && !emailVerified && (
                    <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-primary-soft)] p-3">
                      <svg className="w-4 h-4 flex-shrink-0 animate-spin text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        We sent a verification link to <strong>{email}</strong>. Open it in this same browser to continue — this page updates automatically once it&rsquo;s clicked.
                      </p>
                    </div>
                  )}
                  {otpError && <p className="mt-1.5 text-xs text-[var(--color-error)]">{otpError}</p>}
                </div>
              ) : (
                <Input
                  label="Email address"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}

              <PasswordInput
                label="Password"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                hint={mode === "signup" ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
                disabled={mode === "signup" && !emailVerified}
              />

              {mode === "signup" && (
                <PasswordInput
                  label="Confirm password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={fieldErrors.confirmPassword}
                  disabled={!emailVerified}
                />
              )}

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotStatus("idle"); setForgotError(null); setForgotOpen(true); }}
                    className="text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-[var(--radius-md)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 border-t border-[var(--color-border)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">OR</span>
              <div className="flex-1 border-t border-[var(--color-border)]" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              disabled={loading}
              onClick={handleGoogle}
              className="gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 flex-shrink-0">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.046,6.053,28.715,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,4C15.316,4,7.846,9.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c4.686,0,8.961-1.802,12.191-4.864l-5.624-4.73C28.542,36.262,26.392,37,24,37c-5.203,0-9.621-3.343-11.283-8.011 l-6.558,5.046C7.67,39.556,15.138,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-1.258,0.217-2.466,0.612-3.592l6.558-5.046C5.239,13.854,4,18.779,4,24c0,11.045,8.955,20,20,20s20-8.955,20-20 C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
              >
                {mode === "signup" ? "Already have an account? " : "New to ArtiSync? "}
                <span className="text-[var(--color-accent)] font-semibold">{mode === "signup" ? "Sign in" : "Create one"}</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] rounded-sm"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset your password">
        {forgotStatus === "sent" ? (
          <p className="text-sm text-[var(--color-text)]">
            If an account exists for <strong>{forgotEmail}</strong>, we&rsquo;ve sent a password reset link to it.
          </p>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Enter your email address and we&rsquo;ll send you a link to reset your password.
            </p>
            <Input
              label="Email address"
              type="email"
              required
              autoComplete="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            {forgotError && (
              <p className="rounded-[var(--radius-md)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]" role="alert">
                {forgotError}
              </p>
            )}
            <Button type="submit" variant="primary" size="md" fullWidth disabled={forgotStatus === "sending"}>
              {forgotStatus === "sending" ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
