import { FormEvent, useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Login() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ If already logged in, go to homepage (not /account)
  useEffect(() => {
    if (status === 'authenticated') router.replace('/')
  }, [status, router])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // ✅ Let NextAuth handle redirect to home on success
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,     // keep false so we can handle errors below
      // callbackUrl: '/',  // (optional) only used if redirect:true
    })
    setLoading(false)

    if (res?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/')     // ✅ go home after successful login
    }
  }

  // While session check is loading, render nothing (prevents flicker)
  if (status === 'loading') return null

  return (
    <div className="pt-28 px-4 max-w-md mx-auto">
      <h1 className="text-3xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <input className="w-full rounded-xl border px-4 h-11" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded-xl border px-4 h-11" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="rounded-xl bg-black text-white px-5 h-11 w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm">No account? <Link href="/register" className="underline">Register</Link></p>
    </div>
  )
}
