// /pages/api/orders/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();
    const { orderId, revenue, cost, note } = req.body;

    const doc = await OnlineOrder.create({
      date: new Date().toISOString().slice(0, 10),
      orderId,
      revenue: Number(revenue) || 0,
      cost: Number(cost) || 0,
      note: typeof note === "string" ? note : JSON.stringify(note || {}),
    });

    res.status(200).json({ ok: true, id: doc._id });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create order" });
  }
}
