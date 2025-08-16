// src/components/Navbar.tsx
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
//import Container from './Container' // adjust path if Container is elsewhere

const Navbar: React.FC = () => (
  <header className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200/50 bg-white/70 backdrop-blur-md">
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between py-3">
      <Link href="/" className="group inline-flex items-center gap-2">
        <div className="relative h-8 w-8">
          <Image src="/images/RalahamiLogo.png" alt="Ralahami" fill className="object-contain" />
        </div>
        <span className="font-semibold tracking-wide">Ralahami Resturant</span>
      </Link>
      <nav className="hidden items-center gap-6 md:flex">
        {['Menu', 'Order', 'Reserve', 'Promotions', 'About', 'Contact'].map((item) => {
          const hrefMap: Record<string, string> = {
            Menu: '/products',
            Order: '/cart',
            Reserve: '/reservation',
            Promotions: '/#promotions',
            About: '/about',
            Contact: '/contact',
          }
          return (
            <Link
              key={item}
              href={hrefMap[item]}
              className="text-sm text-neutral-700 hover:text-black transition-colors"
            >
              {item}
            </Link>
          )
        })}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 md:inline-block"
        >
          Loyalty Login
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

export default Navbar
