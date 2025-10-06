import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import {dbConnect} from "../../lib/db";
import OnlineOrder from "../../models/OnlineOrder";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any,
});

export const config = {
  api: {
    bodyParser: false, // ❗ Stripe requires raw body for signature verification
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;
  try {
    const buf = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Only handle successful checkout
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      await dbConnect();

      const orderId = `ORD-${Date.now()}`;
      await OnlineOrder.create({
        date: new Date().toISOString().slice(0, 10),
        orderId,
        revenue: session.amount_total ? session.amount_total / 100 : 0,
        cost: 0, // you can calculate later
        note: `Stripe Payment — ${session.payment_intent}`,
      });

      console.log("✅ Order saved:", orderId);
    } catch (dbErr) {
      console.error("DB save error:", dbErr);
      return res.status(500).json({ error: "Failed to save order" });
    }
  }

  res.json({ received: true });
}
