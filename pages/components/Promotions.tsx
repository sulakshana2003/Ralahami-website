"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import ScrollStack, { ScrollStackItem } from "./reactbits/ScrollStack";
import Image from "next/image";

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
          <ScrollStack>
            {promotions.map((p) => (
              <ScrollStackItem
                key={p._id}
                itemClassName="bg-white shadow-lg p-10 text-center"
              >
                {/* Optional promo image */}
                {p.image && (
                  <div className="relative w-full h-40 mb-6">
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      className="object-cover rounded-2xl"
                    />
                  </div>
                )}

                <h3 className="text-xl font-semibold">{p.title}</h3>
                <p className="mt-3 text-neutral-600">{p.desc}</p>

                <Link
                  href={p.link || (p.title === "Loyalty Members" ? "/login" : "/products")}
                  className="mt-6 inline-block text-amber-600 font-medium hover:underline"
                >
                  {p.cta} →
                </Link>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        )}
      </div>
    </section>
  );
};

export default Promotions;
