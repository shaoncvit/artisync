import { supabase } from "@/lib/supabaseClient";

async function authedFetch(path: string, body: Record<string, string>) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    // Not surfaced to the user (this is a nice-to-have, not something worth
    // an error toast over) but logged so a failed send is visible in the
    // browser console instead of vanishing silently.
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.notified === false) console.warn(`${path} did not send an email:`, json);
  } catch {
    // Non-fatal — email notifications are a nice-to-have, never block the action that triggered them.
  }
}

/** Best-effort — emails artists whose category/city match a job that was just posted. */
export function notifyNewJobPosted(jobId: string) {
  void authedFetch("/api/notify-new-job", { jobId });
}

/** Best-effort — emails whichever side of the conversation didn't send this message. */
export function notifyNewMessage(conversationId: string, messageId: string) {
  void authedFetch("/api/notify-new-message", { conversationId, messageId });
}
