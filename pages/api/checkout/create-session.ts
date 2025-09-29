// /pages/api/checkout/create-session.ts

import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51RwhjCE4mghBcU8DNAMDKSVpZa3w6bx28dBatkFyPFYL5MkWMeIh6aquat3dsyBdB709CGHVjvyHXqwFI7Clsk0h00Pp8rgJm9', { apiVersion: '2020-08-27' as any });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { items, charges, customer, fulfilment, payment } = req.body;

    // Map items to Stripe line items
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: 'lkr',
        product_data: {
          name: item.name,
          images: [item.image],
        },
        unit_amount: item.unitPrice * 100, // Stripe expects amounts in cents
      },
      quantity: item.qty,
    }));

    try {
      // Create a checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.HOST_URL}/success`, // Shorten the URL
        cancel_url: `${process.env.HOST_URL}/cancel`,  // Shorten the URL
      });

      // Return the session URL to redirect to Stripe's checkout page
      res.status(200).json({ url: session.url });
    } catch (error: unknown) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        // In case the error doesn't have a message, provide a fallback
        res.status(500).json({ error: 'An unknown error occurred.' });
      }
    }
  }
}
