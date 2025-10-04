/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";  // ✅ use your shared connection
import mongoose from "mongoose";

// ----------- Promotion Model -----------
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

// ✅ Reuse model if already compiled
const Promotion =
  mongoose.models.Promotion || mongoose.model("Promotion", PromotionSchema);

// ----------- API Handler -----------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect(); // ✅ use your lib/db.ts

    switch (req.method) {
      case "GET":
        try {
          const promotions = await Promotion.find({ isActive: true }).sort({ createdAt: -1 });
          res.status(200).json(promotions);
        } catch (err: any) {
          console.error("❌ Error fetching promotions:", err);
          res.status(500).json({ error: "Failed to fetch promotions", details: err.message });
        }
        break;

      case "POST":
        try {
          const promotion = new Promotion(req.body);
          await promotion.save();
          res.status(201).json(promotion);
        } catch (err: any) {
          console.error("❌ Error creating promotion:", err);
          res.status(400).json({ error: "Failed to create promotion", details: err.message });
        }
        break;

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err: any) {
    console.error("❌ Database connection failed:", err);
    res.status(500).json({ error: "Database connection failed", details: err.message });
  }
}
