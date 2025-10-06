import { Schema, model, models, Document } from 'mongoose'

export interface IContactMessage extends Document {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: 'new' | 'read' | 'closed'
  createdAt: Date
  updatedAt: Date
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: String,
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read', 'closed'], default: 'new', index: true },
  },
  { timestamps: true }
)

export default models.ContactMessage || model<IContactMessage>('ContactMessage', ContactMessageSchema)
