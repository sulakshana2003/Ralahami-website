/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import InventoryItem from "../../../models/InventoryItem";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  try {
    if (req.method === "GET") {
      const items = await InventoryItem.find().sort({ name: 1 }).lean();
      return res.json(items);
    }

    if (req.method === "POST") {
      const { name, unit = "kg", category = "", unitCost, stockQty, reorderLevel } = req.body || {};
      if (!name || unitCost == null || stockQty == null || reorderLevel == null)
        return res.status(400).json({ message: "Missing required fields." });
      if (unitCost < 0 || stockQty < 0 || reorderLevel < 0)
        return res.status(400).json({ message: "Numeric values must be ≥ 0" });

      const item = await InventoryItem.create({ name, unit, category, unitCost, stockQty, reorderLevel });
      return res.status(201).json(item);
    }

    if (req.method === "PUT") {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ message: "Missing id" });
      if (rest.unitCost != null && rest.unitCost < 0) return res.status(400).json({ message: "unitCost ≥ 0" });
      if (rest.stockQty != null && rest.stockQty < 0) return res.status(400).json({ message: "stockQty ≥ 0" });
      if (rest.reorderLevel != null && rest.reorderLevel < 0) return res.status(400).json({ message: "reorderLevel ≥ 0" });

      const updated = await InventoryItem.findByIdAndUpdate(id, rest, { new: true });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id || typeof id !== "string") return res.status(400).json({ message: "Missing id" });
      await InventoryItem.findByIdAndDelete(id);
      return res.json({ ok: true });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
