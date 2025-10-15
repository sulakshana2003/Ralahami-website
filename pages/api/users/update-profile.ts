import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    console.log("Incoming request to /api/user/update-profile");

    // --- Get authenticated session ---
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await dbConnect();

    const { name, phone, address } = req.body;

    // --- Validate name ---
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    // --- Validate phone (optional) ---
    if (phone && phone.trim().length > 0) {
      // ✅ Accept +94 7XXXXXXXX or +947XXXXXXXX
      const phoneRegex = /^\+94\s?7\d{8}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          message: "Phone number must be in +94 7XXXXXXXX format",
        });
      }
    }

    // --- Prepare update data ---
    const updateData: any = { name: name.trim() };
    if (phone && phone.trim().length > 0) updateData.phone = phone.trim();
    if (address && address.trim().length > 0) updateData.address = address.trim();

    // --- Update user in DB ---
    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      updateData,
      { new: true, runValidators: true }
    ).select("-passwordHash -resetToken -resetTokenExpiry");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // --- Success response ---
    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update profile",
    });
  }
}
