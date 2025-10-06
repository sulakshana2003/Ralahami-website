


import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../pages/components/Navbar'
import Footer from "./components/Footer";

export default function Register() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // (unchanged)
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, address, password, confirmPassword }),
    })

    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j?.message || 'Failed to register')
      return
    }
    router.push('/login')
  }

  return (
    <>
      <Navbar />

      {/* Background image + overlay */}
      <div className="relative min-h-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/log.jpg"
          alt="Background"
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-stone-900/40 to-black/50" />

        {/* Content */}
        <main
          className="
            relative z-10
            flex justify-center
            px-4 sm:px-6
            pb-14               /* bottom breathing room */
            pt-28 lg:pt-32      /* NEW: top padding so it doesn't touch Navbar */
            min-h-screen
            items-start lg:items-center
          "
        >
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/40 bg-white/90 p-[1.25px] shadow-xl backdrop-blur-md">
              <div className="rounded-[14px] bg-white/95 p-5 sm:p-6">
                {/* Header */}
                <div className="mb-4 text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                    Create Account
                  </h1>
                  <p className="mt-1 text-xs text-stone-600">
                    Already have an account?{' '}
                    <a
                      href="/login"
                      className="font-medium text-amber-700 underline decoration-amber-400/70 underline-offset-2 hover:text-amber-800"
                    >
                      Log In
                    </a>
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-3.5">
                  {/* Name */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M4 20c1.8-3.5 6.2-5 8-5s6.2 1.5 8 5" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/15"
                      placeholder="Full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/15"
                      placeholder="Email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M6 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M6 18h6" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/15"
                      placeholder="Phone (e.g. +94 771234567)"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  {/* Address */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/15"
                      placeholder="Address"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/15"
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="m10 16 2 2 4-4" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/15"
                      placeholder="Confirm password"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  {error && (
                    <p className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900">
                      {error}
                    </p>
                  )}

                  <button
                    disabled={loading}
                    className="mt-1 h-11 w-full rounded-lg bg-stone-900 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 active:scale-[.99] disabled:opacity-60"
                  >
                    {loading ? 'Creating...' : 'Create account'}
                  </button>
                </form>
              </div>
            </div>

            <p className="mt-4 text-center text-[10px] text-white/80">
              Photo background © Ralahami
            </p>
          </div>
        </main>
      </div>

      <Footer />
    </>
  )
}
