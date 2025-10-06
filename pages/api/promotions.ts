/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import mongoose from "mongoose";

const PromotionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
    cta: { type: String, required: true, trim: true },
    link: { type: String, default: "" },
    image: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

const Promotion =
  mongoose.models.Promotion || mongoose.model("Promotion", PromotionSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  try {
    if (req.method === "GET") {
      const { includeInactive } = req.query;
      const query = includeInactive === "1" ? {} : { isActive: true };
      const promotions = await Promotion.find(query).sort({ createdAt: -1 });
      return res.status(200).json(promotions);
    }

    if (req.method === "POST") {
      const newPromotion = await Promotion.create(req.body);
      return res.status(201).json(newPromotion);
    }

    if (req.method === "PUT") {
      const { id } = req.query;
      if (!id || typeof id !== "string")
        return res.status(400).json({ message: "Missing promotion ID" });

      const updated = await Promotion.findByIdAndUpdate(id, req.body, { new: true });
      if (!updated) return res.status(404).json({ message: "Promotion not found" });

      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id || typeof id !== "string")
        return res.status(400).json({ message: "Missing promotion ID" });

      const deleted = await Promotion.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ message: "Promotion not found" });

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    console.error("❌ API Error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
}
