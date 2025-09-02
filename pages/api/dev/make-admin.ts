import { getServerSession } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import { authOptions } from "../auth/[...nextauth]";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  // make sure you're logged in
  if (!session?.user?.email) {
    return res.status(401).json({ message: "Login first" });
  }

  await dbConnect();

  // update the currently logged in user to admin
  await User.updateOne(
    { email: session.user.email },
    { $set: { role: "admin", isActive: true } }
  );

  res.json({ ok: true, promoted: session.user.email });
}
