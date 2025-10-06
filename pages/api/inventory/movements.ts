/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import InventoryMovement from "@/models/InventoryMovement";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  try {
    if (req.method === "GET") {
      const { from, to } = req.query as { from?: string; to?: string };
      const q: any = {};
      if (from && to) q.date = { $gte: from, $lte: to };
      const moves = await InventoryMovement.find(q).sort({ createdAt: -1 }).lean();
      return res.json(moves);
    }

    if (req.method === "POST") {
      const { itemId, type, qty, unitCost, note, date } = req.body || {};
      if (!itemId || !type || !qty || !date) return res.status(400).json({ message: "Missing required fields." });
      if (qty <= 0) return res.status(400).json({ message: "qty must be > 0" });
      if (type === "purchase" && (unitCost == null || unitCost < 0))
        return res.status(400).json({ message: "unitCost required for purchase" });

      const item = await InventoryItem.findById(itemId);
      if (!item) return res.status(404).json({ message: "Item not found" });

      // update stock + moving-average cost
      if (type === "purchase") {
        const oldValue = item.unitCost * item.stockQty;
        const addValue = (unitCost as number) * qty;
        const newQty = item.stockQty + qty;
        item.stockQty = newQty;
        item.unitCost = newQty > 0 ? (oldValue + addValue) / newQty : item.unitCost;
      } else {
        item.stockQty = Math.max(0, item.stockQty - qty);
      }
      await item.save();

      const m = await InventoryMovement.create({ itemId, type, qty, unitCost, note, date });
      return res.status(201).json(m);
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
