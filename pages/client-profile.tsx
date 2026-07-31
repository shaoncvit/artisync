import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  getMyClientProfile,
  updateClientProfile,
  uploadClientProfilePicture,
  uploadClientCoverBanner,
  uploadClientPhoto,
  mapClientRow,
} from "@/lib/clients";
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
const MAX_PHOTOS = 6;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

type PhotoItem = { id: string; kind: "saved"; url: string } | { id: string; kind: "new"; file: File; previewUrl: string };

export default function ClientProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
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
      setCoverUrl(profile.coverBannerUrl);
      setPhotos(profile.photoUrls.map((url, i) => ({ id: `saved-${i}`, kind: "saved", url })));
      setJoinedAt(
        profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" }) : ""
      );
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

  function acceptImageFile(file: File): boolean {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showToast(`That image is over the ${MAX_IMAGE_SIZE_MB}MB limit.`, "error");
      return false;
    }
    return true;
  }

  function addPhotoFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    const withinSize = images.filter((f) => acceptImageFile(f));
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const toAdd = withinSize.slice(0, remaining);
    setPhotos((prev) => [
      ...prev,
      ...toAdd.map((file, i) => ({ id: `new-${Date.now()}-${i}`, kind: "new" as const, file, previewUrl: URL.createObjectURL(file) })),
    ]);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.kind === "new") URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) { setError("Please enter your name"); return; }
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile) finalPhotoUrl = await uploadClientProfilePicture(userId, photoFile);

      let finalCoverUrl = coverUrl;
      if (coverFile) finalCoverUrl = await uploadClientCoverBanner(userId, coverFile);

      const finalPhotoUrls: string[] = [];
      for (const item of photos) {
        if (item.kind === "saved") finalPhotoUrls.push(item.url);
        else finalPhotoUrls.push(await uploadClientPhoto(userId, item.file));
      }

      const { error: dbError } = await updateClientProfile(userId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        state: form.state,
        city: form.city,
        organizationName: form.organizationName.trim(),
        bio: form.bio.trim(),
        profilePictureUrl: finalPhotoUrl,
        coverBannerUrl: finalCoverUrl,
        photoUrls: finalPhotoUrls,
      });
      if (dbError) throw dbError;
      setPhotoUrl(finalPhotoUrl);
      setPhotoFile(null);
      setCoverUrl(finalCoverUrl);
      setCoverFile(null);
      setPhotos(finalPhotoUrls.map((url, i) => ({ id: `saved-${i}`, kind: "saved", url })));
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
  const coverPreviewUrl = coverFile ? URL.createObjectURL(coverFile) : coverUrl;

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
        <div className="w-full max-w-[560px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-sm)]">
          <div className="mb-6">
            <h1 className="text-2xl">My profile</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">This is what artists see when they view your profile from a job posting.</p>
            {joinedAt && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Joined {joinedAt}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <p className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Cover photo <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span></p>
              <div className="relative h-32 sm:h-40 rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-primary-soft)]">
                {coverPreviewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreviewUrl} alt="Cover" className="w-full h-full object-cover" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  id="client-cover-input"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f && acceptImageFile(f)) setCoverFile(f); }}
                />
                <label
                  htmlFor="client-cover-input"
                  className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/75"
                >
                  {coverPreviewUrl ? "Change cover" : "+ Add cover photo"}
                </label>
              </div>
            </div>

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
                <input type="file" accept="image/*" id="client-pic-input" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && acceptImageFile(f)) setPhotoFile(f); }} />
                <label htmlFor="client-pic-input">
                  <span className="inline-flex cursor-pointer items-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-primary-soft)]">
                    {previewUrl ? "Change photo" : "Upload photo"}
                  </span>
                </label>
                <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">Optional. JPG or PNG, up to {MAX_IMAGE_SIZE_MB}MB.</p>
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-[var(--color-text)]">Photos <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span></p>
                <span className="text-xs text-[var(--color-text-secondary)]">{photos.length}/{MAX_PHOTOS}</span>
              </div>
              <p className="mb-3 text-xs text-[var(--color-text-secondary)]">Show artists a few photos from past events or venues you&apos;ve booked. JPG or PNG, up to {MAX_IMAGE_SIZE_MB}MB each.</p>
              <input
                type="file"
                accept="image/*"
                multiple
                id="client-photos-input"
                className="hidden"
                onChange={(e) => { addPhotoFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }}
              />
              <div className="grid grid-cols-3 gap-3">
                {photos.map((item) => (
                  <div key={item.id} className="relative aspect-square rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-primary-soft)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.kind === "saved" ? item.url : item.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(item.id)}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label
                    htmlFor="client-photos-input"
                    className="aspect-square cursor-pointer rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] flex flex-col items-center justify-center gap-1 text-[var(--color-text-secondary)] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[10px]">Add</span>
                  </label>
                )}
              </div>
            </div>

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
