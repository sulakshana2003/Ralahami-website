/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Reservation from "@/models/Reservation";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  try {
    if (req.method === "GET") {
      const { date, status } = req.query;
      const q: any = {};
      if (date) q.date = date;
      if (status) q.status = status;
      const reservations = await Reservation.find(q).sort({ date: 1, slot: 1 });
      return res.json(reservations);
    }

    if (req.method === "POST") {
      const body = req.body;
      if (
        !body.name ||
        !body.email ||
        !body.date ||
        !body.slot ||
        !body.partySize
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const r = await Reservation.create(body);
      return res.status(201).json(r);
    }

    if (req.method === "PUT") {
      const { id, ...rest } = req.body;
      if (!id)
        return res.status(400).json({ message: "Missing reservation id" });
      const updated = await Reservation.findByIdAndUpdate(id, rest, {
        new: true,
      });
      return res.json(updated);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id || typeof id !== "string")
        return res.status(400).json({ message: "Missing id" });
      await Reservation.findByIdAndDelete(id);
      return res.json({ ok: true });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Server error" });
  }
}
