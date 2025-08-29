import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db'
import User from '@/models/User'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { name, email, password } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })

  await dbConnect()

  const exists = await User.findOne({ email })
  if (exists) return res.status(409).json({ message: 'Email already registered' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash })

  return res.status(201).json({ id: user._id, email: user.email, name: user.name })
}
