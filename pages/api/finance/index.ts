/* eslint-disable @typescript-eslint/no-explicit-any */
// /pages/api/finance/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";

import Employee from "@/models/Employee";
import Payroll from "@/models/Payroll";
import InventoryItem from "@/models/InventoryItem";
import InventoryMovement from "@/models/InventoryMovement";
import Product from "@/models/Product";
import Reservation from "@/models/Reservation";
import Promotion from "@/models/Promotion";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  try {
    /* =========================================================
       ======================   GET  ============================
       ========================================================= */
    if (req.method === "GET") {
      const { from, to } = req.query;

      // 1️⃣ Online orders mock (if you have an Orders model, replace this)
      const orders: any[] = []; // Replace with await Order.find({date: {$gte: from, $lte: to}})

      // 2️⃣ Reservations
      const reservations = await Reservation.find({
        date: { $gte: from, $lte: to },
        paymentStatus: { $in: ["paid", "pending"] },
      }).lean();

      // 3️⃣ Payroll
      const payrolls = await Payroll.find({
        date: { $gte: from, $lte: to },
      }).lean();

      // 4️⃣ Inventory
      const inventoryItems = await InventoryItem.find().lean();
      const inventoryMoves = await InventoryMovement.find({
        date: { $gte: from, $lte: to },
      }).lean();

      // 5️⃣ Employees & Products
      const employees = await Employee.find().lean();
      const products = await Product.find().lean();

      // 6️⃣ Promotions
      const promotions = await Promotion.find().sort({ createdAt: -1 }).lean();

      /* ---------- CALCULATIONS ---------- */
      const reservationRevenue = reservations.reduce((sum, r) => sum + (r.amount || 0), 0);

      const payrollOutflow = payrolls.reduce((sum, p) => {
        if (p.type === "deduction") return sum - p.amount;
        return sum + p.amount;
      }, 0);

      const inventoryPurchases = inventoryMoves
        .filter((m) => m.type === "purchase")
        .reduce((sum, m) => sum + (m.qty || 0) * (m.unitCost || 0), 0);

      const onlineRevenue = orders.reduce((sum, o) => sum + (o.revenue || 0), 0);
      const onlineCost = orders.reduce((sum, o) => sum + (o.cost || 0), 0);

      const onlineProfit = onlineRevenue - onlineCost;
      const netProfit =
        onlineProfit + reservationRevenue - payrollOutflow - inventoryPurchases;

      return res.json({
        summary: {
          online: { revenue: onlineRevenue, profit: onlineProfit },
          reservations: { revenue: reservationRevenue },
          payroll: { outflow: payrollOutflow },
          inventory: { purchases: inventoryPurchases },
          netProfit,
        },
        data: {
          orders,
          reservations,
          employees,
          payrolls,
          inventoryItems,
          inventoryMoves,
          products,
          promotions,
        },
      });
    }

    /* =========================================================
       ======================   POST  ===========================
       ========================================================= */
    // Add new online order
    if (req.method === "POST" && req.query.action === "order") {
      const body = req.body;
      // You can create an Order model later, for now mock response:
      return res.json({ success: true, order: body });
    }

    // Add new product
    if (req.method === "POST" && req.query.action === "product") {
      const { name, slug, price, stock, category, isAvailable } = req.body;
      const product = await Product.create({
        name,
        slug,
        price,
        stock,
        category,
        isAvailable,
      });
      return res.json(product);
    }

    // Add new promotion
    if (req.method === "POST" && req.query.action === "promotion") {
      const promo = await Promotion.create(req.body);
      return res.json(promo);
    }

    /* =========================================================
       =====================   PATCH  ===========================
       ========================================================= */
    if (req.method === "PATCH" && req.query.action === "promotion") {
      const { id } = req.query;
      const updated = await Promotion.findByIdAndUpdate(id, req.body, { new: true });
      return res.json(updated);
    }

    /* =========================================================
       ====================   DELETE  ===========================
       ========================================================= */
    if (req.method === "DELETE" && req.query.action === "product") {
      const { id } = req.query;
      await Product.findByIdAndDelete(id);
      return res.json({ success: true });
    }

    if (req.method === "DELETE" && req.query.action === "promotion") {
      const { id } = req.query;
      await Promotion.findByIdAndDelete(id);
      return res.json({ success: true });
    }

    /* ========================================================= */
    res.status(405).json({ message: "Method Not Allowed or missing ?action param" });
  } catch (err: any) {
    console.error("Finance API error:", err);
    res.status(500).json({ error: err.message });
  }
}
