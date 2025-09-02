import type { NextApiRequest, NextApiResponse } from 'next'
import { dbConnect } from '@/lib/db'
import Product from '@/models/Product'

// This endpoint works by slug, not _id.
// Supports: GET (read one), PUT/PATCH (update), DELETE (remove)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect()

  const raw = req.query.slug
  const slug = Array.isArray(raw) ? raw[0] : raw
  if (!slug) {
    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE')
    return res.status(400).json({ message: 'Bad slug: missing path param. Expected /api/products/<slug>' })
  }

  if (req.method === 'GET') {
    const product = await Product.findOne({ slug })
    if (!product) return res.status(404).json({ message: 'Not found' })
    return res.status(200).json(product)
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      // Keep slug stable unless you intentionally allow changing it
      const { slug: bodySlug, ...rest } = req.body ?? {}
      const doc = await Product.findOneAndUpdate(
        { slug },
        { $set: rest },
        { new: true, runValidators: true }
      )
      if (!doc) return res.status(404).json({ message: 'Not found' })
      return res.status(200).json(doc)
    } catch (e: any) {
      return res.status(400).json({ message: e.message || 'Update failed' })
    }
  }

  if (req.method === 'DELETE') {
    const doc = await Product.findOneAndDelete({ slug })
    if (!doc) return res.status(404).json({ message: 'Not found' })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, PUT, PATCH, DELETE')
  return res.status(405).end('Method Not Allowed')
}
