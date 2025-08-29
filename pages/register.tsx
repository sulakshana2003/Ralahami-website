import { FormEvent, useState } from 'react'
import { useRouter } from 'next/router'

export default function Register() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
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
    <div className="pt-28 px-4 max-w-md mx-auto">
      <h1 className="text-3xl font-semibold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input className="w-full rounded-xl border px-4 h-11" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
        <input className="w-full rounded-xl border px-4 h-11" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded-xl border px-4 h-11" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="rounded-xl bg-black text-white px-5 h-11 w-full">{loading ? 'Creating...' : 'Create account'}</button>
      </form>
    </div>
  )
}
