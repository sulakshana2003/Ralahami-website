// lib/db.ts
import mongoose from 'mongoose'

declare global {
  // eslint-disable-next-line no-var
  var _mongo: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined
}
if (!global._mongo) global._mongo = { conn: null, promise: null }

export async function dbConnect() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('Missing MONGODB_URI')

  if (global._mongo!.conn) return global._mongo!.conn

  if (!global._mongo!.promise) {
    // Add lower timeouts so failures show quickly with clear errors
    const opts = {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
    } as const

    global._mongo!.promise = mongoose.connect(uri, opts)
      .then((m) => {
        // Optional: helpful one-time log
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[mongo] connected:', m.connection.host)
        }
        return m
      })
      .catch((err) => {
        // Re-throw a clearer error so Next.js overlay shows the cause
        const reason = (err && (err.reason?.message || err.message)) || String(err)
        throw new Error(`[mongo] connection failed: ${reason}`)
      })
  }

  global._mongo!.conn = await global._mongo!.promise
  return global._mongo!.conn
}
