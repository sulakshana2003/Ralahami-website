import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const raw = req.query.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  const { password } = (req.body ?? {}) as { password?: string };

  if (!token || typeof token !== "string") return res.status(400).json({ message: "Token is required." });
  if (!password || typeof password !== "string") return res.status(400).json({ message: "Password is required." });
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

  await dbConnect();

  const user = await User.findOne({ resetToken: token });
  if (!user) return res.status(400).json({ message: "Invalid or expired token." });

  if (!user.resetTokenExpiry || user.resetTokenExpiry.getTime() < Date.now()) {
    return res.status(400).json({ message: "Token has expired." });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return res.status(200).json({ message: "Password reset successful." });
}
