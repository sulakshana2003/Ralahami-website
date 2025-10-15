// pages/api/orders/confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import mongoose, { type Model, type FilterQuery, type UpdateQuery } from "mongoose";
import OnlineOrder from "@/models/OnlineOrder";
import type { IOnlineOrder } from "@/models/OnlineOrder";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/* ───────────────────────────── DB ───────────────────────────── */
async function dbConnect() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI);
}

/* ─────────────────────── Stripe client ──────────────────────── */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any,
});

/* ─────────────────────── Typed model alias ──────────────────── */
const Orders = OnlineOrder as unknown as Model<IOnlineOrder>;

/* ───────────────────────── Types ────────────────────────────── */
type Line = { name: string; qty: number; unitPrice: number; lineTotal: number };

type NormalizedOrder = {
  orderId: string;
  status: "confirmed";
  revenue: number;
  cost: number;
  date: string; // YYYY-MM-DD
  items: Line[];
  customer?: { name?: string; email?: string; phone?: string };
  fulfilment?: any;
  note?: string;
  trackUrl: string;
};

/* ─────────────────────── Helpers ───────────────────────────── */
const HOST = process.env.HOST_URL || "";

function centsToMajor(n?: number | null) {
  if (!n) return 0;
  return Math.round(n) / 100;
}
function rs(n: number | string | null | undefined) {
  const num = typeof n === "number" ? n : Number(n ?? 0);
  return `Rs. ${Math.round(num).toLocaleString()}`;
}
function loadLogo(): Buffer | undefined {
  const p1 = path.resolve(process.cwd(), "public", "images", "RalahamiLogo.png");
  const p2 = path.resolve(process.cwd(), "images", "RalahamiLogo.png");
  try { if (fs.existsSync(p1)) return fs.readFileSync(p1); } catch {}
  try { if (fs.existsSync(p2)) return fs.readFileSync(p2); } catch {}
  return undefined;
}

function parseCustomerFromNote(note?: string): { email?: string; name?: string; phone?: string } | undefined {
  if (!note) return undefined;
  try {
    const j = JSON.parse(note);
    return j?.customer || j?.order?.customer || undefined;
  } catch {
    return undefined;
  }
}

/* ───────────── PDF (compact receipt) to Buffer ─────────────── */
async function buildReceiptPdf(payload: NormalizedOrder): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const W = 226; // ~80mm receipt width
    const M = 14;

    const doc = new PDFDocument({
      size: [W, 1000],
      margin: M,
      info: {
        Title: `Receipt – ${payload.orderId}`,
        Author: process.env.STORE_NAME || "Ralahami.lk",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const rule = (y?: number) => {
      const yy = y ?? (doc.y + 2);
      doc.moveTo(M, yy).lineTo(W - M, yy).lineWidth(0.6).strokeColor("#E5E7EB").stroke();
    };
    const kv = (k: string, v: string, bold = false) => {
      const left = M, right = W - M, half = (right - left) / 2;
      const y0 = doc.y;
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#111827")
        .text(k, left, y0, { width: half - 4, align: "left" });
      const kh = doc.heightOfString(k, { width: half - 4 });
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#111827")
        .text(v, left + half, y0, { width: half, align: "right" });
      const vh = doc.heightOfString(v, { width: half });
      doc.y = y0 + Math.max(kh, vh) + 2;
    };

    // Header with logo
    const logo = loadLogo();
    if (logo) {
      const w = 90, x = (W - w) / 2;
      doc.image(logo, x, doc.y, { width: w });
      doc.moveDown(0.2);
    }

    const STORE_NAME = process.env.STORE_NAME || "Ralahami.lk";
    const STORE_ADDR_1 = process.env.STORE_ADDR_1 || "No. 123, Sample Road";
    const STORE_ADDR_2 = process.env.STORE_ADDR_2 || "Colombo, Sri Lanka";
    const STORE_PHONE = process.env.STORE_PHONE || "+94 70 000 0000";
    const STORE_EMAIL = process.env.STORE_EMAIL || "support@ralahami.lk";

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827")
      .text(STORE_NAME, { align: "center" })
      .font("Helvetica").fontSize(9).fillColor("#4B5563")
      .text(STORE_ADDR_1, { align: "center" })
      .text(STORE_ADDR_2, { align: "center" })
      .text(`Tel: ${STORE_PHONE}`, { align: "center" })
      .text(STORE_EMAIL, { align: "center" });

    rule(); doc.moveDown(0.3);

    // Meta
    kv("Order", payload.orderId);
    kv("Date", payload.date);
    if (payload.customer?.name) kv("Customer", payload.customer.name);
    if (payload.customer?.phone) kv("Phone", payload.customer.phone);

    doc.moveDown(0.3); rule(); doc.moveDown(0.3);

    // Items
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("Items", M, doc.y);
    doc.moveDown(0.2);

    const left = M, right = W - M, half = (right - left) / 2;

    payload.items.forEach((it, i) => {
      const name = it.name || "—";
      const qty = Number(it.qty ?? 1);
      const unit = rs(it.unitPrice ?? (it.lineTotal || 0));
      const total = rs(it.lineTotal ?? 0);

      doc.font("Helvetica").fontSize(9).fillColor("#111827")
        .text(name, left, doc.y, { width: right - left, align: "left" });

      const meta = `x${qty}  @  ${unit}`;
      doc.fillColor("#6B7280").text(meta, left, doc.y, { width: half, align: "left" });
      doc.font("Helvetica-Bold").fillColor("#111827")
        .text(total, left + half, doc.y - doc.currentLineHeight(), { width: half, align: "right" });
      doc.font("Helvetica");

      if (i < payload.items.length - 1) {
        doc.moveDown(0.2); rule(doc.y + 2); doc.moveDown(0.2);
      }
    });

    doc.moveDown(0.5); rule(); doc.moveDown(0.3);

    const sub = payload.items.reduce((s, x) => s + (x.lineTotal || 0), 0);
    kv("Subtotal", rs(sub));
    rule(doc.y + 3); doc.moveDown(0.2);
    kv("Total Paid", rs(payload.revenue), true);

    doc.moveDown(0.8);
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#6B7280")
      .text("Thank you for your order!", { align: "center" });

    doc.end();
  });
}

/* ───────────── HTML email (uses inline QR by cid="qr") ───────────── */
function buildEmailHtml(order: NormalizedOrder) {
  const rows = order.items.map((it) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #eee">${it.name}</td>
        <td style="padding:6px 8px;border:1px solid #eee;text-align:center">${it.qty}</td>
        <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${rs(it.unitPrice)}</td>
        <td style="padding:6px 8px;border:1px solid #eee;text-align:right">${rs(it.lineTotal)}</td>
      </tr>
    `).join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto">
    <h2 style="margin:0 0 8px">🎉 Order confirmed</h2>
    <p style="margin:0 0 12px">Thanks for your purchase! Your order <b>${order.orderId}</b> has been placed.</p>

    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;border:1px solid #eee">
      <thead>
        <tr style="background:#fafafa">
          <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Item</th>
          <th style="padding:6px 8px;border:1px solid #eee;text-align:center">Qty</th>
          <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Price</th>
          <th style="padding:6px 8px;border:1px solid #eee;text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p style="margin:12px 0 0"><b>Total:</b> ${rs(order.revenue)}</p>

    <h3 style="margin:16px 0 8px">Scan to track</h3>
    <p style="margin:0"><img src="cid:qr" alt="Order QR" width="160" height="160" style="border:1px solid #eee;border-radius:8px"/></p>

    <p style="margin:16px 0;color:#555">You can also <a href="${order.trackUrl}">click here</a> to track your order.</p>
  </div>`;
}

/* ───────────── Send email with attachments ───────────── */
async function sendEmailWithReceipt(order: NormalizedOrder, qrPng: Buffer, receiptPdf: Buffer) {
  if (!process.env.SMTP_URL || !process.env.EMAIL_FROM) return;

  const transporter = nodemailer.createTransport(process.env.SMTP_URL);

  // be resilient: try normalized.customer, then note JSON, then fallback to yourself
  let to = order.customer?.email;
  if (!to && order.note) {
    try {
      const n = JSON.parse(order.note);
      to = n?.customer?.email || n?.order?.customer?.email || undefined;
    } catch {}
  }
  to = to || process.env.EMAIL_FROM;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Order confirmed: ${order.orderId}`,
    html: buildEmailHtml(order),
    attachments: [
      {
        filename: `${order.orderId}.pdf`,
        content: receiptPdf,
        contentType: "application/pdf",
      },
      {
        filename: "order-qr.png",
        content: qrPng,
        cid: "qr", // referenced in the HTML <img src="cid:qr">
        contentType: "image/png",
      },
    ],
  });
}

/* ─────────────────────────── Handler ────────────────────────── */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();
  } catch (e: any) {
    console.error("DB connect error:", e?.message || e);
    return res.status(500).json({ error: "Database connection failed." });
  }

  try {
    const { session_id, orderId } = req.query as { session_id?: string; orderId?: string };
    let normalized: NormalizedOrder | null = null;

    /* ── Case A: Stripe success (card paid) ── */
    if (session_id) {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["line_items", "payment_intent", "customer_details"],
      });
      if (session.payment_status !== "paid") {
        return res.status(400).json({ error: "Payment not completed." });
      }

      const items: Line[] =
        session.line_items?.data.map((li: any) => {
          const name = li.description || li.price?.product || "Item";
          const qty = li.quantity || 1;
          const unitPrice = li.price?.unit_amount ? centsToMajor(li.price.unit_amount) : 0;
          const lineTotal = li.amount_total ? centsToMajor(li.amount_total) : unitPrice * qty;
          return { name, qty, unitPrice, lineTotal };
        }) || [];

      const revenue = centsToMajor(session.amount_total);
      const cost = Math.round(revenue * 0.6);
      const date = new Date().toISOString().slice(0, 10);
      const id = session.id;

      const rawNote = {
        source: "stripe",
        method: "online",
        stripe_session_id: session.id,
        payment_status: session.payment_status,
        currency: session.currency,
        items,
        customer: {
          name: session.customer_details?.name || undefined,
          email: session.customer_details?.email || undefined,
          phone: session.customer_details?.phone || undefined,
          address: session.customer_details?.address || undefined,
        },
      };

      const trackUrl = `${HOST}/order/track?orderId=${encodeURIComponent(id)}`;
      const qrPng = await QRCode.toBuffer(trackUrl, { margin: 1, width: 320 });

      // Upsert in DB (only once) and persist flat customer fields for fast lookups
      await Orders.updateOne(
        { orderId: id } as FilterQuery<IOnlineOrder>,
        {
          $setOnInsert: {
            date,
            orderId: id,
            revenue,
            cost,
            note: JSON.stringify(rawNote),

            // flat columns (optional fields in schema)
            customerEmail: rawNote.customer?.email,
            customerName: rawNote.customer?.name,
            customerPhone: rawNote.customer?.phone,
          },
        } as UpdateQuery<IOnlineOrder>,
        { upsert: true }
      );

      normalized = {
        orderId: id,
        status: "confirmed",
        revenue,
        cost,
        date,
        items,
        customer: {
          name: rawNote.customer?.name,
          email: rawNote.customer?.email,
          phone: rawNote.customer?.phone,
        },
        fulfilment: undefined,
        note: JSON.stringify(rawNote),
        trackUrl,
      };

      // Build receipt & email it
      const receiptPdf = await buildReceiptPdf(normalized);
      await sendEmailWithReceipt(normalized, qrPng, receiptPdf);
    }

    /* ── Case B: COD / Card-on-Delivery (?orderId=...) ── */
    if (!normalized && orderId) {
      const doc = await Orders.findOne({ orderId } as FilterQuery<IOnlineOrder>);
      if (!doc) return res.status(404).json({ error: "Order not found." });

      let items: Line[] = [];
      let customer: NormalizedOrder["customer"];
      let fulfilment: any;

      try {
        if (doc.note) {
          const j = JSON.parse(doc.note);
          if (j?.order?.items) items = j.order.items;
          else if (j?.items) items = j.items;
          customer = j?.order?.customer || j?.customer;
          fulfilment = j?.order?.fulfilment || j?.fulfilment;
        }
      } catch {}

      // If flat fields exist in the row, fold them into `customer` as fallback
      const fallbackEmail = (doc as any).customerEmail as string | undefined;
      const fallbackName = (doc as any).customerName as string | undefined;
      const fallbackPhone = (doc as any).customerPhone as string | undefined;
      customer = {
        email: customer?.email || fallbackEmail,
        name: customer?.name || fallbackName,
        phone: customer?.phone || fallbackPhone,
      };

      // If we discovered customer in note but flat fields are empty, set them for next time
      if ((customer?.email || customer?.name || customer?.phone) &&
          (!fallbackEmail && !fallbackName && !fallbackPhone)) {
        await Orders.updateOne(
          { orderId } as FilterQuery<IOnlineOrder>,
          {
            $set: {
              customerEmail: customer?.email,
              customerName: customer?.name,
              customerPhone: customer?.phone,
            },
          } as UpdateQuery<IOnlineOrder>
        );
      }

      const trackUrl = `${HOST}/order/track?orderId=${encodeURIComponent(orderId)}`;
      const qrPng = await QRCode.toBuffer(trackUrl, { margin: 1, width: 320 });

      normalized = {
        orderId,
        status: "confirmed",
        revenue: doc.revenue,
        cost: doc.cost,
        date: doc.date,
        items,
        customer,
        fulfilment,
        note: doc.note,
        trackUrl,
      };

      const receiptPdf = await buildReceiptPdf(normalized);
      await sendEmailWithReceipt(normalized, qrPng, receiptPdf);
    }

    if (!normalized) {
      return res.status(400).json({ error: "Missing session_id or orderId." });
    }

    return res.status(200).json({ order: normalized });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};
