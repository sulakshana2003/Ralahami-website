/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useRef } from 'react'
import Navbar from './components/Navbar'
import AdminAutoRedirect from './components/AdminAutoRedirect' ;
//import Footer from "./components/Footer";


// ---------- Optional Three.js Background (client-only) ----------
// Install three: `npm i three`
// If you don't want the floating particles, set <ThreeBackground enabled={false} />
let _THREE: any = null
const ThreeBackground: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    let disposed = false

    const setup = async () => {
      try {
        // Lazy-load Three to keep bundle small
        const THREE = _THREE || (await import('three'))
        _THREE = THREE

        const canvas = canvasRef.current!
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)

        const setSize = () => {
          const w = canvas.clientWidth
          const h = canvas.clientHeight
          renderer.setSize(w, h, false)
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
          camera.aspect = w / h
          camera.updateProjectionMatrix()
        }

        // Create subtle starfield
        const starCount = 900
        const positions = new Float32Array(starCount * 3)
        for (let i = 0; i < starCount * 3; i++) {
          positions[i] = (Math.random() - 0.5) * 20 // spread
        }
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const material = new THREE.PointsMaterial({ size: 0.015, transparent: true })
        const points = new THREE.Points(geometry, material)
        scene.add(points)

        camera.position.z = 6
        setSize()

        const onResize = () => setSize()
        window.addEventListener('resize', onResize)

        const animate = () => {
          if (disposed) return
          points.rotation.y += 0.0008
          points.rotation.x += 0.0004
          renderer.render(scene, camera)
          rafRef.current = requestAnimationFrame(animate)
        }
        animate()

        // Cleanup
        return () => {
          disposed = true
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          window.removeEventListener('resize', onResize)
          geometry.dispose()
          material.dispose()
          renderer.dispose()
        }
      } catch (e) {
        // Three failed to init (SSR or no WebGL)
        // Silently fail; background is purely decorative
        return
      }
    }

    const cleanupPromise = setup()
    return () => {
      // If setup returns a cleanup function, call it on unmount
      if (typeof cleanupPromise === 'function') {
        (cleanupPromise as any)()
      }
    }
  }, [enabled])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 -z-10 h-full w-full opacity-60 [mask-image:radial-gradient(60%_50%_at_50%_40%,#000,transparent_80%)]"
      aria-hidden
    />
  )
}

// ---------- Small UI helpers ----------
const Container: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
)

const SectionHeading: React.FC<{ eyebrow?: string; title: string; subtitle?: string; id?: string }> = ({
  eyebrow,
  title,
  subtitle,
  id,
}) => (
  <div className="mb-10 text-center" id={id}>
    {eyebrow && <p className="text-xs tracking-[0.25em] text-amber-600 uppercase">{eyebrow}</p>}
    <h2 className="mt-2 text-3xl/tight font-semibold sm:text-4xl">{title}</h2>
    {subtitle && <p className="mt-3 text-base text-neutral-600">{subtitle}</p>}
  </div>
)

// ---------- Hero ----------
const Hero: React.FC = () => (
  <section className="relative flex min-h-[92vh] items-end overflow-hidden pt-24">
    {/* Background image with subtle overlay */}
    <div className="absolute inset-0 -z-10">
      <Image
        src="/images/restaurant-ambiance.jpg"
        alt="Warm restaurant interior"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
    </div>
    <ThreeBackground enabled />

    <Container className="relative z-10 pb-20">
      <div className="max-w-2xl">
        <p className="text-xs tracking-[0.25em] text-amber-600 uppercase">Colombo · Est. 2025</p>
        <h1 className="mt-3 text-5xl/tight font-semibold sm:text-6xl">
          Sri Lankan flavors, crafted with heart.
        </h1>
        <p className="mt-4 text-lg text-neutral-700">
          From breakfast hoppers to seafood feasts—seasonal, local, and made from scratch.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/reservation"
            className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Reserve a Table
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-50"
          >
            Order Takeaway
          </Link>
        </div>
      </div>
    </Container>
  </section>
)

// ---------- Signature Dishes (scrollable) ----------
type Dish = { title: string; img: string; price?: string; tag?: string }
const dishes: Dish[] = [
  { title: 'Jaffna Crab Curry', img: '/images/JaffnaCabCurry.jpg', price: 'Rs. 4200', tag: 'Signature' },
  { title: 'Hoppers & Pol Sambol', img: '/images/stringhoppers.jpeg', price: 'Rs. 900' },
  { title: 'Black Pork Curry', img: '/images/blackPork.jpg', price: 'Rs. 2600' },
  { title: 'Lamprais', img: '/images/Lamprice.jpeg', price: 'Rs. 2400' },
  /* { title: 'Watalappan', img: '/images/dishes/watalappan.jpg', price: 'Rs. 850', tag: 'Dessert' }, */
]

const SignatureDishes: React.FC = () => (
  <section className="py-16 sm:py-20">
    <Container>
      <SectionHeading
        eyebrow="Seasonal highlights"
        title="Signature Dishes"
        subtitle="A rotating selection from our chefs. Order online or enjoy in-house."
      />
      <div className="relative">
        <div className="hide-scrollbar -mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-2">
          {dishes.map((d) => (
            <article
              key={d.title}
              className="group relative w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative h-44 w-full">
                <Image src={d.img} alt={d.title} fill className="object-cover transition group-hover:scale-[1.03]" />
                {d.tag && (
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium">
                    {d.tag}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold">{d.title}</h3>
                {d.price && <p className="mt-1 text-sm text-neutral-600">{d.price}</p>}
                <div className="mt-4 flex items-center gap-2">
                  <Link href="/products" className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50">
                    Add to Cart
                  </Link>
                  <Link href="/products" className="text-xs text-neutral-600 hover:text-black">See details →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Container>
  </section>
)




// ---------- Promotions ----------
const Promotions: React.FC = () => (
  <section id="promotions" className="bg-neutral-50 py-16 sm:py-20">
    <Container>
      <SectionHeading eyebrow="Deals & Events" title="Promotions" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Weekday Lunch Set',
            desc: 'Pick any curry + rice + dessert. 11:30–14:30.',
            cta: 'Order now',
          },
          {
            title: 'Tea Time (3–5 PM)',
            desc: 'Hoppers + tea combo for two.',
            cta: 'See menu',
          },
          {
            title: 'Loyalty Members',
            desc: 'Earn points every visit. Redeem for free dishes.',
            cta: 'Join & login',
          },
        ].map((p) => (
          <div key={p.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{p.desc}</p>
            <div className="mt-4">
              <Link href={p.title === 'Loyalty Members' ? '/login' : '/products'} className="text-sm font-medium hover:underline">
                {p.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Container>
  </section>
)

// ---------- Hours & Location ----------
const HoursLocation: React.FC = () => (
  <section className="py-16 sm:py-20">
    <Container>
      <SectionHeading eyebrow="Visit us" title="Hours & Location" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold">Opening Hours</h3>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-neutral-700 sm:grid-cols-3">
            <div><dt className="font-medium">Mon–Thu</dt><dd>11:30–22:00</dd></div>
            <div><dt className="font-medium">Fri</dt><dd>11:30–23:00</dd></div>
            <div><dt className="font-medium">Sat</dt><dd>10:00–23:00</dd></div>
            <div><dt className="font-medium">Sun</dt><dd>10:00–21:30</dd></div>
          </dl>
          <div className="mt-6 flex gap-3">
            <Link href="/reservation" className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
              Book a Table
            </Link>
            <Link href="/contact" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Contact us
            </Link>
          </div>
          <p className="mt-6 text-xs text-neutral-500">Kitchen hours may vary on holidays.</p>
        </div>
        {/* <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <iframe
            title="Map to Ralahami"
            className="h-[360px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7922.6207!2d79.8612!3d6.9271!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sColombo!5e0!3m2!1sen!2slk!4v00000000000"
          /> 
        </div> */}
      </div>
    </Container>
  </section>
)

// ---------- Newsletter / Social ----------
const SocialNewsletter: React.FC = () => (
  <section className="bg-neutral-50 py-14">
    <Container className="grid gap-10 lg:grid-cols-2">
      <div>
        <h3 className="text-lg font-semibold">Join the list</h3>
        <p className="mt-2 text-sm text-neutral-600">Be the first to know about specials and events.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            alert('Thanks for subscribing!')
          }}
          className="mt-4 flex max-w-md items-center gap-2"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <button className="h-11 shrink-0 rounded-xl bg-black px-5 text-sm font-medium text-white hover:bg-neutral-800">
            Subscribe
          </button>
        </form>
      </div>
      {/* <div>
        <h3 className="text-lg font-semibold">Follow us</h3>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-200">
              <Image src={`/images/insta/${i}.jpg`} alt={`Instagram ${i}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      </div> */}
    </Container>
  </section>
)

// ---------- Footer ----------
const Footer: React.FC = () => (
  <footer className="border-t border-neutral-200 bg-white py-10">
    <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <div className="relative h-8 w-8">
          <Image src="/images/RalahamiLogo.png" alt="Ralahami logo" fill className="object-contain" />
        </div>
        <p className="mt-3 text-sm text-neutral-600">Authentic Sri Lankan cuisine in the heart of Colombo.</p>
      </div>
      <div>
        <h4 className="text-sm font-semibold">Visit</h4>
        <p className="mt-2 text-sm text-neutral-600">
          123 Galle Road,<br/>Colombo 03, Sri Lanka
        </p>
      </div>
      <div>
        <h4 className="text-sm font-semibold">Contact</h4>
        <p className="mt-2 text-sm text-neutral-600">
          +94 11 234 5678<br/>
          hello@ralahami.lk
        </p>
      </div>
      <div>
        <h4 className="text-sm font-semibold">Links</h4>
        <ul className="mt-2 space-y-2 text-sm text-neutral-600">
          <li><Link href="/about" className="hover:underline">About</Link></li>
          <li><Link href="/reservation" className="hover:underline">Reservations</Link></li>
          <li><Link href="/products" className="hover:underline">Online Ordering</Link></li>
          <li><Link href="/contact" className="hover:underline">Contact</Link></li>
        </ul>
      </div>
    </Container>
    <Container className="mt-8 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
      © {new Date().getFullYear()} Ralahami. All rights reserved.
    </Container>
  </footer>
)

// ---------- Schema.org (SEO) ----------
const BusinessSchema: React.FC = () => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Ralahami',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Galle Road',
      addressLocality: 'Colombo',
      addressCountry: 'LK',
    },
    telephone: '+94112345678',
    servesCuisine: ['Sri Lankan', 'Seafood'],
    url: 'https://ralahami.lk',
    priceRange: 'LKR 800-4500',
    openingHours: [
      'Mo-Th 11:30-22:00',
      'Fr 11:30-23:00',
      'Sa 10:00-23:00',
      'Su 10:00-21:30',
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

// ---------- Page ----------
const HomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Ralahami — Sri Lankan Restaurant in Colombo</title>
        <meta name="description" content="Sri Lankan flavors, crafted with heart. Book a table or order takeaway." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AdminAutoRedirect />
      <Navbar />
      <main>
        <Hero />
        <SignatureDishes />
        <Promotions />
        <HoursLocation />
        <SocialNewsletter />
      </main>
      <Footer />
      <BusinessSchema />
      {/* Utility: hide scrollbars for snap lists */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  )
}

export default HomePage