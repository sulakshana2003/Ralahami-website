import { Schema, model, models, Document } from 'mongoose'

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  phone?: string
  address?: string
  loyaltyPoints: number
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    phone: String,
    address: String,
    loyaltyPoints: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default models.User || model<IUser>('User', UserSchema)
