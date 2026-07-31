import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

/**
 * Emails every published artist whose category and city match a job that
 * was just posted. Called (best-effort, never blocking) right after
 * postJob() succeeds in pages/post-job.tsx.
 *
 * Auth: the caller must be the client who owns the job — enforced inside
 * get_job_notification_targets(), a security-definer function that's the
 * only thing allowed to read other artists' email addresses here.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const jobId = typeof req.body?.jobId === "string" ? req.body.jobId : "";
  if (!jobId) return res.status(400).json({ error: "Missing jobId" });

  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res.status(500).json({ error: "Server misconfigured" });

  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

  const { data: job } = await supabase.from("jobs").select("title, art_form, city, state").eq("id", jobId).maybeSingle();
  if (!job) return res.status(404).json({ error: "Job not found" });

  const { data: targets, error } = await supabase.rpc("get_job_notification_targets", { p_job_id: jobId });
  if (error) return res.status(500).json({ error: error.message });

  const recipients = (targets ?? []) as { email: string; full_name: string }[];
  const results = await Promise.allSettled(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `New ${job.art_form} job in ${job.city} — ${job.title}`,
        html: `
          <p>Hi ${r.full_name},</p>
          <p>A new job matching your category and city was just posted on ${SITE_NAME}:</p>
          <p><strong>${job.title}</strong><br/>${job.art_form} · ${job.city}${job.state ? `, ${job.state}` : ""}</p>
          <p><a href="${SITE_URL}/dashboard">View and apply on your dashboard</a></p>
          <p style="color:#888;font-size:12px;">You're receiving this because your ArtiSync profile's category and city match this job.</p>
        `,
      })
    )
  );
  const notified = results.filter((r) => r.status === "fulfilled").length;
  return res.status(200).json({ notified, total: recipients.length });
}
