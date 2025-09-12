/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Employee from "@/models/Employee";
import Payroll from "@/models/Payroll";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  try {
    if (req.method === "GET") {
      const { from, to } = req.query as { from?: string; to?: string };
      const q: any = {};
      if (from && to) q.date = { $gte: from, $lte: to };
      const rows = await Payroll.find(q).sort({ date: -1, createdAt: -1 }).lean();
      return res.json(rows);
    }

    if (req.method === "POST") {
      const { employeeId, type, amount, date, note } = req.body || {};
      if (!employeeId || !type || !amount || !date) return res.status(400).json({ message: "Missing fields" });
      if (amount <= 0) return res.status(400).json({ message: "amount must be > 0" });

      const emp = await Employee.findById(employeeId);
      if (!emp) return res.status(404).json({ message: "Employee not found" });

      const p = await Payroll.create({ employeeId, type, amount, date, note });
      return res.status(201).json(p);
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
