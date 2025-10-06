import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2023-10-16" as any });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { items, charges, draftId } = req.body;

    const line_items = (items || []).map((item: any) => ({
      price_data: {
        currency: "lkr",
        product_data: { name: item.name }, // avoid long image URLs
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
      quantity: Number(item.qty),
    }));

    const base = process.env.HOST_URL!.replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      client_reference_id: draftId,            // <-- attaches the draft
      metadata: { draftId, totalLKR: String(charges?.total ?? 0) },
      success_url: `${base}/checkout/success?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout/cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to create session" });
  }
}
