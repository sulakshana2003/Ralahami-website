import type { NextApiRequest, NextApiResponse } from 'next'
import { dbConnect } from '@/lib/db'
import ContactMessage from '@/models/ContactMessage'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect()

  if (req.method === 'POST') {
    const { name, email, phone, subject, message } = req.body || {}
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Missing fields' })
    }

    const doc = await ContactMessage.create({ name, email, phone, subject, message })
    // Optional: send an email/Slack here.
    return res.status(201).json({ id: String(doc._id) })
  }

  res.setHeader('Allow', 'POST')
  res.status(405).end('Method Not Allowed')
}
