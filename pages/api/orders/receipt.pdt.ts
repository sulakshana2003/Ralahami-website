// pages/api/orders/receipt.pdf.ts
/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from "next";
import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import mongoose, { type Model, type FilterQuery } from "mongoose";
import OnlineOrder from "@/models/OnlineOrder";
import type { IOnlineOrder } from "@/models/OnlineOrder";
import fs from "fs";
import path from "path";

/* ────────────────── DB ────────────────── */
async function dbConnect() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI as string);
}
const Orders = OnlineOrder as unknown as Model<IOnlineOrder>;

/* ───────────────── Store Meta ──────────── */
const STORE_NAME   = process.env.STORE_NAME   || "Ralahami.lk";
const STORE_PHONE  = process.env.STORE_PHONE  || "+94 70 000 0000";
const STORE_EMAIL  = process.env.STORE_EMAIL  || "support@ralahami.lk";
const STORE_ADDR_1 = process.env.STORE_ADDR_1 || "No. 123, Sample Road";
const STORE_ADDR_2 = process.env.STORE_ADDR_2 || "Colombo, Sri Lanka";
const STORE_URL    = process.env.HOST_URL     || "https://ralahami.lk";

/* ───────────── Thermal Page Setup ──────── */
const PAGE_W = 226;   // ~80mm paper width in pt
const M      = 14;    // margin

/* ───────────────── Helpers ─────────────── */
const rs = (n: number | string | undefined | null) => {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return `Rs ${Math.round(v).toLocaleString()}`;
};

function loadLogo(): Buffer | undefined {
  const p1 = path.resolve(process.cwd(), "public", "images", "RalahamiLogo.png");
  const p2 = path.resolve(process.cwd(), "images", "RalahamiLogo.png");
  try { if (fs.existsSync(p1)) return fs.readFileSync(p1); } catch {}
  try { if (fs.existsSync(p2)) return fs.readFileSync(p2); } catch {}
  return undefined;
}

function hRule(doc: PDFKit.PDFDocument, y?: number, color = "#E5E7EB") {
  const yy = y ?? doc.y + 2;
  doc.moveTo(M, yy).lineTo(PAGE_W - M, yy).lineWidth(0.7).strokeColor(color).stroke();
}

function sectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0F172A").text(text, M, doc.y);
  hRule(doc, doc.y + 3);
  doc.moveDown(0.8);
}

function kv(doc: PDFKit.PDFDocument, left: string, right: string, boldRight = false) {
  const innerW = PAGE_W - M * 2;
  const leftW = Math.floor(innerW * 0.45);
  const rightW = innerW - leftW;

  const y0 = doc.y;
  doc.font("Helvetica").fontSize(9).fillColor("#334155")
     .text(left, M, y0, { width: leftW, align: "left" });

  const kH = doc.heightOfString(left, { width: leftW });
  doc.font(boldRight ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor("#0F172A")
     .text(right, M + leftW, y0, { width: rightW, align: "right" });
  const vH = doc.heightOfString(right, { width: rightW });

  doc.y = y0 + Math.max(kH, vH) + 2;
}

type TableCol = {
  key: string;
  header: string;
  width: number;     // px
  align?: "left" | "right" | "center";
  bold?: boolean;
  color?: string;
};

function drawTableHeader(doc: PDFKit.PDFDocument, cols: TableCol[]) {
  const startX = M;
  let x = startX;
  const y = doc.y;

  doc.rect(M, y - 2, PAGE_W - M * 2, 16).fillOpacity(1).fill("#F1F5F9").fillOpacity(1);
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(9);

  cols.forEach(col => {
    doc.text(col.header, x + 2, y, {
      width: col.width - 4,
      align: col.align ?? "left",
      continued: false
    });
    x += col.width;
  });

  doc.y = y + 16;
  hRule(doc, doc.y, "#CBD5E1");
  doc.moveDown(0.2);
}

function drawTableRow(doc: PDFKit.PDFDocument, cols: TableCol[], row: Record<string, any>) {
  const startX = M;
  let x = startX;
  const y = doc.y;

  cols.forEach((col, i) => {
    const value = String(row[col.key] ?? "");
    doc.font(col.bold ? "Helvetica-Bold" : "Helvetica")
       .fontSize(9)
       .fillColor(col.color || "#0F172A")
       .text(value, x + 2, y, { width: col.width - 4, align: col.align ?? "left" });
    x += col.width;
  });

  doc.y = y + Math.max(14, doc.currentLineHeight()) + 2;
}

function ensureSpace(doc: PDFKit.PDFDocument, need = 60) {
  const innerH = 900; // our page height
  if (doc.y + need > innerH - M) {
    doc.addPage({ size: [PAGE_W, 900], margin: M });
    doc.y = M;
  }
}

/* ─────────────── Handler ──────────────── */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    const orderId = (req.query.orderId as string) || "";
    if (!orderId) return res.status(400).send("orderId required");

    // try orderId then _id for convenience
    let row = await Orders.findOne({ orderId } as FilterQuery<IOnlineOrder>);
    if (!row) row = await Orders.findById(orderId);
    if (!row) return res.status(404).send("Order not found");

    // Extract items & customer from note JSON (supports both shapes you’ve used)
    let items: Array<{ name: string; qty: number; unitPrice: number; lineTotal: number }> = [];
    let customer: { name?: string; phone?: string; email?: string } | undefined;
    try {
      if (row.note) {
        const n = JSON.parse(row.note);
        items = n?.order?.items || n?.items || [];
        customer = n?.order?.customer || n?.customer || undefined;
      }
    } catch {}

    const displayId = String(row.orderId || row._id);
    const subTotal = items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
    const totalPaid = Math.max(subTotal, Number(row.revenue) || 0);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${displayId.replace(/\W+/g, "-")}.pdf"`);

    const pdf = new PDFDocument({
      size: [PAGE_W, 900],
      margin: M,
      info: { Title: `Receipt – ${displayId}`, Author: STORE_NAME },
    });

    pdf.pipe(res);

    /* ───── Brand Header ───── */
    const logo = loadLogo();
    if (logo) {
      const lw = 88;
      const x = (PAGE_W - lw) / 2;
      pdf.image(logo, x, pdf.y, { width: lw });
      pdf.moveDown(0.3);
    }

    pdf.font("Helvetica-Bold").fontSize(12).fillColor("#0F172A").text(STORE_NAME, { align: "center" });
    pdf.font("Helvetica").fontSize(9).fillColor("#475569")
       .text(STORE_ADDR_1, { align: "center" })
       .text(STORE_ADDR_2, { align: "center" })
       .text(`Tel: ${STORE_PHONE}`, { align: "center" })
       .text(STORE_EMAIL, { align: "center" })
       .text(STORE_URL, { align: "center" });

    pdf.moveDown(0.3);
    hRule(pdf);

    /* ───── Order Meta ───── */
    pdf.moveDown(0.6);
    sectionTitle(pdf, "Receipt");

    kv(pdf, "Order No.", displayId, true);
    kv(pdf, "Date", String(row.date || new Date().toISOString().slice(0, 10)));
    if (customer?.name)  kv(pdf, "Customer", customer.name);
    if (customer?.phone) kv(pdf, "Phone", customer.phone);
    if (customer?.email) kv(pdf, "Email", customer.email);

    pdf.moveDown(0.4);

    /* ───── Items Table ───── */
    sectionTitle(pdf, "Items");

    const innerW = PAGE_W - M * 2;
    // smart widths for narrow paper
    const cols: TableCol[] = [
      { key: "name",   header: "Item",  width: Math.floor(innerW * 0.48), align: "left" },
      { key: "qty",    header: "Qty",   width: Math.floor(innerW * 0.16), align: "center", color: "#334155" },
      { key: "price",  header: "Price", width: Math.floor(innerW * 0.18), align: "right",  color: "#334155" },
      { key: "total",  header: "Total", width: innerW - Math.floor(innerW * 0.48) - Math.floor(innerW * 0.16) - Math.floor(innerW * 0.18), align: "right", bold: true },
    ];

    drawTableHeader(pdf, cols);

    if (items.length === 0) {
      drawTableRow(pdf, cols, { name: "—", qty: "", price: "", total: "" });
    } else {
      items.forEach((it, idx) => {
        ensureSpace(pdf, 28);
        drawTableRow(pdf, cols, {
          name: String(it.name || "—"),
          qty: String(it.qty ?? 1),
          price: rs(it.unitPrice ?? (it.lineTotal || 0)),
          total: rs(it.lineTotal ?? (Number(it.unitPrice) || 0) * (Number(it.qty) || 1)),
        });
        if (idx < items.length - 1) hRule(pdf, pdf.y, "#EEF2F7");
      });
    }

    pdf.moveDown(0.5);

    /* ───── Totals Box ───── */
    ensureSpace(pdf, 70);
    sectionTitle(pdf, "Payment");

    kv(pdf, "Subtotal", rs(subTotal));
    hRule(pdf, pdf.y + 2, "#E2E8F0");
    pdf.moveDown(0.4);
    kv(pdf, "Total Paid", rs(totalPaid), true);

    pdf.moveDown(0.8);
    pdf.font("Helvetica-Oblique").fontSize(9).fillColor("#64748B")
       .text("Thank you for your order! Keep this receipt for your records.", { align: "center" });

    /* ───── Footer ───── */
    ensureSpace(pdf, 50);
    pdf.moveDown(0.8);
    hRule(pdf);
    pdf.font("Helvetica").fontSize(8).fillColor("#94A3B8")
       .text("This receipt is computer generated and valid without signature.", { align: "center" })
       .moveDown(0.1)
       .text("For support, contact us at the email above.", { align: "center" });

    pdf.end();
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e?.message || "PDF error");
  }
}

export const config = { api: { responseLimit: false } };
