import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

/** Make a short professional order id like OD-20250924-8F3K2Q */
function genOrderId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OD-${y}${m}${day}-${rand}`;
}

/** Get YYYY-MM-DD for Asia/Colombo */
function localDateColombo() {
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" });
  // sv-SE gives 2025-09-24
  return fmt.format(new Date());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await dbConnect();

    // Expected payload (minimal): { revenue: number, cost?: number, note?: string, orderId?: string, date?: 'YYYY-MM-DD' }
    const { revenue, cost = 0, note = "", orderId, date } = req.body || {};

    const revNum = Number(revenue);
    const costNum = Number(cost);

    if (!Number.isFinite(revNum) || revNum < 0) {
      return res.status(400).json({ error: "Invalid revenue." });
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      return res.status(400).json({ error: "Invalid cost." });
    }

    const doc = await OnlineOrder.create({
      date: typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : localDateColombo(),
      orderId: orderId || genOrderId(),
      revenue: Math.round(revNum), // store as integer LKR (optional)
      cost: Math.round(costNum),
      note: String(note || ""),
    });

    return res.status(201).json({ ok: true, order: doc });
  } catch (err: any) {
    console.error("orders/create error:", err);
    return res.status(500).json({ error: "Failed to create order." });
  }
}
