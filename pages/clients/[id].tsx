import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getPublicClientProfile, mapClientRow, type ClientProfile } from "@/lib/clients";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoIndexMeta from "@/components/NoIndexMeta";
import EmptyState from "@/components/EmptyState";

export default function ClientProfileViewPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) {
        router.replace({ pathname: "/signup", query: { role: "artist", returnTo: router.asPath } });
        return;
      }
      if (!id) return;
      const { data } = await getPublicClientProfile(id);
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setChecking(false);
        return;
      }
      setProfile(mapClientRow(data));
      setChecking(false);
    }

    if (router.isReady) load();
    return () => { cancelled = true; };
  }, [router, id]);

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-page)] flex flex-col">
      <NoIndexMeta />
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <Container className="flex h-16 items-center justify-between">
          <Logo size="md" />
          <Link href="/dashboard" className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            ← Back to jobs
          </Link>
        </Container>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-14">
        {checking ? (
          <LoadingSpinner size="lg" label="Loading profile" />
        ) : notFound || !profile ? (
          <EmptyState title="Profile not found" description="This client profile isn't available." />
        ) : (
          <div className="w-full max-w-[440px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] text-center overflow-hidden">
            {profile.coverBannerUrl && (
              <div className="h-28 w-full bg-[var(--color-primary-soft)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.coverBannerUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={profile.coverBannerUrl ? "px-8 pb-8 -mt-12" : "p-8"}>
              <div className="mx-auto w-24 h-24 rounded-full border-4 border-[var(--color-surface)] bg-[var(--color-primary-soft)] overflow-hidden flex items-center justify-center">
                {profile.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profilePictureUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[var(--color-text-secondary)]">
                    {(profile.fullName || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-2xl">{profile.fullName || "A client"}</h1>
              {profile.organizationName && (
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-secondary)]">{profile.organizationName}</p>
              )}
              {(profile.city || profile.state) && (
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{[profile.city, profile.state].filter(Boolean).join(", ")}</p>
              )}
              {memberSince && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Member since {memberSince}</p>
              )}

              {profile.bio && (
                <p className="mt-5 text-sm text-[var(--color-text)] whitespace-pre-line text-left">{profile.bio}</p>
              )}

              {profile.photoUrls.length > 0 && (
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {profile.photoUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-primary-soft)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
