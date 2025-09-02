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
    const { role, isActive, name, phone, address, loyaltyPoints, newPassword } = req.body as {
      role?: "user"|"admin";
      isActive?: boolean;
      name?: string; phone?: string; address?: string; loyaltyPoints?: number;
      newPassword?: string;
    };

    const update: any = {};
    if (role) update.role = role;
    if (typeof isActive === "boolean") update.isActive = isActive;
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (address !== undefined) update.address = address;
    if (loyaltyPoints !== undefined) update.loyaltyPoints = loyaltyPoints;

    if (newPassword) {
      update.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ item: user });
  }

  if (req.method === "DELETE") {
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    return res.json({ ok: true });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
