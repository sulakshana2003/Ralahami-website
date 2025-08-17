import { NextApiRequest, NextApiResponse } from 'next'
import { dbConnect } from '@/lib/db'
import Product from '@/models/Product'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect()
  const { slug } = req.query

  if (req.method === 'GET') {
    const product = await Product.findOne({ slug })
    if (!product) return res.status(404).json({ message: 'Not found' })
    return res.status(200).json(product)
  }

  res.setHeader('Allow', 'GET')
  return res.status(405).end('Method Not Allowed')
}
