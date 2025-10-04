// Hero.tsx
"use client";

import Link from "next/link";
import { ReactTyped } from "react-typed";
import dynamic from "next/dynamic";

// ⛔ import Masonry directly
const Masonry = dynamic(() => import("./Masonry"), { ssr: false });

const items = [
  { id: "1", img: "https://i.pinimg.com/1200x/9a/55/dc/9a55dcc0af24ad05f76206bf8bb3363a.jpg", url: "", height: 500 },
  { id: "2", img: "https://i.pinimg.com/1200x/bd/b5/f0/bdb5f00f018cf9b116809bbaac190983.jpg", url: "https://example.com/two", height: 300 },
  { id: "3", img: "https://picsum.photos/id/1020/600/800?grayscale", url: "https://example.com/three", height: 700 },

  { id: "4", img: "https://i.pinimg.com/1200x/9a/55/dc/9a55dcc0af24ad05f76206bf8bb3363a.jpg", url: "", height: 450 },
  { id: "5", img: "https://i.pinimg.com/1200x/bd/b5/f0/bdb5f00f018cf9b116809bbaac190983.jpg", url: "https://example.com/two", height: 350 },
  { id: "6", img: "https://picsum.photos/id/1020/600/800?grayscale", url: "https://example.com/three", height: 600 },

  { id: "7", img: "https://i.pinimg.com/1200x/9a/55/dc/9a55dcc0af24ad05f76206bf8bb3363a.jpg", url: "", height: 800 },
  { id: "8", img: "https://i.pinimg.com/1200x/bd/b5/f0/bdb5f00f018cf9b116809bbaac190983.jpg", url: "https://example.com/two", height: 280 },
  { id: "9", img: "https://picsum.photos/id/1020/600/800?grayscale", url: "https://example.com/three", height: 750 },
];


const Hero = () => {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      {/* Masonry Background */}
      <div className="absolute inset-0 z-0 ">
        <Masonry
          items={items}
          ease="power3.out"
          duration={0.6}
          stagger={0.05}
          animateFrom="bottom"
          scaleOnHover={false}
          blurToFocus={true}
          colorShiftOnHover={false}
        />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center text-amber-200 max-w-3xl px-4">
        <h1 className="text-4xl sm:text-6xl font-bold drop-shadow-md">
          <ReactTyped
            strings={[
              "Sri Lankan Flavors, Crafted with Heart",
              "From Hoppers to Seafood Feasts",
              "Authentic, Seasonal, and Local",
            ]}
            typeSpeed={50}
            backSpeed={30}
            loop
          />
        </h1>

        <p className="mt-4 text-lg text-gray-200 drop-shadow">
          Taste the tradition. Fresh. Authentic. Made from scratch.
        </p>

        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/reservation"
            className="px-6 py-3 rounded-full bg-amber-600 hover:bg-amber-700 text-sm font-medium transition"
          >
            Reserve a Table
          </Link>
          <Link
            href="/products"
            className="px-6 py-3 rounded-full border border-gray-900 text-sm font-medium hover:bg-gray-900 hover:text-white transition"
          >
            Order Takeaway
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
