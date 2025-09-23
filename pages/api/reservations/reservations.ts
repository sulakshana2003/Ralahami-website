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
    // ------------------ GET: List / Filter ------------------
    if (req.method === "GET") {
      const { date, status, name, partySize } = req.query;
      const q: any = {};

      // filter by date (exact)
      if (date) q.date = date;

      // filter by status
      if (status) q.status = status;

      // NEW: case-insensitive name filter (partial match)
      if (name) q.name = { $regex: name as string, $options: "i" };

      // NEW: filter by party size (exact number or min)
      if (partySize) {
        const size = Number(partySize);
        if (!isNaN(size)) q.partySize = size;
      }

      const reservations = await Reservation.find(q).sort({ date: 1, slot: 1 });
      return res.json(reservations);
    }

    // ------------------ POST: Create ------------------
    if (req.method === "POST") {
      const body = req.body;
      if (!body.name || !body.email || !body.date || !body.slot || !body.partySize) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const r = await Reservation.create(body);
      return res.status(201).json(r);
    }

    // ------------------ PUT: Update ------------------
    if (req.method === "PUT") {
      const { id, ...rest } = req.body;
      if (!id) return res.status(400).json({ message: "Missing reservation id" });

      /**
       * rest can include:
       * - status (Confirmed / Pending / Cancelled)
       * - payment info: { paymentStatus, amount, method }
       * - or any other updatable fields
       */
      const updated = await Reservation.findByIdAndUpdate(id, rest, {
        new: true,
      });

      return res.json(updated);
    }

    // ------------------ DELETE: Remove ------------------
    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id || typeof id !== "string")
        return res.status(400).json({ message: "Missing id" });
      await Reservation.findByIdAndDelete(id);
      return res.json({ ok: true });
    }

    // ------------------ Method Not Allowed ------------------
    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
