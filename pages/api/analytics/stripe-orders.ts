import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

function getRange(req: NextApiRequest) {
  const { from, to } = req.query as { from?: string; to?: string };
  const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(new Date().toISOString().slice(0,10) + "T00:00:00.000Z");
  const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date(new Date().toISOString().slice(0,10) + "T23:59:59.999Z");
  return { start, end };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2023-10-16"  as any});
  const { start, end } = getRange(req);

  const created = {
    gte: Math.floor(start.getTime() / 1000),
    lte: Math.floor(end.getTime() / 1000),
  };

  const rows: Array<{
    id: string;
    created: number;
    amount_total: number;
    currency: string | null;
    payment_status: string;
    customer_email: string | null | undefined;
    customer_name: string | null | undefined;
  }> = [];

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
        rows.push({
          id: s.id,
          created: s.created,
          amount_total: (s.amount_total ?? 0) / 100,
          currency: s.currency ?? null,
          payment_status: s.payment_status,
          customer_email: s.customer_details?.email,
          customer_name: s.customer_details?.name,
        });
      }
    }
    hasMore = sessions.has_more;
    startingAfter = sessions.data.length ? sessions.data[sessions.data.length - 1].id : undefined;
  }

  res.status(200).json({ orders: rows });
}
