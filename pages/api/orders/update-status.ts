// pages/api/orders/update-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";
import type { IOnlineOrder } from "@/models/OnlineOrder";
import type { Model, FilterQuery, HydratedDocument } from "mongoose";
import nodemailer from "nodemailer";
import QRCode from "qrcode";

const Orders = OnlineOrder as unknown as Model<IOnlineOrder>;
const HOST = process.env.HOST_URL || "";
const ALLOWED = new Set(["confirmed", "preparing", "ready", "completed", "cancelled"]);

type Resp = { ok: true; orderId: string; status: string } | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // allow admin to pass an email override (optional)
  const { orderId, status, email: overrideEmail } = (req.body || {}) as {
    orderId?: string;
    status?: string;
    email?: string;
  };

  if (!orderId || typeof orderId !== "string") {
    return res.status(400).json({ ok: false, error: "Missing orderId" });
  }
  if (!status || typeof status !== "string") {
    return res.status(400).json({ ok: false, error: "Missing status" });
  }

  // normalize case
  const newStatus = status.toLowerCase();
  if (!ALLOWED.has(newStatus)) {
    return res.status(400).json({ ok: false, error: `Invalid status: ${status}` });
  }

  try {
    await dbConnect();

    let order: HydratedDocument<IOnlineOrder> | null = await Orders.findOne(
      { orderId } as FilterQuery<IOnlineOrder>
    );
    if (!order) order = await Orders.findById(orderId);
    if (!order) return res.status(404).json({ ok: false, error: "Order not found" });

    // parse existing note JSON (holds status & flags)
    let noteJson: any = {};
    if (order.note) {
      try {
        noteJson = JSON.parse(order.note);
      } catch {
        noteJson = { message: order.note };
      }
    }

    // write new status + timestamp
    noteJson.status = newStatus;
    noteJson.statusUpdatedAt = new Date().toISOString();

    // persist the status change first
    const updated = await Orders.findByIdAndUpdate(
      order._id,
      { note: JSON.stringify(noteJson) },
      { new: true }
    );
    if (!updated) return res.status(500).json({ ok: false, error: "Failed to update order" });

    // decide whether to notify
    const isReadyNow = newStatus === "ready";
    const wasNotified = Boolean(noteJson.notifiedReady);
    const shouldNotify = isReadyNow && !wasNotified;

    // find best-guess customer email
    const customerEmail =
      overrideEmail ||
      noteJson?.customer?.email ||
      noteJson?.order?.customer?.email ||
      undefined;

    // try to email; log why if not
    if (shouldNotify) {
      if (!process.env.SMTP_URL || !process.env.EMAIL_FROM) {
        console.warn("[ready-email] Missing SMTP_URL or EMAIL_FROM");
      } else if (!customerEmail) {
        console.warn("[ready-email] No customer email found in note or override");
      } else {
        try {
          const trackUrl = `${HOST}/order/track?orderId=${encodeURIComponent(
            updated.orderId || String(updated._id)
          )}`;
          const qrPng = await QRCode.toBuffer(trackUrl, { margin: 1, width: 320 });

          const transporter = nodemailer.createTransport(process.env.SMTP_URL);
          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: customerEmail,
            subject: `Your order is ready 🎉 (${updated.orderId || String(updated._id)})`,
            html: buildReadyHtml({
              orderId: updated.orderId || String(updated._id),
              customerName:
                noteJson?.customer?.name || noteJson?.order?.customer?.name || "there",
              trackUrl,
            }),
            attachments: [{ filename: "order-qr.png", content: qrPng, cid: "qr", contentType: "image/png" }],
          });

          // mark as notified to prevent duplicates
          noteJson.notifiedReady = true;
          await Orders.findByIdAndUpdate(updated._id, { note: JSON.stringify(noteJson) });
        } catch (err) {
          console.error("[ready-email] sendMail error:", err);
        }
      }
    }

    return res
      .status(200)
      .json({ ok: true, orderId: updated.orderId || String(updated._id), status: newStatus });
  } catch (e: any) {
    console.error("update-status error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}

/* ------------------------- email template ------------------------- */
function buildReadyHtml(p: { orderId: string; customerName: string; trackUrl: string }) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 8px">Your order is ready 🎉</h2>
    <p style="margin:0 0 12px">Hi ${escapeHtml(p.customerName)}, your order <b>${p.orderId}</b> is ready for pickup/delivery.</p>
    <p style="margin:0 0 8px">Show this QR at the counter or to the courier:</p>
    <p style="margin:0 0 16px"><img src="cid:qr" alt="Order QR" width="160" height="160" style="border:1px solid #eee;border-radius:8px"/></p>
    <p style="margin:0 0 4px">You can also <a href="${p.trackUrl}">click here</a> to view live status.</p>
    <p style="margin:16px 0 0;color:#6b7280">Thanks for choosing us!</p>
  </div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}
