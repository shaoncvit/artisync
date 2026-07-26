import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * On-demand ISR revalidation for a single artist's public profile page.
 *
 * The public profile route (pages/artists/[...params].tsx) is statically
 * generated with `fallback: "blocking"` and caches a `notFound` result for
 * 60s whenever a slug doesn't resolve to a published profile — which
 * happens whenever anyone visits an artist's URL while they're still a
 * draft (e.g. previewing the "your profile will be at..." link the wizard
 * shows). Publishing moments later doesn't clear that cached 404 on its
 * own; it sits there until the 60s TTL expires. Calling this right after a
 * publish/unpublish forces Next.js to regenerate that exact page
 * immediately instead of waiting on the timer.
 *
 * Auth: the caller must be the artist who owns the slug being revalidated
 * — verified via their own Supabase access token — so this can't be used
 * to spam revalidation for arbitrary slugs.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const slug = typeof req.body?.slug === "string" ? req.body.slug.trim() : "";
  if (!slug) return res.status(400).json({ error: "Missing slug" });

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res.status(500).json({ error: "Server misconfigured" });

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return res.status(401).json({ error: "Invalid session" });

  const { data: artistRow } = await supabase.from("artists").select("slug").eq("id", userData.user.id).maybeSingle();
  if (!artistRow || artistRow.slug !== slug) {
    return res.status(403).json({ error: "You can only revalidate your own profile" });
  }

  try {
    await res.revalidate(`/artists/${slug}`);
    return res.status(200).json({ revalidated: true });
  } catch (err) {
    // Non-fatal — e.g. running somewhere without ISR support. The page
    // still catches up on its own via the normal revalidate window.
    console.error("revalidate-artist failed:", err);
    return res.status(200).json({ revalidated: false });
  }
}
