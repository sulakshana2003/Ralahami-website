/* eslint-disable @typescript-eslint/no-explicit-any */
// /pages/api/inventory/movements/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import InventoryMovement from "../../../../models/InventoryMovement";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id },
    method,
  } = req;

  await dbConnect();

  try {
    if (method === "DELETE") {
      const deletedMovement = await InventoryMovement.findByIdAndDelete(id);
      if (!deletedMovement) return res.status(404).json({ message: "Movement not found" });
      return res.json({ message: "Movement deleted successfully" });
    }
    if (method === "PUT") {
      const { qty } = req.body;

      if (qty == null || qty < 0) return res.status(400).json({ message: "Quantity must be >= 0" });

      const updatedMovement = await InventoryMovement.findByIdAndUpdate(
        id,
        { qty },
        { new: true }
      );

      if (!updatedMovement) return res.status(404).json({ message: "Movement not found" });

      return res.json(updatedMovement);
    }

    res.setHeader("Allow", "DELETE");
    return res.status(405).end("Method Not Allowed");

  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
}
