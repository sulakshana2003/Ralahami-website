// Hero.tsx
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import SplitText from "./reactbits/SplitText";

// ⛔ import Masonry directly
const Masonry = dynamic(() => import("./Masonry"), { ssr: false });

const items = [
  { id: "1", img: "https://i.pinimg.com/736x/b2/62/ca/b262ca2ad2cd6d98c7847fa1b6e10a9b.jpg", url: "", height: 500 },
  { id: "2", img: "https://i.pinimg.com/736x/f8/ba/dd/f8baddd274bf9d58d0d41ba52ac807b4.jpg", url: "https://example.com/two", height: 300 },
  { id: "3", img: "https://i.pinimg.com/1200x/3f/cd/00/3fcd00aec33ef5175823d5f52b4e8479.jpg", url: "https://example.com/three", height: 700 },
  { id: "4", img: "https://i.pinimg.com/736x/0f/98/f4/0f98f48c6099c975be6008c86c9b2ac4.jpg", url: "", height: 450 },
  { id: "5", img: "https://i.pinimg.com/736x/31/ff/0e/31ff0e7c4b2208dd13a7b62640149cc9.jpg", url: "https://example.com/two", height: 350 },
  { id: "6", img: "https://i.pinimg.com/736x/ed/0a/62/ed0a62eb758ca9ed0bb5703537a77722.jpg", url: "https://example.com/three", height: 600 },
  { id: "7", img: "https://i.pinimg.com/736x/fb/1d/a1/fb1da1b155709dba867ee46c3a48b01b.jpg", url: "", height: 800 },
  { id: "8", img: "https://i.pinimg.com/736x/ff/dd/c9/ffddc9a74ae7f33b0782c581210a1205.jpg", url: "https://example.com/two", height: 500 },
  { id: "9", img: "https://i.pinimg.com/736x/91/bf/18/91bf18e281ebda570a2269abbdf31b33.jpg", url: "https://example.com/three", height: 750 },
];

const Hero = () => {
  const handleAnimationComplete = () => {
    console.log("All letters have animated!");
  };

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
      <div className="relative z-10 text-center text-orange-800 max-w-3xl px-4">
        <SplitText
          text="Sri Lankan Flavors, Crafted with Heart"
          tag="h1"
          className="text-4xl sm:text-6xl font-bold drop-shadow-md"
          delay={100}
          duration={0.6}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
          onLetterAnimationComplete={handleAnimationComplete}
        />

        <p className="mt-4 text-lg text-orange-900 drop-shadow">
          Taste the tradition. Fresh. Authentic. Made from scratch.
        </p>

        <div className="mt-6 flex justify-center gap-4">
  <Link
    href="/reservation"
    className="px-6 py-3 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
  >
    Reserve a Table
  </Link>
  <Link
    href="/products"
    className="px-6 py-3 rounded-full border border-black text-sm font-medium text-black hover:bg-black hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
  >
    Order Takeaway
  </Link>
</div>

      </div>
    </section>
  );
};

export default Hero;
