import Head from 'next/head'
import { FormEvent, useState } from 'react'
import type { GetServerSideProps } from 'next'
import { dbConnect } from '@/lib/db'
import About from '@/models/About'
import Navbar from '../pages/components/Navbar'

type ContactInfo = { address?: string; phone?: string; email?: string }

export default function ContactPage({ info }: { info: ContactInfo }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null); setSuccess(null); setLoading(true)
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j?.message || 'Failed to send message')
      setSuccess('Thanks! We’ll get back to you soon.')
      setName(''); setEmail(''); setPhone(''); setSubject(''); setMessage('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Contact Us — Ralahami</title></Head>
      <Navbar />

      <main className="pt-28 pb-16">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-semibold">Contact Us</h1>
          <p className="mt-2 text-neutral-600">Questions, feedback, or reservation requests—send us a message.</p>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="h-11 w-full rounded-xl border px-3" placeholder="Full name" value={name} onChange={(e)=>setName(e.target.value)} required />
                <input className="h-11 w-full rounded-xl border px-3" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                <input className="h-11 w-full rounded-xl border px-3 sm:col-span-2" placeholder="Phone (optional)" value={phone} onChange={(e)=>setPhone(e.target.value)} />
                <input className="h-11 w-full rounded-xl border px-3 sm:col-span-2" placeholder="Subject" value={subject} onChange={(e)=>setSubject(e.target.value)} required />
              </div>
              <textarea className="w-full rounded-xl border px-3 py-2" rows={6} placeholder="Message" value={message} onChange={(e)=>setMessage(e.target.value)} required />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <button disabled={loading} className="h-11 rounded-xl bg-black px-5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60">
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </form>

            {/* Info / Map */}
            <div className="space-y-6">
              <div className="rounded-2xl border p-6">
                <h2 className="text-lg font-semibold">Our Details</h2>
                <dl className="mt-3 space-y-2 text-sm text-neutral-700">
                  {info.address && <div><dt className="font-medium">Address</dt><dd>{info.address}</dd></div>}
                  {info.phone && <div><dt className="font-medium">Phone</dt><dd>{info.phone}</dd></div>}
                  {info.email && <div><dt className="font-medium">Email</dt><dd>{info.email}</dd></div>}
                </dl>
              </div>
              <div className="overflow-hidden rounded-2xl border">
                <iframe
                  title="Map"
                  className="h-[300px] w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7922.6207!2d79.8612!3d6.9271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sColombo!5e0!3m2!1sen!2slk!4v00000000000"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<{ info: ContactInfo }> = async () => {
  await dbConnect()
  const d: any = await About.findOne({}).select('address phone email').lean()
  const info: ContactInfo = { address: d?.address || null, phone: d?.phone || null, email: d?.email || null }
  return { props: { info } }
}

