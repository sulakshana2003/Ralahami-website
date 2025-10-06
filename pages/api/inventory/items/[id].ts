/* eslint-disable @typescript-eslint/no-explicit-any */
// /pages/api/inventory/items/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import InventoryItem from "../../../../models/InventoryItem"; // Adjust based on your model's path

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query: { id }, method } = req; // Access the `id` from the URL (e.g., `/api/inventory/items/{id}`)

  await dbConnect();

  try {
    // Handle GET request to fetch an item by ID
    if (method === "GET") {
      const item = await InventoryItem.findById(id).lean(); // Find the item by ID
      if (!item) return res.status(404).json({ message: "Item not found" });
      return res.json(item);
    }

    // Handle PUT request to update an item by ID
    if (method === "PUT") {
      const { stockQty, unitCost, reorderLevel } = req.body;

      // Ensure stockQty, unitCost, and reorderLevel are valid
      if (stockQty != null && stockQty < 0) return res.status(400).json({ message: "stockQty must be ≥ 0" });
      if (unitCost != null && unitCost < 0) return res.status(400).json({ message: "unitCost must be ≥ 0" });
      if (reorderLevel != null && reorderLevel < 0) return res.status(400).json({ message: "reorderLevel must be ≥ 0" });

      // Update the item by ID
      const updatedItem = await InventoryItem.findByIdAndUpdate(id, req.body, { new: true });

      if (!updatedItem) return res.status(404).json({ message: "Item not found" });

      return res.json(updatedItem);
    }

    // Handle DELETE request to delete an item by ID
    if (method === "DELETE") {
      const deletedItem = await InventoryItem.findByIdAndDelete(id);
      if (!deletedItem) return res.status(404).json({ message: "Item not found" });
      return res.json({ message: "Item deleted successfully" });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).end("Method Not Allowed");

  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Server error" });
  }
}
