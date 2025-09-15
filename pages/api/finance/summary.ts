/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Reservation from "@/models/Reservation";
import Payroll from "@/models/Payroll";
import InventoryItem from "@/models/InventoryItem";
import InventoryMovement from "@/models/InventoryMovement";
import OnlineOrder from "@/models/OnlineOrder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to)
      return res
        .status(400)
        .json({ message: "from & to are required (YYYY-MM-DD)" });

    // Reservations: revenue = sum(amount) where paid
    const reservationsPaid = await Reservation.aggregate([
      { $match: { date: { $gte: from, $lte: to }, paymentStatus: "paid" } },
      { $group: { _id: null, revenue: { $sum: { $ifNull: ["$amount", 0] } } } },
    ]);
    const reservationRevenue = reservationsPaid[0]?.revenue || 0;

    // Online Orders
    const ordersAgg = await OnlineOrder.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$revenue" },
          cost: { $sum: "$cost" },
        },
      },
    ]);
    const onlineRevenue = ordersAgg[0]?.revenue || 0;
    const onlineCost = ordersAgg[0]?.cost || 0;
    const onlineProfit = onlineRevenue - onlineCost;

    // Payroll outflow (deduction reduces outflow)
    const payrollRows = await Payroll.find({
      date: { $gte: from, $lte: to },
    }).lean();
    const payrollOutflow = payrollRows.reduce(
      (s, p: any) => s + (p.type === "deduction" ? -1 : 1) * p.amount,
      0
    );

    // Inventory purchases & consumption cost (COGS proxy)
    const moves = await InventoryMovement.find({
      date: { $gte: from, $lte: to },
    }).lean();
    const items = await InventoryItem.find().select("_id unitCost").lean();
    const costByItem = new Map(
      items.map((i: any) => [String(i._id), i.unitCost || 0])
    );
    const invPurchaseCost = moves
      .filter((m: any) => m.type === "purchase")
      .reduce((s, m: any) => s + (m.unitCost || 0) * m.qty, 0);
    const invConsumeCost = moves
      .filter((m: any) => m.type === "consume")
      .reduce(
        (s, m: any) => s + (costByItem.get(String(m.itemId)) || 0) * m.qty,
        0
      );

    // Reservation "profit" (if you track cost per reservation, add it; here we only have revenue)
    const reservationProfit = reservationRevenue; // revenue only

    // Illustrative Net Profit
    const netProfit =
      onlineProfit + reservationProfit - payrollOutflow - invPurchaseCost;

    return res.json({
      range: { from, to },
      online: {
        revenue: onlineRevenue,
        cost: onlineCost,
        profit: onlineProfit,
      },
      reservations: { revenue: reservationRevenue, profit: reservationProfit },
      payroll: { outflow: payrollOutflow },
      inventory: { purchases: invPurchaseCost, cogsApprox: invConsumeCost },
      netProfit,
    });
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
