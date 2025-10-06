"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Image from "next/image";
import SpotlightCard from "./reactbits/SpotlightCard";

// Promotion type
interface Promotion {
  _id: string;
  title: string;
  desc: string;
  cta: string;
  link?: string;
  image?: string;
}

const Promotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromotions() {
      try {
        const res = await axios.get("/api/promotions"); // ✅ Next.js API
        setPromotions(res.data || []);
      } catch (err) {
        console.error("❌ Failed to load promotions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPromotions();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-neutral-50 text-center">
        <p className="text-neutral-500">Loading promotions...</p>
      </section>
    );
  }

  return (
    <section className="py-20 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="uppercase text-xs tracking-[0.25em] text-amber-600">
            Deals
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold">
            Promotions
          </h2>
          <p className="mt-3 text-base text-neutral-600">
            Check out our latest offers
          </p>
        </div>

        {promotions.length === 0 ? (
          <p className="text-center text-neutral-500">
            No promotions available right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((p) => {
              const href =
                p.link || (p.title === "Loyalty Members" ? "/login" : "/products");
              return (
                <SpotlightCard
                  key={p._id}
                  className="custom-spotlight-card group"
                  spotlightColor="rgba(0, 229, 255, 0.2)"
                >
                  {/* Optional promo image */}
                  {p.image && (
                    <div className="relative w-full h-40 mb-6 rounded-2xl overflow-hidden">
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 33vw"
                      />
                    </div>
                  )}

                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-neutral-300 leading-relaxed">
                    {p.desc}
                  </p>

                  <Link
                    href={href}
                    className="mt-6 inline-flex items-center gap-1 text-amber-400 font-medium hover:underline"
                  >
                    {p.cta} <span aria-hidden>→</span>
                  </Link>
                </SpotlightCard>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Promotions;
