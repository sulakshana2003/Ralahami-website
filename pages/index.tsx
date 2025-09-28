/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import { motion, Variants } from "framer-motion";
import Navbar from "./components/Navbar";
import AdminAutoRedirect from "./components/AdminAutoRedirect";
import SignatureDishes from "./components/SignatureDishes";

// ---------- Motion Variants ----------
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const, // 👈 tell TS this is a literal, not generic string
    },
  },
};

const stagger: Variants = {
  show: { transition: { staggerChildren: 0.2 } },
};

// ---------- Optional Three.js Background ----------
let _THREE: any = null;
const ThreeBackground: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;

    const setup = async () => {
      try {
        const THREE = _THREE || (await import("three"));
        _THREE = THREE;

        const canvas = canvasRef.current!;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

        const setSize = () => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          renderer.setSize(w, h, false);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };

        const starCount = 900;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 20;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ size: 0.02, transparent: true });
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        camera.position.z = 6;
        setSize();

        const onResize = () => setSize();
        window.addEventListener("resize", onResize);

        const animate = () => {
          if (disposed) return;
          points.rotation.y += 0.0008;
          points.rotation.x += 0.0004;
          renderer.render(scene, camera);
          rafRef.current = requestAnimationFrame(animate);
        };
        animate();

        return () => {
          disposed = true;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          window.removeEventListener("resize", onResize);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
        };
      } catch {
        return;
      }
    };

    const cleanupPromise = setup();
    return () => {
      if (typeof cleanupPromise === "function") (cleanupPromise as any)();
    };
  }, [enabled]);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10 h-full w-full opacity-70" />;
};

// ---------- Small UI helpers ----------
const Container: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;

const SectionHeading: React.FC<{ eyebrow?: string; title: string; subtitle?: string; id?: string }> = ({
  eyebrow,
  title,
  subtitle,
  id,
}) => (
  <motion.div
    variants={fadeUp}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true }}
    className="mb-10 text-center"
    id={id}
  >
    {eyebrow && <p className="text-xs tracking-[0.25em] text-orange-500 uppercase">{eyebrow}</p>}
    <h2 className="mt-2 text-3xl/tight font-semibold sm:text-4xl text-neutral-800">{title}</h2>
    {subtitle && <p className="mt-3 text-base text-neutral-600">{subtitle}</p>}
  </motion.div>
);

// ---------- Hero ----------
const Hero: React.FC = () => (
  <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-24 bg-gradient-to-br from-orange-50 via-white to-orange-100">
    <div className="absolute inset-0 -z-10">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="object-cover w-full h-full"
      >
        {/* Correct path to the video file */}
        <source src="https://www.pexels.com/video/beautiful-sunset-clip-1234567/" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
    </div>
    <Container className="relative z-10 pb-20">
      <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-2xl">
        <motion.p variants={fadeUp} className="text-xs tracking-[0.25em] text-orange-500 uppercase">
          Colombo · Est. 2025
        </motion.p>
        <motion.h1 variants={fadeUp} className="mt-3 text-5xl/tight font-bold sm:text-6xl text-neutral-900">
          Sri Lankan flavors, <br /> crafted with heart.
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-4 text-lg text-neutral-700">
          From breakfast hoppers to seafood feasts—seasonal, local, and made from scratch.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/reservation"
            className="rounded-full bg-orange-500 px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-orange-600"
          >
            Reserve a Table
          </Link>
          <Link
            href="/products"
            className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Order Takeaway
          </Link>
        </motion.div>
      </motion.div>
    </Container>
  </section>
);


// ---------- Signature Dishes ----------
<SignatureDishes/>
// ---------- Promotions ----------
const Promotions: React.FC = () => (
  <section id="promotions" className="bg-neutral-50 py-16 sm:py-20">
    <Container>
      <SectionHeading eyebrow="Deals & Events" title="Promotions" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Weekday Lunch Set",
            desc: "Pick any curry + rice + dessert. 11:30–14:30.",
            cta: "Order now",
          },
          {
            title: "Tea Time (3–5 PM)",
            desc: "Hoppers + tea combo for two.",
            cta: "See menu",
          },
          {
            title: "Loyalty Members",
            desc: "Earn points every visit. Redeem for free dishes.",
            cta: "Join & login",
          },
        ].map((p) => (
          <div key={p.title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{p.desc}</p>
            <div className="mt-4">
              <Link href={p.title === "Loyalty Members" ? "/login" : "/products"} className="text-sm font-medium hover:underline">
                {p.cta} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Container>
  </section>
);

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
            <Link href="/reservation" className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
              Book a Table
            </Link>
            <Link href="/contact" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </Container>
  </section>
);

// ---------- Newsletter / Social ----------
const SocialNewsletter: React.FC = () => (
  <section className="bg-neutral-50 py-14">
    <Container className="grid gap-10 lg:grid-cols-2">
      <div>
        <h3 className="text-lg font-semibold">Join the list</h3>
        <p className="mt-2 text-sm text-neutral-600">Be the first to know about specials and events.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Thanks for subscribing!");
          }}
          className="mt-4 flex max-w-md items-center gap-2"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-neutral-300 px-4 outline-none focus:ring-2 focus:ring-orange-500/30"
          />
          <button className="h-11 shrink-0 rounded-xl bg-orange-500 px-5 text-sm font-medium text-white hover:bg-orange-600">
            Subscribe
          </button>
        </form>
      </div>
    </Container>
  </section>
);

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
          123 Galle Road,<br />Colombo 03, Sri Lanka
        </p>
      </div>
      <div>
        <h4 className="text-sm font-semibold">Contact</h4>
        <p className="mt-2 text-sm text-neutral-600">
          +94 11 234 5678<br />
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
);

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
    </>
  );
};

export default HomePage;
