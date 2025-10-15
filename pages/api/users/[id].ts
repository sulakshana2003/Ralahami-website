/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const { id } = req.query;

  if (req.method === "PATCH") {
    try {
      const {
        role,
        isActive, // may be boolean or string
        name,
        phone,
        address,
        loyaltyPoints,
        newPassword,
      } = req.body as {
        role?: "user" | "admin";
        isActive?: boolean | string;
        name?: string;
        phone?: string;
        address?: string;
        loyaltyPoints?: number;
        newPassword?: string;
      };

      const update: any = {};

      if (role) update.role = role;

      // ✅ robust coercion: "true"/"false" or boolean
      const rawIsActive = (req.body as any).isActive;
      const parsedIsActive =
        typeof rawIsActive === "string"
          ? rawIsActive.toLowerCase() === "true"
          : typeof rawIsActive === "boolean"
          ? rawIsActive
          : undefined;
      if (typeof parsedIsActive === "boolean") update.isActive = parsedIsActive;

      if (name !== undefined) update.name = name;

      // Optional strings: allow clearing with ""
      if (phone !== undefined) {
        if (typeof phone === "string" && phone.trim() === "") {
          update.$unset = { ...(update.$unset || {}), phone: 1 };
        } else {
          update.phone = phone;
        }
      }
      if (address !== undefined) {
        if (typeof address === "string" && address.trim() === "") {
          update.$unset = { ...(update.$unset || {}), address: 1 };
        } else {
          update.address = address;
        }
      }

      if (loyaltyPoints !== undefined) update.loyaltyPoints = loyaltyPoints;

      if (newPassword) {
        update.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      const user = await User.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
        // ✅ ensures write even if an older compiled model was cached
        strict: false,
      }).lean();

      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json({ item: user });
    } catch (err: any) {
      return res.status(400).json({ message: err?.message || "Failed to update user" });
    }
  }

  if (req.method === "DELETE") {
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    return res.json({ ok: true });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
