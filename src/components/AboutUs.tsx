/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import ScrollStack, { ScrollStackItem } from "./reactbits/ScrollStack";

type Social = { platform: string; url: string };
type AboutData = {
  title: string;
  subtitle?: string;
  heroImage?: string;
  body: string[];
  address?: string;
  phone?: string;
  email?: string;
  socials?: Social[];
};

const fallback: Required<AboutData> = {
  title: "Ralahami",
  subtitle: "Sri Lankan flavors, crafted with heart",
  heroImage: "/images/restaurant-hero.jpg",
  body: [
    "Ralahami started as a small family kitchen in Colombo, sharing recipes passed down for generations.",
    "We believe food should be soulful: locally-sourced ingredients, warm hospitality, and bold spices.",
    "From kottu to hoppers, every dish is prepared fresh with care — the way we cook for our own families.",
  ],
  address: "123 Galle Road, Colombo 03, Sri Lanka",
  phone: "+94 11 234 5678",
  email: "hello@ralahami.lk",
  socials: [
    { platform: "Instagram", url: "https://instagram.com/yourhandle" },
    { platform: "Facebook", url: "https://facebook.com/yourpage" },
    { platform: "TikTok", url: "https://tiktok.com/@yourhandle" },
  ],
};

export default function AboutUs() {
  const [data, setData] = useState<AboutData>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/about");
        if (r.ok) {
          const json = await r.json();
          const doc = Array.isArray(json) ? json[0] : json;
          if (doc && doc.title) setData(doc);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { title, subtitle, heroImage, body, address, phone, email, socials } = data;

  return (
    <section className="relative pb-8
  [&_.scroll-stack-inner]:pt-[8vh]
  [&_.scroll-stack-inner]:px-4
  md:[&_.scroll-stack-inner]:px-6
  lg:[&_.scroll-stack-inner]:px-8
  [&_.scroll-stack-card]:!my-6
">
      
<ScrollStack
  useWindowScroll
  itemDistance={64}
  itemStackDistance={18}
  itemScale={0.02}
  stackPosition="22%"
  scaleEndPosition="12%"
  baseScale={0.9}
  rotationAmount={0}
  blurAmount={0}
  endPaddingRem={6}   // ⬅️ was 2–3; give ~96px minimum tail
  tailMaxVh={0.45}    // ⬅️ allow up to ~45% viewport tail so the last card clears the footer
>

        {/* 1. Hero / Intro */}
        <ScrollStackItem itemClassName="h-auto min-h-[24rem] bg-white border border-neutral-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-amber-600 uppercase tracking-[0.25em] text-[10px] mb-3">About Us</p>
              <h2 className="text-3xl sm:text-4xl font-semibold">{title}</h2>
              {subtitle && <p className="mt-3 text-neutral-600">{subtitle}</p>}
              {loading && <p className="mt-4 text-sm text-neutral-500">Loading story…</p>}
            </div>
            <div className="relative h-56 sm:h-72 lg:h-80 w-full overflow-hidden rounded-3xl">
              <Image
                src={heroImage || "/images/placeholder.jpg"}
                alt={`${title} hero`}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </ScrollStackItem>

        {/* 2. Our Story */}
        <ScrollStackItem itemClassName="h-auto min-h-[24rem] bg-white border border-neutral-200">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-semibold mb-4">Our Story</h3>
            <div className="space-y-4 text-neutral-700 leading-relaxed">
              {(body?.length ? body : fallback.body).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </ScrollStackItem>

        {/* 3. Our Values */}
        <ScrollStackItem itemClassName="h-auto min-h-[24rem] bg-gradient-to-br from-amber-50 to-white border border-amber-100">
          <div>
            <h3 className="text-2xl font-semibold mb-6">Our Values</h3>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { t: "Authenticity", d: "Traditional recipes, modern techniques." },
                { t: "Freshness", d: "Seasonal, locally sourced ingredients." },
                { t: "Hospitality", d: "Every guest treated like family." },
                { t: "Consistency", d: "Quality you can taste every visit." },
                { t: "Sustainability", d: "Reducing waste & supporting local growers." },
                { t: "Community", d: "A gathering place for Colombo." },
              ].map((v, i) => (
                <li key={i} className="p-5 rounded-2xl border border-amber-200 bg-white/70">
                  <p className="font-medium">{v.t}</p>
                  <p className="text-sm text-neutral-600 mt-1">{v.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </ScrollStackItem>

        {/* 4. Chef’s Note */}
        <ScrollStackItem itemClassName="h-auto min-h-[24rem] bg-white border border-neutral-200">
          <div className="grid lg:grid-cols-[1fr,280px] gap-8 items-center">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Chef’s Note</h3>
              <p className="text-neutral-700 leading-relaxed">
                “Spice isn’t just heat — it’s balance, aroma, and soul. We toast, grind, and blend our masalas fresh,
                so every plate sings with character. I hope you taste the care in every bite.”
              </p>
              <p className="mt-3 text-sm text-neutral-500">— Head Chef, Ralahami</p>
            </div>
            <div className="relative h-44 w-full overflow-hidden rounded-2xl">
              <Image src="/images/chef.jpg" alt="Chef portrait" fill className="object-cover" />
            </div>
          </div>
        </ScrollStackItem>

        {/* 5. Hours, Location & Contact */}
        <ScrollStackItem itemClassName="h-auto min-h-[24rem] bg-white border border-neutral-200">
          <div className="grid sm:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Visit Us</h3>
              <p className="text-neutral-700">{address || fallback.address}</p>
              <div className="mt-4 text-sm text-neutral-600 space-y-1">
                <p>Mon–Thu: 11:00 – 22:00</p>
                <p>Fri–Sun: 11:00 – 23:00</p>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">Contact</h3>
              <div className="text-neutral-700 space-y-1">
                <p>Phone: {phone || fallback.phone}</p>
                <p>Email: {email || fallback.email}</p>
              </div>

              {(socials?.length ?? 0) > 0 || fallback.socials.length > 0 ? (
                <div className="mt-5">
                  <p className="text-sm font-medium mb-2">Follow us</p>
                  <ul className="flex flex-wrap gap-3">
                    {(socials?.length ? socials : fallback.socials).map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-700 hover:text-amber-500 underline underline-offset-4"
                        >
                          {s.platform}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </ScrollStackItem>
      </ScrollStack>
    </section>
  );
}
