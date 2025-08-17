import { NextApiRequest, NextApiResponse } from 'next'
import { dbConnect } from '@/lib/db'
import Product from '@/models/Product'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string().url().or(z.string().startsWith('/'))).default([]),
  price: z.number().min(0),
  promotion: z.number().min(0).default(0),
  category: z.string().optional(),
  spicyLevel: z.number().min(0).max(3).default(0),
  isAvailable: z.boolean().default(true),
  stock: z.number().min(0).default(0),
  isSignatureToday: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect()

  if (req.method === 'GET') {
    const { q, category, signatureToday, limit = '30' } = req.query
    const where: any = { }
    if (q) where.name = { $regex: String(q), $options: 'i' }
    if (category) where.category = String(category)
    if (signatureToday === '1') where.isSignatureToday = true

    const products = await Product.find(where).sort({ isSignatureToday: -1, createdAt: -1 }).limit(Number(limit))
    return res.status(200).json(products)
  }

  if (req.method === 'POST') {
    try {
      const body = createSchema.parse(req.body)
      const exists = await Product.findOne({ slug: body.slug })
      if (exists) return res.status(409).json({ message: 'Slug already exists' })

      // extra server-side guard for signature limit
      if (body.isSignatureToday) {
        const count = await Product.countDocuments({ isSignatureToday: true })
        if (count >= 4) return res.status(400).json({ message: 'Signature dishes today limit reached (4).' })
      }

      const doc = await Product.create(body)
      return res.status(201).json(doc)
    } catch (e: any) {
      return res.status(400).json({ message: e.message })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).end('Method Not Allowed')
}


