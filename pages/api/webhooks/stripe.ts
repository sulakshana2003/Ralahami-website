import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";
import {dbConnect} from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2023-10-16" as any });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err: any) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Require a truly paid session
    if (session.payment_status !== "paid") {
      console.log("Session completed but not paid yet:", session.id, session.payment_status);
      return res.json({ ignored: true });
    }

    const revenue = (session.amount_total ?? 0) / 100;
    const draftId =
      (session.client_reference_id as string | undefined) ||
      (session.metadata && (session.metadata as any).draftId);

    const orderId = (session.payment_intent as string) || session.id;

    try {
      await dbConnect();

      if (draftId) {
        const updated = await OnlineOrder.findByIdAndUpdate(
          draftId,
          {
            revenue,
            cost: Math.round(revenue * 0.6),
            orderId,
            note: JSON.stringify({
              status: "paid",
              checkoutSessionId: session.id,
              paymentIntentId: session.payment_intent,
              customer_email: session.customer_details?.email,
            }),
          },
          { new: true }
        );

        console.log("Updated draft", draftId, "->", updated?.revenue, updated?.orderId);
      } else {
        // Fallback: create if no draft was attached (shouldn't happen if step #1 is done)
        await OnlineOrder.create({
          date: new Date().toISOString().slice(0, 10),
          orderId,
          revenue,
          cost: Math.round(revenue * 0.6),
          note: JSON.stringify({
            status: "paid",
            checkoutSessionId: session.id,
            paymentIntentId: session.payment_intent,
            customer_email: session.customer_details?.email,
            warning: "No draftId present; created by webhook",
          }),
        });
        console.warn("Created order without draftId for session", session.id);
      }
    } catch (e) {
      console.error("DB update error on webhook:", e);
      // Optionally return 500 to have Stripe retry
    }
  }

  res.json({ received: true });
}
