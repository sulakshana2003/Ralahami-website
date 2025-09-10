/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { format } from 'date-fns'
import Navbar from './components/Navbar'
import Footer from '../pages/components/Footer'

type Slot = { time: string; remaining: number }

export default function ReservationPage() {
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const [date, setDate] = useState(todayStr)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load availability when date changes
  useEffect(() => {
    const run = async () => {
      setLoadingSlots(true)
      setError(null)
      try {
        const r = await fetch(`/api/reservations?date=${date}`)
        const j = await r.json()
        if (!r.ok) throw new Error(j?.message || 'Failed to load slots')
        setSlots(j.slots || [])
        // pick first available
        const first = (j.slots || []).find((s: Slot) => s.remaining > 0)
        setTime(first?.time || '')
      } catch (e: any) {
        setError(e.message)
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }
    run()
  }, [date])

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault()

  if (phone) {
    if (phone.startsWith('-')) {
      setError('Phone number cannot be negative')
      return
    }
    if (!/^\d+$/.test(phone)) {
      setError('Phone number must contain only digits')
      return
    }
  }

  setSubmitting(true)
  setError(null)
    try {
      const r = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, date, time, partySize, notes }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.message || 'Reservation failed')
      setSuccessId(j.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Head><title>Reserve a Table — Ralahami</title></Head>
      <Navbar />

      <div
  className="relative pt-28 pb-16 min-h-screen bg-cover bg-center"
  style={{ backgroundImage: "url('/images/reservation-bg.png')" }}
>
  {/* dark overlay */}
  <div className="absolute inset-0 bg-black/25" />

  {/* content above overlay */}
  <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
    ...

          <div className="mb-8 text-center bg-white/90 backdrop-blur rounded-xl p-6 shadow-lg mx-auto max-w-3xl">
  <p className="text-xs tracking-[0.25em] text-amber-600 uppercase">Reservation</p>
  <h1 className="mt-2 text-4xl font-semibold">Book a Table</h1>
  <p className="mt-2 text-neutral-600">
    Select a date & time, tell us your party size, and we’ll save your table!
  </p>
</div>


          {successId ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <h2 className="text-xl font-semibold">All set!</h2>
              <p className="mt-2 text-neutral-700">
                Your reservation is confirmed for <b>{date}</b> at <b>{time}</b> for <b>{partySize}</b> people.
              </p>
              <p className="mt-2 text-neutral-600">We’ve sent a confirmation to <b>{email}</b>.</p>
              <a href="/" className="mt-6 inline-block rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                Back to Home
              </a>
            </div>
          ) : (
            <form
  onSubmit={onSubmit}
  className="grid gap-5 rounded-2xl border p-6 sm:grid-cols-2 bg-white/90 backdrop-blur shadow-xl"
>

              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Date</label>
                  <input type="date" className="mt-1 w-full rounded-xl border px-3 h-11"
                         value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm font-medium">Time</label>
                  <select className="mt-1 w-full rounded-xl border px-3 h-11"
                          value={time} onChange={(e) => setTime(e.target.value)} required disabled={loadingSlots || slots.length === 0}>
                    {loadingSlots && <option>Loading…</option>}
                    {!loadingSlots && slots.length === 0 && <option>No slots available</option>}
                    {!loadingSlots && slots.map((s) => (
                      <option key={s.time} value={s.time} disabled={s.remaining <= 0}>
                        {s.time} {s.remaining <= 0 ? '(Full)' : `(${s.remaining} seats left)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium">Party size</label>
                  <input type="number" min={1} max={12}
                         className="mt-1 w-full rounded-xl border px-3 h-11"
                         value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} required />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Full name</label>
                  <input className="mt-1 w-full rounded-xl border px-3 h-11"
                         value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input type="email" className="mt-1 w-full rounded-xl border px-3 h-11"
                         value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm font-medium">Phone </label>
                  <input
                  type="tel"
  inputMode="numeric"
  pattern="[0-9]*"
  className="mt-1 w-full rounded-xl border px-3 h-11"
  value={phone}
  onChange={(e) => {
    const v = e.target.value
    if (v.startsWith('-')) {
      setError('Phone number cannot be negative')
      return
    }
    if (!/^\d*$/.test(v)) {
      setError('Phone number must contain only digits')
      return
    }
    setError(null)
    setPhone(v)
  }}
/>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium">Special requests (optional)</label>
                <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={3}
                          value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

              <div className="sm:col-span-2">
                <button disabled={submitting} className="w-full rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800">
                  {submitting ? 'Booking…' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <Footer/>
    </>
  )
}
