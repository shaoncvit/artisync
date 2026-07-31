import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

/**
 * Emails whichever side of a conversation didn't send this message —
 * every message, either direction (client -> artist or artist -> client).
 * Called (best-effort, never blocking) right after a message insert
 * succeeds in components/ChatThread.tsx.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const conversationId = typeof req.body?.conversationId === "string" ? req.body.conversationId : "";
  const messageId = typeof req.body?.messageId === "string" ? req.body.messageId : "";
  if (!conversationId || !messageId) return res.status(400).json({ error: "Missing conversationId or messageId" });

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res.status(500).json({ error: "Server misconfigured" });

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

  const { data: targets, error } = await supabase.rpc("get_message_email_target", {
    p_conversation_id: conversationId,
    p_message_id: messageId,
  });
  if (error) return res.status(500).json({ error: error.message });

  const target = Array.isArray(targets) ? targets[0] : targets;
  if (!target) return res.status(200).json({ notified: false });

  await sendEmail({
    to: target.to_email,
    subject: `New message from ${target.from_name} on ${SITE_NAME}`,
    html: `
      <p>Hi ${target.to_name},</p>
      <p><strong>${target.from_name}</strong> just sent you a message on ${SITE_NAME}.</p>
      <p><a href="${SITE_URL}/conversation/${conversationId}">Read and reply</a></p>
    `,
  });

  return res.status(200).json({ notified: true });
}
