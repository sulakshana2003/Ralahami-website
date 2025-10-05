import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Payroll from "@/models/Payroll"; // Ensure you have a Payroll model
import Employee from "@/models/Employee";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const { from, to } = req.query;
      const query = from && to ? { date: { $gte: from, $lte: to } } : {};
      const payrollList = await Payroll.find(query).sort({ date: -1 }).lean();
      return res.status(200).json(payrollList);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { employeeId, type, amount, date, note } = req.body;

      if (!employeeId || !type || !amount || !date) {
        return res.status(400).json({ message: "Missing required fields: employeeId, type, amount, date." });
      }

      const employeeExists = await Employee.findById(employeeId);
      if (!employeeExists) {
        return res.status(404).json({ message: "Employee not found." });
      }

      const newPayrollEntry = await Payroll.create({
        employeeId,
        type,
        amount,
        date,
        note,
      });

      return res.status(201).json(newPayrollEntry);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}