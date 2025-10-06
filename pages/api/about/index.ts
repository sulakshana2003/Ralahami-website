import type { NextApiRequest, NextApiResponse } from 'next'
import { dbConnect } from '@/lib/db'
import About from '@/models/About'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect()

  if (req.method === 'GET') {
    const doc = await About.findOne({}).lean()
    return res.status(200).json(doc || null)
  }

  // Minimal upsert (protect with auth/role in production)
  if (req.method === 'PUT') {
    const payload = req.body || {}
    const doc = await About.findOneAndUpdate({}, payload, { upsert: true, new: true, setDefaultsOnInsert: true })
    return res.status(200).json(doc)
  }

  res.setHeader('Allow', 'GET, PUT')
  res.status(405).end('Method Not Allowed')
}
