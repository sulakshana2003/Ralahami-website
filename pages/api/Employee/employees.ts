import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Employee from "@/models/Employee";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  try {
    if (req.method === "GET") {
      const list = await Employee.find().sort({ createdAt: -1 }).lean();
      return res.json(list);
    }

    if (req.method === "POST") {
      const body = req.body;

      // Validate required fields (optional but good practice)
      const requiredFields = [
        "name",
        "role",
        "employeeId",
        "phone",
        "email",
        "address",
        "emergencyContactName",
        "emergencyContactPhone",
        "dateOfBirth",
        "department",
        "hireDate",
        "employmentStatus",
        "payType",
        "baseSalary"
      ];

      for (const field of requiredFields) {
        if (!body[field]) {
          return res.status(400).json({ message: `${field} is required` });
        }
      }

      try {
        const e = await Employee.create(body);
        return res.status(201).json(e);
      } catch (err: any) {
        return res.status(500).json({ message: err.message });
      }
    }

    if (req.method === "PUT") {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ message: "Missing id" });
      if (rest.baseSalary != null && rest.baseSalary < 0) return res.status(400).json({ message: "baseSalary must be ≥ 0" });
      const updated = await Employee.findByIdAndUpdate(id, rest, { new: true });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      // The fix is here: Reading from `req.body` instead of `req.query`
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Missing employee id in request body" });
      }

      const deletedEmployee = await Employee.findByIdAndDelete(id);

      if (!deletedEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      return res.status(200).json({ ok: true, message: "Employee deleted successfully" });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}