// pages/api/orders/update-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import OnlineOrder from "@/models/OnlineOrder";

type StatusType = "pending" | "preparing" | "ready" | "completed" | "cancelled" | "confirmed";

async function dbConnect() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI);
}

function getCustomerEmailFromDoc(doc: any): string | undefined {
  // flat field first
  const flat = (doc as any).customerEmail as string | undefined;
  if (flat) return flat;

  // then note JSON
  try {
    const j = doc.note ? JSON.parse(doc.note) : {};
    return j?.customer?.email || j?.order?.customer?.email || undefined;
  } catch {
    return undefined;
  }
}

async function sendReadyEmail(to: string, orderId: string) {
  // You can keep this as SMTP_URL env, or hardcode Gmail below (app password recommended).
  // Example SMTP_URL:  smtp://USER:APP_PASSWORD@smtp.gmail.com:587
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.EMAIL_FROM || "ralahamihotel@gmail.com";

  const transporter = nodemailer.createTransport(
    smtpUrl || {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "ralahamihotel@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD!, // create an App Password in Google Account
      },
    }
  );

  const subject = `Your order ${orderId} is ready for pickup`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto">
      <h2 style="margin:0 0 8px">✅ Your order is ready!</h2>
      <p style="margin:0 0 12px">Order <b>${orderId}</b> is now ready. Please come by to pick it up.</p>
      <p style="margin:0 0 6px">If you have any questions, reply to this email.</p>
      <p style="margin:12px 0 0;color:#6b7280">— Ralahami Hotel</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { orderId, status } = (req.body ?? {}) as { orderId?: string; status?: StatusType };
  const allowed: StatusType[] = ["confirmed", "pending", "preparing", "ready", "completed", "cancelled"];

  if (!orderId) return res.status(400).json({ error: "orderId is required" });
  if (!status || !allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  try {
    await dbConnect();

    const or: any[] = [{ orderId }];
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      or.push({ _id: new mongoose.Types.ObjectId(orderId) }, { _id: orderId });
    }

    const doc = await OnlineOrder.findOne({ $or: or });
    if (!doc) return res.status(404).json({ error: "Order not found" });

    // update status in note
    let note: any = {};
    try { note = doc.note ? JSON.parse(doc.note) : {}; } catch {}
    note.status = status;

    await OnlineOrder.updateOne({ _id: doc._id }, { $set: { note: JSON.stringify(note) } });

    // If status becomes "ready" -> email the customer (if we have an email)
    if (status === "ready") {
      const email = getCustomerEmailFromDoc(doc) || undefined;
      if (email) {
        try {
          await sendReadyEmail(email, doc.orderId || String(doc._id));
        } catch (e) {
          console.error("[update-status] ready email failed:", e);
          // Don't fail the request because of email; just log it.
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[update-status] error:", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
