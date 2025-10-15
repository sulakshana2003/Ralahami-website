// pages/api/orders/save-contact.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose from "mongoose";
import OnlineOrder from "@/models/OnlineOrder";

async function dbConnect() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { orderId, email } = (req.body ?? {}) as { orderId?: string; email?: string };

  if (!orderId || !email) return res.status(400).json({ error: "orderId and email are required" });

  try {
    await dbConnect();

    const doc = await OnlineOrder.findOne({ $or: [{ orderId }, { _id: orderId }] });
    if (!doc) return res.status(404).json({ error: "Order not found" });

    // merge into note
    let note: any = {};
    try { note = doc.note ? JSON.parse(doc.note) : {}; } catch {}
    note.customer = { ...(note.customer || {}), email };

    await OnlineOrder.updateOne(
      { _id: doc._id },
      {
        $set: {
          note: JSON.stringify(note),
          customerEmail: email, // flat field for fast lookups
        },
      }
    );

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[save-contact] error:", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
