// /pages/api/checkout_sessions.ts
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any, // Ensure your API version is correct here
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { items, customer, charges } = req.body;

    try {
      // Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Payment method types: card
        line_items: items.map((item: any) => ({
          price_data: {
            currency: "lkr", // Currency: LKR (Sri Lankan Rupees)
            product_data: {
              name: item.name,
              images: [item.image],
            },
            unit_amount: item.unitPrice * 100, // unit price in cents (100 for LKR)
          },
          quantity: item.qty,
        })),
        mode: "payment", // payment mode
        success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/checkout`,
        customer_email: customer.email, // Optional: Pass the customer's email
      });

      res.status(200).json({ url: session.url }); // Send the session URL to the frontend
    } catch (error) {
      console.error("Stripe Checkout Session Error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
}
