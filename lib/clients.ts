import { supabase, ARTIST_MEDIA_BUCKET } from "@/lib/supabaseClient";

export type ClientProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  state: string;
  city: string;
  organizationName: string;
  bio: string;
  profilePictureUrl: string;
  coverBannerUrl: string;
  photoUrls: string[];
  createdAt: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapClientRow(d: any): ClientProfile {
  return {
    id: d.id ?? "",
    fullName: d.full_name ?? "",
    phone: d.phone ?? "",
    email: d.email ?? "",
    state: d.state ?? "",
    city: d.city ?? "",
    organizationName: d.organization_name ?? "",
    bio: d.bio ?? "",
    profilePictureUrl: d.profile_picture_url ?? "",
    coverBannerUrl: d.cover_banner_url ?? "",
    photoUrls: d.photo_urls ?? [],
    createdAt: d.created_at ?? "",
  };
}

/** The current client's own full record — used on the profile-edit page. */
export async function getMyClientProfile(userId: string) {
  return supabase.from("clients").select("*").eq("id", userId).maybeSingle();
}

/** Safe-to-share fields only (never phone/email) — used when an artist views a client's profile. */
export async function getPublicClientProfile(clientId: string) {
  return supabase.from("clients_public").select("*").eq("id", clientId).maybeSingle();
}

export async function updateClientProfile(
  userId: string,
  fields: {
    fullName: string;
    phone: string;
    state: string;
    city: string;
    organizationName: string;
    bio: string;
    profilePictureUrl: string;
    coverBannerUrl: string;
    photoUrls: string[];
  }
) {
  return supabase
    .from("clients")
    .update({
      full_name: fields.fullName,
      phone: fields.phone,
      state: fields.state,
      city: fields.city,
      organization_name: fields.organizationName,
      bio: fields.bio,
      profile_picture_url: fields.profilePictureUrl,
      cover_banner_url: fields.coverBannerUrl,
      photo_urls: fields.photoUrls,
    })
    .eq("id", userId);
}

async function uploadClientMedia(userId: string, file: File, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(ARTIST_MEDIA_BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(ARTIST_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadClientProfilePicture(userId: string, file: File): Promise<string> {
  return uploadClientMedia(userId, file, "client-profile");
}

export async function uploadClientCoverBanner(userId: string, file: File): Promise<string> {
  return uploadClientMedia(userId, file, "client-cover");
}

export async function uploadClientPhoto(userId: string, file: File): Promise<string> {
  return uploadClientMedia(userId, file, "client-photo");
}
