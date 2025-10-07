// pages/api/analytics/summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import {dbConnect} from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

// Helper: parse YYYY-MM-DD (local midnight to next midnight)
function getRange(req: NextApiRequest) {
  const { from, to } = req.query as { from?: string; to?: string };
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(new Date().toISOString().slice(0,10) + "T00:00:00.000Z");
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date(new Date().toISOString().slice(0,10) + "T23:59:59.999Z");
  return { start, end };
}

// Try to detect method from note string or JSON
function detectMethod(note?: string) {
  if (!note) return "";
  try {
    const j = JSON.parse(note);
    if (typeof j === "object" && j?.method) return String(j.method);
    if (j?.payment?.method) return String(j.payment.method);
  } catch {}
  const low = note.toLowerCase();
  if (low.includes("cod")) return "cod";
  if (low.includes("card_on_delivery") || low.includes("card on delivery")) return "card_on_delivery";
  return "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2023-10-16" as any });
  const { start, end } = getRange(req);

  // 1) DB: COD + Card on Delivery
  await dbConnect();
  const fromStr = start.toISOString().slice(0,10);
  const toStr = end.toISOString().slice(0,10);

  // Pull all orders in date range (inclusive)
  const dbOrders = await OnlineOrder.find({
    date: { $gte: fromStr, $lte: toStr },
  }).lean();

  let codRevenue = 0;
  let cardODRevenue = 0;
  let codCount = 0;
  let cardODCount = 0;
  let dbCost = 0;

  for (const o of dbOrders) {
    const m = detectMethod(o.note);
    if (m === "cod") {
      codRevenue += o.revenue || 0;
      dbCost += o.cost || 0;
      codCount++;
    } else if (m === "card_on_delivery") {
      cardODRevenue += o.revenue || 0;
      dbCost += o.cost || 0;
      cardODCount++;
    } else {
      // If you also store other types in DB, you can decide to include/exclude here
    }
  }

  // 2) Stripe: Online Card payments (paid sessions)
  // We'll list Checkout Sessions in the created range and sum amount_total where payment_status === 'paid'
  const created = {
    gte: Math.floor(start.getTime() / 1000),
    lte: Math.floor(end.getTime() / 1000),
  };

  let stripeRevenue = 0;
  let stripeCount = 0;

  // Stripe pagination
  let hasMore = true;
  let startingAfter: string | undefined = undefined;

  while (hasMore) {
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      created,
      starting_after: startingAfter,
    });

    for (const s of sessions.data) {
      if (s.payment_status === "paid") {
        stripeRevenue += (s.amount_total ?? 0) / 100; // amounts are in the smallest unit
        stripeCount++;
      }
    }

    hasMore = sessions.has_more;
    startingAfter = sessions.data.length ? sessions.data[sessions.data.length - 1].id : undefined;
  }

  return res.status(200).json({
    range: { from: fromStr, to: toStr },
    db: {
      cod: { revenue: codRevenue, count: codCount },
      card_on_delivery: { revenue: cardODRevenue, count: cardODCount },
      totalRevenue: codRevenue + cardODRevenue,
      totalCost: dbCost,
      grossMargin: codRevenue + cardODRevenue - dbCost,
    },
    stripe: {
      online_card: { revenue: stripeRevenue, count: stripeCount },
    },
    combined: {
      totalRevenue: codRevenue + cardODRevenue + stripeRevenue,
      orders: codCount + cardODCount + stripeCount,
    },
  });
}
