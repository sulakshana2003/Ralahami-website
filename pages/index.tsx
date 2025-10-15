/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import Navbar from "../src/components/Navbar"
import AdminAutoRedirect from "../src/components/AdminAutoRedirect"
import SignatureDishes from "../src/components/SignatureDishes"
import Hero  from "../src/components/Hero";
import Promotions from "../src/components/Promotions"
import Aboutus from "../src/components/AboutUs"
import Contact from "../src/components/ContactUs"

// ---------- Helper ----------
const Container = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-7xl px-6 lg:px-8 ${className}`}>{children}</div>
)

const SectionHeading = ({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) => (
  <div className="text-center mb-12">
    {eyebrow && <p className="uppercase text-xs tracking-[0.25em] text-amber-600">{eyebrow}</p>}
    <h2 className="mt-2 text-3xl sm:text-4xl font-semibold">{title}</h2>
    {subtitle && <p className="mt-3 text-base text-neutral-600">{subtitle}</p>}
  </div>
)

// ---------- Hero ----------
/*  */

// ---------- Signature Dishes ----------


// ---------- Promotions ----------


// ---------- Hours & Location ----------

// ---------- Footer ----------
const Footer = () => (
  <footer className="bg-black text-white py-12 relative z-20">
    <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Image src="/images/RalahamiLogo.png" alt="Ralahami logo" width={40} height={40} />
        <p className="mt-3 text-sm text-neutral-300">Authentic Sri Lankan cuisine in Colombo.</p>
      </div>
      <div>
        <h4 className="font-semibold text-sm">Visit</h4>
        <p className="mt-2 text-sm text-neutral-300">123 Galle Road, Colombo 03, Sri Lanka</p>
      </div>
      <div>
        <h4 className="font-semibold text-sm">Contact</h4>
        <p className="mt-2 text-sm text-neutral-300">+94 11 234 5678<br/>hello@ralahami.lk</p>
      </div>
      <div>
        <h4 className="font-semibold text-sm">Links</h4>
        <ul className="mt-2 space-y-2 text-sm text-neutral-300">
          <li><Link href="/about" className="hover:text-amber-500">About</Link></li>
          <li><Link href="/reservation" className="hover:text-amber-500">Reservations</Link></li>
          <li><Link href="/products" className="hover:text-amber-500">Order Online</Link></li>
          <li><Link href="/contact" className="hover:text-amber-500">Contact</Link></li>
        </ul>
      </div>
    </Container>
    <p className="mt-8 text-center text-xs text-neutral-500">© {new Date().getFullYear()} Ralahami. All rights reserved.</p>
  </footer>
)

// ---------- Page ----------
const HomePage = () => (
  <>
    <Head>
      <title>Ralahami — Sri Lankan Restaurant in Colombo</title>
      <meta name="description" content="Sri Lankan flavors, crafted with heart. Book a table or order takeaway." />
    </Head>

    <AdminAutoRedirect />
    <Navbar />
    <main>
      <Hero />
      <SignatureDishes />
      <Promotions /> 
      <Aboutus/>
    </main>
    <Footer />
  </>
)

export default HomePage
