import type { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();
    const { order } = req.body;

    const doc = await OnlineOrder.create({
      date: new Date().toISOString().slice(0, 10),
      orderId: undefined,
      revenue: 0,
      cost: 0,
      note: JSON.stringify({ status: "pending", source: "stripe", order }),
    });

    res.status(200).json({ draftId: String(doc._id) });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create draft" });
  }
}
