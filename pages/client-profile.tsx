import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getMyClientProfile, updateClientProfile, uploadClientProfilePicture, mapClientRow } from "@/lib/clients";
import { stripOAuthHashIfPresent } from "@/lib/stripOAuthHash";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoIndexMeta from "@/components/NoIndexMeta";
import { useToast } from "@/components/Toast";
import { INDIA_STATES } from "@/lib/sharedConfig";

const BIO_MAX_LENGTH = 300;

export default function ClientProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [form, setForm] = useState({ fullName: "", phone: "", state: "", city: "", organizationName: "", bio: "" });

  useEffect(() => {
    let cancelled = false;

    async function handleUser(u: { id: string } | null | undefined) {
      if (cancelled) return;
      if (!u) {
        router.replace({ pathname: "/signup", query: { role: "client" } });
        return;
      }
      stripOAuthHashIfPresent();
      setUserId(u.id);
      const { data } = await getMyClientProfile(u.id);
      if (cancelled) return;
      if (!data) {
        router.replace({ pathname: "/client-onboarding" });
        return;
      }
      const profile = mapClientRow(data);
      setEmail(profile.email);
      setPhotoUrl(profile.profilePictureUrl);
      setForm({
        fullName: profile.fullName,
        phone: profile.phone,
        state: profile.state,
        city: profile.city,
        organizationName: profile.organizationName,
        bio: profile.bio,
      });
      setChecking(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => handleUser(session?.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      handleUser(session?.user);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [router]);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "state") setForm((f) => ({ ...f, state: value, city: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) { setError("Please enter your name"); return; }
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile) {
        finalPhotoUrl = await uploadClientProfilePicture(userId, photoFile);
      }
      const { error: dbError } = await updateClientProfile(userId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        state: form.state,
        city: form.city,
        organizationName: form.organizationName.trim(),
        bio: form.bio.trim(),
        profilePictureUrl: finalPhotoUrl,
      });
      if (dbError) throw dbError;
      setPhotoUrl(finalPhotoUrl);
      setPhotoFile(null);
      showToast("Profile updated", "success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--color-page)] flex items-center justify-center">
        <NoIndexMeta />
        <LoadingSpinner size="lg" label="Loading" />
      </div>
    );
  }

  const cities = form.state ? (INDIA_STATES[form.state] ?? []) : [];
  const previewUrl = photoFile ? URL.createObjectURL(photoFile) : photoUrl;

  return (
    <div className="min-h-screen bg-[var(--color-page)] flex flex-col">
      <NoIndexMeta />
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <Container className="flex h-16 items-center justify-between">
          <Logo size="md" />
          <Link href="/artists" className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            ← Back to browsing
          </Link>
        </Container>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-[440px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)]">
          <div className="mb-6">
            <h1 className="text-2xl">My profile</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">This is what artists see when they view your profile from a job posting.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-primary-soft)] overflow-hidden flex-shrink-0">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--color-text-secondary)]">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <input type="file" accept="image/*" id="client-pic-input" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhotoFile(f); }} />
                <label htmlFor="client-pic-input">
                  <span className="inline-flex cursor-pointer items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-primary-soft)]">
                    {previewUrl ? "Change photo" : "Upload photo"}
                  </span>
                </label>
                <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">Optional. JPG or PNG, up to 5MB.</p>
              </div>
            </div>

            <Input label="Your name" required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            <Input label="Email" value={email} disabled hint="Your account email — used for sign-in, can't be changed here." />
            <Input label="Phone number" optional type="tel" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <Input
              label="Organization or business name"
              optional
              placeholder="e.g. Sunrise Events, or leave blank if you're booking as an individual"
              value={form.organizationName}
              onChange={(e) => set("organizationName", e.target.value)}
            />

            <Select label="State" optional value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Select state</option>
              {Object.keys(INDIA_STATES).sort().map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>

            {cities.length > 0 && (
              <Select label="City" optional value={form.city} onChange={(e) => set("city", e.target.value)}>
                <option value="">Select city</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            )}

            <Textarea
              label="About you"
              optional
              placeholder="Tell artists a bit about yourself or the kind of events you host."
              value={form.bio}
              maxLength={BIO_MAX_LENGTH}
              onChange={(e) => set("bio", e.target.value)}
              hint={`${form.bio.length}/${BIO_MAX_LENGTH}`}
            />

            {error && (
              <p className="rounded-[var(--radius-md)] bg-[var(--color-error-soft)] px-4 py-3 text-sm text-[var(--color-error)]" role="alert">{error}</p>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
