// pages/api/orders/receipt.pdf.ts
import type { NextApiRequest, NextApiResponse } from "next";
import PDFDocument from "pdfkit";
import mongoose, { type Model, type FilterQuery } from "mongoose";
import OnlineOrder from "@/models/OnlineOrder";
import type { IOnlineOrder } from "@/models/OnlineOrder";
import fs from "fs";
import path from "path";

/* ── DB ── */
async function dbConnect() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI as string);
}

/* ── Model typing (non-breaking alias) ── */
const Orders = OnlineOrder as unknown as Model<IOnlineOrder>;

/* ── Store meta ── */
const STORE_NAME   = process.env.STORE_NAME   || "Ralahami.lk";
const STORE_PHONE  = process.env.STORE_PHONE  || "+94 70 000 0000";
const STORE_EMAIL  = process.env.STORE_EMAIL  || "support@ralahami.lk";
const STORE_ADDR_1 = process.env.STORE_ADDR_1 || "No. 123, Sample Road";
const STORE_ADDR_2 = process.env.STORE_ADDR_2 || "Colombo, Sri Lanka";

/* 80 mm thermal receipt */
const W = 226;
const M = 14;

/* ── Helpers ── */
function rs(n: number | string | undefined | null) {
  const num = typeof n === "number" ? n : Number(n ?? 0);
  return `Rs ${Math.round(num).toLocaleString()}`;
}

// NOTE: type as PDFDocument (class), not PDFKit.PDFDocument
function rule(doc: PDFDocument, y?: number) {
  const yy = y ?? doc.y + 2;
  doc
    .moveTo(M, yy)
    .lineTo(W - M, yy)
    .lineWidth(0.6)
    .strokeColor("#E5E7EB")
    .stroke();
}

function kvRow(
  doc: PDFDocument,
  key: string,
  value: string,
  keyStyle: { bold?: boolean } = {},
  valueStyle: { bold?: boolean } = {}
) {
  const left = M;
  const right = W - M;
  const half = (right - left) / 2;

  const y0 = doc.y;
  doc
    .font(keyStyle.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(10)
    .fillColor("#111827")
    .text(key, left, y0, { width: half - 4, align: "left" });
  const kHeight = doc.heightOfString(key, { width: half - 4 });

  doc
    .font(valueStyle.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(10)
    .fillColor("#111827")
    .text(value, left + half, y0, { width: half, align: "right" });
  const vHeight = doc.heightOfString(value, { width: half });

  const rowH = Math.max(kHeight, vHeight);
  doc.y = y0 + rowH + 2;
}

function loadLogo(): Buffer | undefined {
  const p1 = path.resolve(process.cwd(), "public", "images", "RalahamiLogo.png");
  const p2 = path.resolve(process.cwd(), "images", "RalahamiLogo.png");
  try { if (fs.existsSync(p1)) return fs.readFileSync(p1); } catch {}
  try { if (fs.existsSync(p2)) return fs.readFileSync(p2); } catch {}
  return undefined;
}

/* ── Handler ── */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    const orderId = req.query.orderId as string;
    if (!orderId) return res.status(400).send("orderId required");

    // typed queries
    let doc = await Orders.findOne({ orderId } as FilterQuery<IOnlineOrder>);
    if (!doc) doc = await Orders.findById(orderId);
    if (!doc) return res.status(404).send("Order not found");

    // parse items/customer
    let items: Array<{ name: string; qty: number; unitPrice: number; lineTotal: number }> = [];
    let customer: { name?: string; phone?: string } | undefined;
    try {
      if (doc.note) {
        const j = JSON.parse(doc.note);
        if (j?.items) items = j.items;
        else if (j?.order?.items) items = j.order.items;
        customer = j?.customer || j?.order?.customer;
      }
    } catch {}

    const subTotal = items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
    const totalPaid = Math.max(subTotal, Number(doc.revenue) || 0);
    const displayId = String(doc.orderId || doc._id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${displayId.replace(/\W+/g, "-")}.pdf"`
    );

    const pdf = new PDFDocument({
      size: [W, 900],
      margin: M,
      info: { Title: `Receipt – ${displayId}`, Author: STORE_NAME },
    });
    pdf.pipe(res);

    // Header & logo
    const logo = loadLogo();
    if (logo) {
      const logoW = 90;
      const x = (W - logoW) / 2;
      pdf.image(logo, x, pdf.y, { width: logoW });
      pdf.moveDown(0.3);
    }

    pdf
      .font("Helvetica-Bold").fontSize(12).fillColor("#111827")
      .text(STORE_NAME, { align: "center" })
      .font("Helvetica").fontSize(9).fillColor("#4B5563")
      .text(STORE_ADDR_1, { align: "center" })
      .text(STORE_ADDR_2, { align: "center" })
      .text(`Tel: ${STORE_PHONE}`, { align: "center" })
      .text(STORE_EMAIL, { align: "center" });

    rule(pdf);
    pdf.moveDown(0.3);

    // Meta
    kvRow(pdf, "Order", displayId);
    kvRow(pdf, "Date", String(doc.date || new Date().toISOString().slice(0, 10)));
    if (customer?.name) kvRow(pdf, "Customer", customer.name);
    if (customer?.phone) kvRow(pdf, "Phone", customer.phone);

    pdf.moveDown(0.3);
    rule(pdf);
    pdf.moveDown(0.3);

    // Items
    pdf.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("Items", M, pdf.y);
    pdf.moveDown(0.2);

    const left = M;
    const right = W - M;
    const half = (right - left) / 2;

    items.forEach((it, i) => {
      const name = it.name || "—";
      const qty = Number(it.qty ?? 1);
      const unit = rs(it.unitPrice ?? (it.lineTotal || 0));
      const total = rs(it.lineTotal ?? 0);

      // name (wraps if long)
      pdf.font("Helvetica").fontSize(9).fillColor("#111827")
        .text(name, left, pdf.y, { width: right - left, align: "left" });

      // meta + total on next line
      const meta = `x${qty}  @  ${unit}`;
      pdf.fillColor("#6B7280").text(meta, left, pdf.y, { width: half, align: "left" });
      pdf.font("Helvetica-Bold").fillColor("#111827")
        .text(total, left + half, pdf.y - pdf.currentLineHeight(), { width: half, align: "right" });
      pdf.font("Helvetica");

      if (i < items.length - 1) {
        pdf.moveDown(0.2);
        rule(pdf, pdf.y + 2);
        pdf.moveDown(0.2);
      }
    });

    pdf.moveDown(0.5);
    rule(pdf);
    pdf.moveDown(0.3);

    // Totals
    kvRow(pdf, "Subtotal", rs(subTotal));
    rule(pdf, pdf.y + 3);
    pdf.moveDown(0.2);
    kvRow(pdf, "Total Paid", rs(totalPaid), { bold: true }, { bold: true });

    pdf.moveDown(0.8);
    pdf.font("Helvetica-Oblique").fontSize(9).fillColor("#6B7280")
      .text("Thank you for your order!", { align: "center" });

    pdf.end();
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e);
    res.status(500).send(e?.message || "PDF error");
  }
}

export const config = { api: { responseLimit: false } };
