import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for password reset
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  // Read the token from the query string. If it's an array (Next.js can parse repeated params),
  // take the first value; otherwise use the string directly.
  const raw = req.query.token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  // Extract the new password from the request body (with a type hint)
  const { password } = (req.body ?? {}) as { password?: string };

  // Basic validations for token and password presence/types
  if (!token || typeof token !== "string") return res.status(400).json({ message: "Token is required." });
  if (!password || typeof password !== "string") return res.status(400).json({ message: "Password is required." });

  // Enforce a minimum password length (8 chars)
  if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

  // Ensure database connection is established
  await dbConnect();

  // Find the user with the matching reset token
  const user = await User.findOne({ resetToken: token });
  if (!user) return res.status(400).json({ message: "Invalid or expired token." });

  // Verify that the token has not expired (resetTokenExpiry is a Date)
  if (!user.resetTokenExpiry || user.resetTokenExpiry.getTime() < Date.now()) {
    return res.status(400).json({ message: "Token has expired." });
  }

  // Hash the new password and update the user
  user.passwordHash = await bcrypt.hash(password, 10);

  // Invalidate the token so it can't be reused
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;


  await user.save();

 
  return res.status(200).json({ message: "Password reset successful." });
}
