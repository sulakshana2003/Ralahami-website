// pages/api/webhooks.ts
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2020-08-27' as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature']!;
  const payload = req.body;

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Update your database with order payment status here
      // Example: await Order.updatePaymentStatus(paymentIntent.id);
      console.log('PaymentIntent was successful:', paymentIntent);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.status(200).send('Event received');
}
