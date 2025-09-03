import { Schema, model, models, Document, Types } from 'mongoose'

export type ReservationStatus = 'confirmed' | 'cancelled'

export interface IReservation extends Document {
  userId?: Types.ObjectId
  name: string
  email: string
  phone?: string
  date: string           // yyyy-mm-dd (local)
  slot: string           // HH:mm (24h)
  partySize: number
  notes?: string
  status: ReservationStatus
  createdAt: Date
  updatedAt: Date
}

const ReservationSchema = new Schema<IReservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String },
    date: { type: String, required: true, index: true }, // yyyy-mm-dd
    slot: { type: String, required: true, index: true }, // HH:mm
    partySize: { type: Number, required: true, min: 1, max: 100 },
    notes: { type: String },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', index: true },
  },
  { timestamps: true }
)

// Speed up availability queries by slot
ReservationSchema.index({ date: 1, slot: 1, status: 1 })

export default models.Reservation || model<IReservation>('Reservation', ReservationSchema)
