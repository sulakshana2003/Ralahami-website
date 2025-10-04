/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import CircularGallery from "./CircularGallery";

interface Product {
  _id: string;
  name: string;
  slug: string;
  images: string[];
  finalPrice?: number;
  price: number;
  promotion?: number;
}

export default function SignatureDishes() {
  const [dishes, setDishes] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const res = await axios.get("/api/products/signature");
        setDishes(res.data);
      } catch (err) {
        console.error("Error fetching signature dishes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDishes();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-white text-center">
        <p className="text-lg font-medium">Loading Signature Dishes...</p>
      </section>
    );
  }

  if (!dishes.length) {
    return (
      <section className="py-20 bg-white text-center">
        <p className="text-lg font-medium text-neutral-500">
          No signature dishes selected today.
        </p>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="uppercase text-xs tracking-[0.25em] text-amber-600">
            Highlights
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-semibold">
            Signature Dishes
          </h2>
          <p className="mt-3 text-base text-neutral-600">
            Taste our chef’s favorites
          </p>
        </div>

        {/* CircularGallery */}
        <div style={{ height: "600px", position: "relative" }}>
          <CircularGallery
            bend={3}
            textColor="#ffffff"
            borderRadius={0.05}
            scrollEase={0.02}
            items={dishes.map((d) => ({
              image: d.images?.[0] || "/images/placeholder.png",
              // 👇 combine name and price as text, since CircularGallery shows "text" under image
              text: `${d.name} – Rs. ${d.finalPrice ?? d.price}`,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
