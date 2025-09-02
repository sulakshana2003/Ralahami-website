// pages/api/auth/[...nextauth].ts
import NextAuth, { type NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db'
import User, { IUser } from '@/models/User'
import { Types } from 'mongoose'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
          if (
    process.env.NODE_ENV !== "production" &&   // safety: disable in prod
    credentials.email === "admin@gmail.com" &&
    credentials.password === "admin"
  ) {
    return {
      id: "hardcoded-admin",
      email: "admin@gmail.com",
      name: "Super Admin",
      role: "admin",
    }
  }
        await dbConnect()

        // 👇 Tell TS exactly what the query returns
        const doc = await User.findOne({ email: credentials.email })
          .lean<IUser & { _id: Types.ObjectId }>()   // <= key line

        if (!doc) return null

        const ok = await bcrypt.compare(credentials.password, doc.passwordHash)
        if (!ok) return null

        // Return the minimal user for NextAuth's JWT
        return {
          id: doc._id.toString(),
          email: doc.email,
          name: doc.name,
          role: doc.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
