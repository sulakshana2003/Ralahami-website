import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('Missing MONGODB_URI')

export const dbConnect = async () => {
  if (mongoose.connection.readyState >= 1) return
  await mongoose.connect(MONGODB_URI)
}
