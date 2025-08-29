// src/components/Navbar.tsx
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useCart } from '@/hooks/useCart' // if you use the cart

const Navbar: React.FC = () => {
  const { data: session, status } = useSession()
  const isLoggedIn = status === 'authenticated'

  // (optional) cart count, guard for hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const items = useCart ? useCart((s) => s.items) : []
  const cartCount = mounted ? items.reduce((n: number, i: any) => n + i.qty, 0) : 0

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200/50 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image src="/images/RalahamiLogo.png" alt="Ralahami" fill className="object-contain" />
          </div>
          <span className="font-semibold tracking-wide">Ralahami Restaurant</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/products" className="text-sm text-neutral-700 hover:text-black">Menu</Link>
          <Link href="/cart" className="text-sm text-neutral-700 hover:text-black">Order</Link>
          <Link href="/reservation" className="text-sm text-neutral-700 hover:text-black">Reserve</Link>
          <Link href="/#promotions" className="text-sm text-neutral-700 hover:text-black">Promotions</Link>
          <Link href="/about" className="text-sm text-neutral-700 hover:text-black">About</Link>
          <Link href="/contact" className="text-sm text-neutral-700 hover:text-black">Contact</Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isLoggedIn ? (
            <Link
              href="/login"
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Login
            </Link>
          ) : (
            <>
              <Link
                href="/account"
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                Account
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                Sign out
              </button>
            </>
          )}

          <Link
            href="/cart"
            className="relative rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Cart
            {mounted && cartCount > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-[11px] font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/reservation"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Book a Table
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Navbar
