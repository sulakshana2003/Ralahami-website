/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  images: z.array(z.string().url().or(z.string().startsWith('/'))).optional(),
  price: z.number().min(0).optional(),
  promotion: z.number().min(0).optional(),
  category: z.string().optional(),
  spicyLevel: z.number().min(0).max(3).optional(),
  isAvailable: z.boolean().optional(),
  isSignatureToday: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const slug = String(req.query.slug);

  const prod = await Product.findOne({ slug });
  if (!prod) return res.status(404).json({ message: "Not found" });

  if (req.method === "PUT") {
    try {
      const body = updateSchema.parse(req.body);

      // enforce signature cap if toggled on
      if (typeof body.isSignatureToday === "boolean" && body.isSignatureToday !== prod.isSignatureToday) {
        if (body.isSignatureToday) {
          const count = await Product.countDocuments({ isSignatureToday: true, _id: { $ne: prod._id } });
          if (count >= 4) {
            return res.status(400).json({ message: "Signature dishes today limit reached (4)." });
          }
        }
      }

      Object.assign(prod, body);
      await prod.save();

      return res.status(200).json(prod);
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  }

  if (req.method === "DELETE") {
    await prod.deleteOne();
    return res.status(204).end();
  }

  res.setHeader("Allow", "PUT, DELETE");
  return res.status(405).end("Method Not Allowed");
}
