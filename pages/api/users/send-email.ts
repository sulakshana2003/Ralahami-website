// pages/api/users/send-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import nodemailer from "nodemailer";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

/**
 * POST /api/users/send-email
 * Body (single):
 *   { userId: "..." , subject: "...", message: "...", sentBy?: "Admin Name" }
 * Body (bulk):
 *   { userIds: ["...","..."], subject: "...", message: "...", sentBy?: "Admin Name" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  // Admin gate — mirrors your [id].ts
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { userId, userIds, subject, message, sentBy } = (req.body ?? {}) as {
    userId?: string;
    userIds?: string[];
    subject?: string;
    message?: string;
    sentBy?: string;
  };

  if (!subject || !message) {
    return res.status(400).json({ message: "Subject and message are required." });
  }

  await dbConnect();

  // Determine recipients
  let recipients: { email: string }[] = [];

  if (userId) {
    const u = await User.findById(userId).select("email");
    if (!u?.email) return res.status(404).json({ message: "User not found." });
    recipients = [{ email: u.email }];
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    const list = await User.find({ _id: { $in: userIds } }).select("email");
    recipients = list.filter((x) => !!x.email).map((x) => ({ email: x.email }));
    if (recipients.length === 0) return res.status(400).json({ message: "No valid recipients." });
  } else {
    return res.status(400).json({ message: "Provide either userId or userIds." });
  }

  // Nodemailer transporter (Gmail App Password or your SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.EMAIL_USERNAME!,
      pass: process.env.EMAIL_PASSWORD!,
    },
  });

  // Common HTML (with inline logo + "Sent by")
  const html = renderHtml({
    body: String(message),
    sentBy: sentBy || (session.user as any)?.name || (session.user as any)?.email || "Admin",
  });

  try {
    if (recipients.length === 1) {
      // Single: send directly to user
      await transporter.sendMail({
        from: process.env.EMAIL_USERNAME,
        to: recipients[0].email,
        subject,
        html,
        attachments: [
          {
            filename: "logo.png",
            path: `${process.cwd()}/public/images/RalahamiLogo.png`,
            cid: "restaurantlogo@inline",
          },
        ],
      });
      return res.status(200).json({ ok: true, count: 1 });
    }

    // Bulk: one email BCC to protect addresses
    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: process.env.EMAIL_USERNAME, // some SMTPs require a "to"
      bcc: recipients.map((r) => r.email),
      subject,
      html,
      attachments: [
        {
          filename: "logo.png",
          path: `${process.cwd()}/public/images/RalahamiLogo.png`,
          cid: "restaurantlogo@inline",
        },
      ],
    });

    return res.status(200).json({ ok: true, count: recipients.length });
  } catch (e) {
    console.error("send-email error:", e);
    return res.status(500).json({ message: "Failed to send email." });
  }
}

function renderHtml({ body, sentBy }: { body: string; sentBy: string }) {
  const esc = (s: string) => String(s).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]!));
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
      <div style="background:#111;text-align:center;padding:14px">
        <img src="cid:restaurantlogo@inline" alt="Logo" style="height:44px;display:inline-block" />
      </div>
      <div style="padding:16px;line-height:1.55;white-space:pre-wrap">${esc(body)}</div>
      <div style="padding:12px 16px;color:#666;font-size:12px;border-top:1px solid #eee">Sent by: ${esc(sentBy)}</div>
    </div>
  </div>`;
}
