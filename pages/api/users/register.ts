/* import type { NextApiRequest, NextApiResponse } from 'next'
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
 */


import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import { dbConnect } from '@/lib/db'
import User from '@/models/User'

// 🔽 NEW: mailer import
import nodemailer from 'nodemailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const { name, email, password, confirmPassword, phone, address } = req.body || {}

  // Validation
  if (!name || !email || !password || !confirmPassword || !phone || !address) {
    return res.status(400).json({ message: 'All fields are required' })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' })
  }

  const phoneRegex = /^\+94\s7\d{8}$/
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Invalid phone format. Use +94 7XXXXXXXX' })
  }

  await dbConnect()

  const exists = await User.findOne({ email })
  if (exists) return res.status(409).json({ message: 'Email already registered' })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, passwordHash, phone, address })

  // 🔽 NEW: send welcome email (non-blocking; failures won't break signup)
  try {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com'
    const port = Number(process.env.SMTP_PORT || 465)
    const secure = port === 465

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.EMAIL_USERNAME!,
        pass: process.env.EMAIL_PASSWORD!,
      },
    })

    const brand = 'Ralahami'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Inline logo via CID — ensure the file exists at /public/images/restaurant-logo.png 
    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: user.email,
      subject: `Welcome to ${brand}!`,
      html: getWelcomeHtml({ name: user.name, brand, baseUrl }),
      attachments: [
        {
          filename: 'logo.png',
          path: `${process.cwd()}/public/images/RalahamiLogo.png`,
          cid: 'restaurantlogo@inline', // must match the cid in HTML
        },
      ],
    })
  } catch (e) {
    // Don’t fail registration if email sending fails
    console.error('Welcome email failed:', e)
  }

  return res.status(201).json({ id: user._id, email: user.email, name: user.name })
}

// 🔽 NEW: small helper to render the welcome email HTML
function getWelcomeHtml({
  name,
  brand,
  baseUrl,
}: {
  name: string
  brand: string
  baseUrl: string
}) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111;">
    <div style="max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
      <div style="background:#111;padding:20px;text-align:center">
        <img src="cid:restaurantlogo@inline" alt="${escapeHtml(brand)} logo" style="height:48px;display:block;margin:0 auto" />
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 8px 0;font-size:20px;">Welcome, ${escapeHtml(name)} 👋</h2>
        <p style="margin:0 0 16px 0;line-height:1.6;">
          Thanks for joining <strong>${escapeHtml(brand)}</strong>! Your account has been created successfully.
        </p>
        <p style="margin:0 0 20px 0;line-height:1.6;">
          You can now browse our menu, place orders, and earn loyalty points.
        </p>
        <a href="${baseUrl}/login"
           style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;">
          Go to Login
        </a>
        <p style="margin:20px 0 0 0;font-size:12px;color:#666;">
          If you didn’t create this account, you can safely ignore this email.
        </p>
      </div>
      <div style="background:#f8f8f8;padding:14px;text-align:center;font-size:12px;color:#666">
        © ${new Date().getFullYear()} ${escapeHtml(brand)}. All rights reserved.
      </div>
    </div>
  </div>
  `
}

// 🔽 NEW: tiny HTML escaper to avoid odd chars breaking the markup
function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}
