// pages/api/alerts/low-stock.ts
import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

type Item = {
  _id: string;
  name: string;
  unit: string;
  stockQty: number;
  reorderLevel: number;
  unitCost: number;
};

type ReqBody = {
  items: Item[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const { items } = (req.body ?? {}) as ReqBody;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items to alert." });
    }

    const to = process.env.ALERT_TO_EMAIL || "sulakshana.asus@gmail.com";
    const user = process.env.EMAIL_USERNAME;
    const pass = process.env.EMAIL_PASSWORD;

    if (!user || !pass) {
      return res.status(500).json({ message: "Email credentials not configured." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass, // should be an App Password for Gmail
      },
    });

    const subject = `Low Stock Alert (${items.length} item${items.length > 1 ? "s" : ""})`;
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;">
        <h2 style="margin:0 0 12px">Low Stock Alerts</h2>
        <p>The following item(s) are at or below the reorder level:</p>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse; font-size:14px;">
          <thead>
            <tr>
              <th align="left">Item</th>
              <th align="right">Stock</th>
              <th align="right">Reorder ≤</th>
              <th align="right">Unit</th>
              <th align="right">Unit Cost (LKR)</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (i) => `
              <tr>
                <td>${escapeHtml(i.name)}</td>
                <td align="right">${i.stockQty}</td>
                <td align="right">${i.reorderLevel}</td>
                <td align="right">${escapeHtml(i.unit)}</td>
                <td align="right">${Number(i.unitCost).toFixed(2)}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
        <p style="margin-top:12px; color:#555">This email was sent automatically by the inventory system.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Inventory Alerts" <${user}>`,
      to,
      subject,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Low-stock email error:", err);
    return res.status(500).json({ message: "Failed to send low-stock email." });
  }
}

// simple HTML escaper
function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
