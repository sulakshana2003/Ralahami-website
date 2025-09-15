/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  try {
    if (req.method === "GET") {
      const { from, to } = req.query as { from?: string; to?: string };
      const q: any = {};
      if (from && to) q.date = { $gte: from, $lte: to };
      const list = await OnlineOrder.find(q)
        .sort({ date: -1, createdAt: -1 })
        .lean();
      return res.json(list);
    }

    if (req.method === "POST") {
      const { date, orderId, revenue, cost, note } = req.body || {};
      if (!date || revenue == null || cost == null)
        return res.status(400).json({ message: "Missing fields" });
      if (revenue < 0 || cost < 0)
        return res.status(400).json({ message: "Numbers must be ≥ 0" });
      const row = await OnlineOrder.create({
        date,
        orderId,
        revenue,
        cost,
        note,
      });
      return res.status(201).json(row);
    }

    if (req.method === "PUT") {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ message: "Missing id" });
      const updated = await OnlineOrder.findByIdAndUpdate(id, rest, {
        new: true,
      });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id || typeof id !== "string")
        return res.status(400).json({ message: "Missing id" });
      await OnlineOrder.findByIdAndDelete(id);
      return res.json({ ok: true });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
