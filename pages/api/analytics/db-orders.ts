import type { NextApiRequest, NextApiResponse } from "next";
import {dbConnect} from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

function getRange(req: NextApiRequest) {
  const { from, to } = req.query as { from?: string; to?: string };
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(new Date().toISOString().slice(0,10) + "T00:00:00.000Z");
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date(new Date().toISOString().slice(0,10) + "T23:59:59.999Z");
  return { start, end };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { start, end } = getRange(req);
  const fromStr = start.toISOString().slice(0,10);
  const toStr = end.toISOString().slice(0,10);

  await dbConnect();
  const orders = await OnlineOrder.find({ date: { $gte: fromStr, $lte: toStr } })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ orders });
}
