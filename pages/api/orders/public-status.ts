// pages/api/orders/public-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

// ↓ add these two type imports
import type { Model, FilterQuery } from "mongoose";
import type { IOnlineOrder } from "@/models/OnlineOrder";

// ↓ non-breaking typed alias for your model
const Orders = OnlineOrder as unknown as Model<IOnlineOrder>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { orderId } = req.query;
    if (!orderId || typeof orderId !== "string") {
      return res.status(400).json({ error: "orderId is required" });
    }

    // ↓ use the typed alias + typed filter to satisfy TS overloads
    const doc = await Orders.findOne({ orderId } as FilterQuery<IOnlineOrder>);
    if (!doc) return res.status(404).json({ error: "Order not found" });

    let status = "confirmed";
    try {
      if (doc.note) {
        const j = JSON.parse(doc.note);
        if (j?.status) status = String(j.status);
      }
    } catch {
      /* ignore bad JSON */
    }

    return res.status(200).json({
      orderId,
      status,
      revenue: doc.revenue,
      cost: doc.cost,
      date: doc.date,
    });
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e);
    return res.status(500).json({ error: e?.message || "Failed to load order status" });
  }
}
