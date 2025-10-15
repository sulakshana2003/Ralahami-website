/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db"; // your MongoDB connect util
import Product from "@/models/Product";
import type { Model } from "mongoose"; // ✅ minimal addition

// ✅ Cast to a typed Mongoose Model so .find/.select/.lean are recognized by TS
const ProductModel = Product as unknown as Model<any>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  try {
    const products = await ProductModel.find({ isSignatureToday: true, isAvailable: true })
      .select("name slug images price promotion")
      .lean();

    // Compute finalPrice manually if needed
    const withFinal = products.map((p: any) => ({
      ...p,
      finalPrice: Math.max(p.price - (p.promotion || 0), 0),
    }));

    res.status(200).json(withFinal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
