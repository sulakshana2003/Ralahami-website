import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  await dbConnect();

  if (req.method === "GET") {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const q = (req.query.q as string) || "";
    const roleParam = (req.query.role as string) || ""; // "" | "user" | "admin"

    const filter: any = q
      ? {
          $or: [
            { email: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    // role filter support
    if (roleParam === "user" || roleParam === "admin") {
      filter.role = roleParam;
    }

    const [itemsRaw, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Normalize legacy/missing values so UI shows correct status
    const items = itemsRaw.map((u: any) => {
      let active: boolean;
      if (typeof u.isActive === "string") active = u.isActive.toLowerCase() === "true";
      else if (typeof u.isActive === "number") active = u.isActive !== 0;
      else if (typeof u.isActive === "boolean") active = u.isActive;
      else active = true;
      return {
        ...u,
        isActive: active,
        loyaltyPoints: u.loyaltyPoints ?? 0,
      };
    });

    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  }

  if (req.method === "POST") {
    try {
      const {
        name,
        email,
        password,
        role = "user",
        phone,
        address,
        loyaltyPoints,
      } = req.body as {
        name: string;
        email: string;
        password: string;
        role?: "user" | "admin";
        phone?: string;
        address?: string;
        loyaltyPoints?: number;
      };

      if (!name || !email || !password) {
        return res.status(400).json({ message: "name, email, password are required" });
      }

      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ message: "Email already exists" });

      // sanitize optional strings ("" -> undefined to avoid regex validation)
      const safePhone =
        typeof phone === "string" && phone.trim() !== "" ? phone.trim() : undefined;
      const safeAddress =
        typeof address === "string" && address.trim() !== "" ? address.trim() : undefined;

      const passwordHash = await bcrypt.hash(password, 10);

      const created = await User.create({
        name,
        email,
        passwordHash,
        role,
        phone: safePhone,
        address: safeAddress,
        loyaltyPoints: Number.isFinite(loyaltyPoints as number) ? Number(loyaltyPoints) : 0,
        isActive: true, // new users are Active
      });

      return res.status(201).json({ item: created });
    } catch (err: any) {
      return res.status(400).json({ message: err?.message || "Failed to create user" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
