import { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

// Set up the nodemailer transport with environment variables
const transporter = nodemailer.createTransport({
  service: "Gmail", // Or another email provider
  auth: {
    user: process.env.EMAIL_USERNAME,   
    pass: process.env.EMAIL_PASSWORD,   
  },
});

async function sendResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,  // Sender's email
    to: email,                         // Recipient's email
    subject: "Password Reset Request", // Email subject
    text: `You requested a password reset. Please click the link below to reset your password: \n\n${resetUrl}`,
  };

  await transporter.sendMail(mailOptions);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { email } = req.body;
  await dbConnect();

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 20 * 60 * 1000; // Token is valid for 20 minutes
    await user.save();

    // Send the reset email
    await sendResetEmail(email, resetToken);

    return res.status(200).json({ message: "Reset email sent." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error sending reset email." });
  }
}
