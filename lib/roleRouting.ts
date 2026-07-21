import { supabase } from "./supabaseClient";

export type EntryRole = "artist" | "client";

export const CLIENT_PREFS_DISMISS_KEY = "artisync_client_prefs_dismissed";

export async function hasArtistProfile(userId: string): Promise<boolean> {
  const { data } = await supabase.from("artists").select("id").eq("id", userId).maybeSingle();
  return !!data;
}

/** Does the client have a basic identity record (name/phone/city)? */
export async function hasClientIdentity(userId: string): Promise<boolean> {
  const { data } = await supabase.from("clients").select("id").eq("id", userId).maybeSingle();
  return !!data;
}

/** Has the client completed (or saved any of) the artist-matching preference wizard? */
export async function hasClientPreferences(userId: string): Promise<boolean> {
  const { data } = await supabase.from("client_preferences").select("client_id").eq("client_id", userId).maybeSingle();
  return !!data;
}

/**
 * Central place that decides where an authenticated user should land.
 * An existing artist/client row takes precedence over the role the user
 * originally picked at signup, since that's the strongest signal of who
 * they actually are on repeat visits.
 */
export async function resolveEntryPath(userId: string, intendedRole: EntryRole): Promise<string> {
  const [isArtist, isClient] = await Promise.all([hasArtistProfile(userId), hasClientIdentity(userId)]);
  if (isArtist) return "/dashboard";
  if (isClient) {
    if (typeof window !== "undefined" && sessionStorage.getItem(CLIENT_PREFS_DISMISS_KEY) === "1") return "/artists";
    const hasPrefs = await hasClientPreferences(userId);
    return hasPrefs ? "/artists" : "/client-preferences";
  }
  return intendedRole === "client" ? "/client-onboarding" : "/create-profile";
}
