import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Professional stub for a payment session creator (e.g., Stripe Checkout).
 * - Validate incoming data
 * - If STRIPE_SECRET_KEY is set, you can wire it to Stripe
 * - Else, respond with a helpful error (the UI will show a toast)
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const order = req.body as any;

    // Minimal validation
    if (!order || !Array.isArray(order.items) || !order.items.length) {
      return res.status(400).json({ error: "Invalid order payload." });
    }

    const hasStripe = !!process.env.STRIPE_SECRET_KEY;
    if (!hasStripe) {
      // In production, integrate Stripe (or your PSP) here.
      // For now, tell the UI there’s no gateway configured.
      return res.status(400).json({
        error: "Online payments are not configured. Please choose Cash/Card on Delivery.",
      });
    }

    // Example Stripe flow (uncomment & add `npm i stripe`):
    // import Stripe from "stripe";
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });
    // const session = await stripe.checkout.sessions.create({
    //   mode: "payment",
    //   success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    //   cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout`,
    //   line_items: order.items.map((it: any) => ({
    //     quantity: it.qty,
    //     price_data: {
    //       currency: "lkr",
    //       product_data: { name: it.name },
    //       unit_amount: Math.round(Number(it.unitPrice) * 100), // cents
    //     },
    //   })),
    //   metadata: {
    //     // you can pass order JSON here (small)
    //   },
    // });
    // return res.status(200).json({ url: session.url });

    return res.status(500).json({ error: "Payment gateway is not implemented yet." });
  } catch (err: any) {
    console.error("create-session error", err);
    return res.status(500).json({ error: "Failed to create payment session." });
  }
}
