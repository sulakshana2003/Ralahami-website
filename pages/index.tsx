/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import Navbar from "./components/Navbar"
import AdminAutoRedirect from "./components/AdminAutoRedirect"
import SignatureDishes from "./components/SignatureDishes"
import Hero  from "./components/Hero";

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
const Promotions = () => (
  <section className="py-20 bg-neutral-50">
    <Container>
      <SectionHeading eyebrow="Deals" title="Promotions" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Weekday Lunch Set", desc: "Pick any curry + rice + dessert. 11:30–14:30.", cta: "Order now" },
          { title: "Tea Time (3–5 PM)", desc: "Hoppers + tea combo for two.", cta: "See menu" },
          { title: "Loyalty Members", desc: "Earn points every visit. Redeem for free dishes.", cta: "Join & login" },
        ].map((p) => (
          <motion.div
            key={p.title}
            whileHover={{ y: -5 }}
            className="rounded-2xl bg-white p-6 border border-neutral-200 shadow hover:shadow-md"
          >
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{p.desc}</p>
            <Link href={p.title === "Loyalty Members" ? "/login" : "/products"} className="mt-4 inline-block text-amber-600 hover:underline">
              {p.cta} →
            </Link>
          </motion.div>
        ))}
      </div>
    </Container>
  </section>
)

// ---------- Hours & Location ----------
const HoursLocation = () => (
  <section className="py-20 bg-white">
    <Container>
      <SectionHeading eyebrow="Visit us" title="Hours & Location" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border p-6 shadow">
          <h3 className="text-lg font-semibold">Opening Hours</h3>
          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><dt className="font-medium">Mon–Thu</dt><dd>11:30–22:00</dd></div>
            <div><dt className="font-medium">Fri</dt><dd>11:30–23:00</dd></div>
            <div><dt className="font-medium">Sat</dt><dd>10:00–23:00</dd></div>
            <div><dt className="font-medium">Sun</dt><dd>10:00–21:30</dd></div>
          </dl>
        </div>
        <div className="overflow-hidden rounded-2xl border">
          <iframe
            title="Map"
            className="h-[360px] w-full"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7922.6207!2d79.8612!3d6.9271"
          />
        </div>
      </div>
    </Container>
  </section>
)

// ---------- Footer ----------
const Footer = () => (
  <footer className="bg-black text-white py-12">
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
      <HoursLocation />
    </main>
    <Footer />
  </>
)

export default HomePage
