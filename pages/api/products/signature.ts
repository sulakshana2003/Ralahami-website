/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    const products = await Product.find({ isSignatureToday: true }).limit(4);

    res.status(200).json(products);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to load signature dishes" });
  }
}
