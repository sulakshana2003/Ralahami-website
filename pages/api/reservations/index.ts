import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { dbConnect } from '@/lib/db'
import Reservation from '@/models/Reservation'
import { generateSlotsForDate, normalizeSlot } from '@/lib/slots'
import { CAPACITY_PER_SLOT, MAX_PARTY_SIZE, MIN_PARTY_SIZE, BLACKOUT_DATES } from '@/lib/reservationConfig'

// ---- Validation ----
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string()
  .regex(/^\d+$/, { message: "Phone number must contain only digits" }) // ✅ only digits allowed
  .refine((val) => !val.startsWith("-"), { message: "Phone number cannot be negative" }) // ✅ block negatives
  .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // yyyy-mm-dd
  time: z.string().regex(/^\d{2}:\d{2}$/),       // HH:mm
  partySize: z.number().int().min(MIN_PARTY_SIZE).max(MAX_PARTY_SIZE),
  notes: z.string().max(500).optional()
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect()

  if (req.method === 'GET') {
    // /api/reservations?date=yyyy-mm-dd
    const date = String(req.query.date || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Invalid date' })
    if (BLACKOUT_DATES.has(date)) return res.status(200).json({ slots: [], capacity: CAPACITY_PER_SLOT })

    const baseSlots = generateSlotsForDate(date)
    const counts = await Reservation.aggregate([
      { $match: { date, status: 'confirmed' } },
      { $group: { _id: '$slot', total: { $sum: '$partySize' } } }
    ])

    const usedBySlot: Record<string, number> = {}
    counts.forEach(c => (usedBySlot[c._id] = c.total))

    const slots = baseSlots.map(s => ({
      time: s,
      remaining: Math.max(CAPACITY_PER_SLOT - (usedBySlot[s] || 0), 0)
    }))

    return res.status(200).json({ slots, capacity: CAPACITY_PER_SLOT })
  }

  if (req.method === 'POST') {
    try {
      const body = createSchema.parse(req.body)
      const slot = normalizeSlot(body.time)

      if (BLACKOUT_DATES.has(body.date)) return res.status(400).json({ message: 'Date not bookable' })

      // capacity check
      const agg = await Reservation.aggregate([
        { $match: { date: body.date, slot, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$partySize' } } }
      ])
      const used = agg[0]?.total || 0
      const remaining = CAPACITY_PER_SLOT - used
      if (remaining < body.partySize) {
        return res.status(409).json({ message: 'Not enough capacity for this time. Please pick another slot.' })
      }

      // Create reservation (attach userId from session via header/route if you want)
      const doc = await Reservation.create({
        name: body.name,
        email: body.email,
        phone: body.phone,
        date: body.date,
        slot,
        partySize: body.partySize,
        notes: body.notes,
        status: 'confirmed'
      })

      return res.status(201).json({ id: String(doc._id) })
    } catch (e: any) {
      return res.status(400).json({ message: e.message || 'Invalid data' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  res.status(405).end('Method Not Allowed')
}
