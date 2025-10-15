// pages/api/orders/confirm.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";         // named import (your db.ts exports dbConnect)
import OnlineOrder from "@/models/OnlineOrder";

type Item = { name: string; qty: number; unitPrice: number; lineTotal: number };
type NormalizedOrder = {
  orderId: string;
  status: string;
  revenue: number;
  cost: number;
  date: string;
  items: Item[];
  customer?: { name?: string; email?: string; phone?: string };
  fulfilment?: any;
  note?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // make sure browser/edge doesn’t cache this
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );

  const { orderId, session_id } = req.query as {
    orderId?: string;
    session_id?: string;
  };

  try {
    await dbConnect();
  } catch (e: any) {
    console.error("DB connect error:", e?.message || e);
    return res.status(500).json({ error: "Database connection failed." });
  }

  try {
    let doc = null;

    if (orderId) {
      // Try by explicit orderId or fallback to _id
      doc =
        (await OnlineOrder.findOne({ orderId })) ||
        (await OnlineOrder.findById(orderId).catch(() => null));
    } else if (session_id) {
      // Fallback: find a document whose note contains the session id
      doc = await OnlineOrder.findOne({
        note: { $regex: session_id, $options: "i" },
      });
    }

    if (!doc) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Pull status (and optional extras) from note JSON if available
    let status = "confirmed";
    let items: Item[] = [];
    let customer: NormalizedOrder["customer"] | undefined = undefined;
    let fulfilment: any = undefined;

    if (doc.note) {
      try {
        const j = JSON.parse(doc.note);
        if (typeof j?.status === "string") status = j.status;

        // Accept either a flat `items` array or `order.items`
        const rawItems = Array.isArray(j?.items)
          ? j.items
          : Array.isArray(j?.order?.items)
          ? j.order.items
          : [];
        if (rawItems.length) {
          items = rawItems.map((i: any) => ({
            name: i.name ?? String(i.title ?? "Item"),
            qty: Number(i.qty ?? i.quantity ?? 1),
            unitPrice: Number(i.unitPrice ?? i.price ?? 0),
            lineTotal: Number(i.lineTotal ?? i.total ?? (Number(i.price ?? 0) * Number(i.qty ?? 1))),
          }));
        }

        const rawCustomer = j?.customer || j?.order?.customer;
        if (rawCustomer) {
          const name =
            [rawCustomer.firstName, rawCustomer.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || rawCustomer.name;
          customer = {
            name,
            email: rawCustomer.email,
            phone: rawCustomer.phone,
          };
        }

        fulfilment = j?.order?.fulfilment ?? j?.fulfilment ?? undefined;
      } catch {
        // note was not JSON – ignore
      }
    }

    const normalized: NormalizedOrder = {
      orderId: doc.orderId || String(doc._id),
      status,
      revenue: Number(doc.revenue) || 0,
      cost: Number(doc.cost) || 0,
      date: doc.date,
      items,
      customer,
      fulfilment,
      note: doc.note || undefined,
    };

    return res.status(200).json({ order: normalized });
  } catch (e: any) {
    console.error("confirm error:", e);
    return res
      .status(500)
      .json({ error: e?.message || "Internal error" });
  }
}

// Optional (keeps the body parser on and size sane)
export const config = {
  api: {
    bodyParser: true,
  },
};
