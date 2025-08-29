import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]'
import type { GetServerSidePropsContext } from 'next'
import { signOut, useSession } from 'next-auth/react'

export default function Account() {
  const { data } = useSession()
  const user = data?.user as any
  return (
    <div className="pt-28 px-4 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold">My Account</h1>
      <div className="mt-6 rounded-2xl border p-6">
        <p><span className="font-medium">Name:</span> {user?.name}</p>
        <p className="mt-2"><span className="font-medium">Email:</span> {user?.email}</p>
        <p className="mt-2"><span className="font-medium">Role:</span> {user?.role || 'user'}</p>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="mt-6 rounded-xl border px-4 h-11">Sign out</button>
      </div>
    </div>
  )
}

// Protect with server-side redirect if not logged in
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions)
  if (!session) return { redirect: { destination: '/login', permanent: false } }
  return { props: {} }
}
