import { supabase } from "@/lib/supabaseClient";

/** Best-effort on-demand ISR revalidation right after a publish/unpublish so the public page doesn't serve a stale cached 404. Never throws. */
export async function revalidateArtistProfile(slug: string) {
  if (!slug) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await fetch("/api/revalidate-artist", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slug }),
    });
  } catch {
    // Non-fatal — the page still catches up on its own via the normal ISR window.
  }
}
