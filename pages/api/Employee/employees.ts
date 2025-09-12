/* eslint-disable @typescript-eslint/no-explicit-any */
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
      const { name, role, baseSalary } = req.body || {};
      if (!name || !role || baseSalary == null) return res.status(400).json({ message: "Missing fields" });
      if (baseSalary < 0) return res.status(400).json({ message: "baseSalary must be ≥ 0" });
      const e = await Employee.create({ name, role, baseSalary });
      return res.status(201).json(e);
    }

    if (req.method === "PUT") {
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ message: "Missing id" });
      if (rest.baseSalary != null && rest.baseSalary < 0) return res.status(400).json({ message: "baseSalary must be ≥ 0" });
      const updated = await Employee.findByIdAndUpdate(id, rest, { new: true });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id || typeof id !== "string") return res.status(400).json({ message: "Missing id" });
      await Employee.findByIdAndDelete(id);
      return res.json({ ok: true });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
