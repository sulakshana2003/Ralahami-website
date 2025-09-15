/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Reservation from "@/models/Reservation";
import Payroll from "@/models/Payroll";
import InventoryItem from "@/models/InventoryItem";
import InventoryMovement from "@/models/InventoryMovement";
import OnlineOrder from "@/models/OnlineOrder";

function* days(from: string, to: string) {
  const s = new Date(from + "T00:00:00");
  const e = new Date(to + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    yield `${d.getFullYear()}-${mm}-${dd}`;
  }
}
function csvEscape(x: any) {
  const s = String(x ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { from, to } = req.query as { from?: string; to?: string };
  if (!from || !to)
    return res.status(400).json({ message: "from & to are required" });

  // preload
  const orders = await OnlineOrder.find({
    date: { $gte: from, $lte: to },
  }).lean();
  const reservations = await Reservation.find({
    date: { $gte: from, $lte: to },
    paymentStatus: "paid",
  }).lean();
  const payroll = await Payroll.find({ date: { $gte: from, $lte: to } }).lean();
  const moves = await InventoryMovement.find({
    date: { $gte: from, $lte: to },
  }).lean();
  const items = await InventoryItem.find().select("_id unitCost").lean();
  const costByItem = new Map(
    items.map((i: any) => [String(i._id), i.unitCost || 0])
  );

  const head = [
    "Date",
    "Online Revenue",
    "Online Cost",
    "Online Profit",
    "Reservation Revenue",
    "Payroll Outflow",
    "Inventory Purchases",
    "Approx. COGS (Consumes)",
    "Net Profit (illustrative)",
  ];
  const rows = [head];

  for (const d of days(from, to)) {
    const or = orders.filter((o) => o.date === d);
    const rr = reservations.filter((r) => r.date === d);
    const pr = payroll.filter((p) => p.date === d);
    const mvPurch = moves.filter((m) => m.date === d && m.type === "purchase");
    const mvCons = moves.filter((m) => m.date === d && m.type === "consume");

    const onlineRev = or.reduce((s, x: any) => s + x.revenue, 0);
    const onlineCost = or.reduce((s, x: any) => s + x.cost, 0);
    const onlineProfit = onlineRev - onlineCost;

    const resRev = rr.reduce((s, x: any) => s + (x.amount || 0), 0);
    const payrollOut = pr.reduce(
      (s, x: any) => s + (x.type === "deduction" ? -1 : 1) * x.amount,
      0
    );
    const invPurch = mvPurch.reduce(
      (s, m: any) => s + (m.unitCost || 0) * m.qty,
      0
    );
    const cogs = mvCons.reduce(
      (s, m: any) => s + (costByItem.get(String(m.itemId)) || 0) * m.qty,
      0
    );

    const net = onlineProfit + resRev - payrollOut - invPurch;
    rows.push([
      d,
      onlineRev.toString(),
      onlineCost.toString(),
      onlineProfit.toString(),
      resRev.toString(),
      payrollOut.toString(),
      invPurch.toString(),
      cogs.toString(),
      net.toString(),
    ]);
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="finance_${from}_to_${to}.csv"`
  );
  res.send(csv);
}
