import { NextApiRequest, NextApiResponse } from 'next';

const orders: Record<string, { items: any[], total: number }> = {
  'sessionId_123': {
    items: [
      { id: 1, name: 'Product 1', qty: 2, unitPrice: 1000 },
      { id: 2, name: 'Product 2', qty: 1, unitPrice: 1500 },
    ],
    total: 3500,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;

  if (typeof sessionId === 'string' && orders[sessionId]) {
    // Accessing the order details safely
    return res.status(200).json(orders[sessionId]);
  }

  return res.status(404).json({ error: 'Order not found' });
}
