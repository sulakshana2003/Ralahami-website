import { useEffect, useState } from "react";
import { motion , Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

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


type Product = {
  _id: string;
  name: string;
  images: string[];
  price: number;
  promotion?: number;
  finalPrice?: number;
  isSignatureToday: boolean;
};

const SignatureDishes: React.FC = () => {
  const [dishes, setDishes] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products/signature");
        const data = await res.json();
        setDishes(data);
      } catch (err) {
        console.error("Failed to load signature dishes", err);
      }
    })();
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.25em] text-orange-500 uppercase">Seasonal highlights</p>
        <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Signature Dishes</h2>
        <p className="mt-3 text-base text-neutral-600">
          A rotating selection from our chefs. Order online or enjoy in-house.
        </p>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="hide-scrollbar -mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-2"
      >
        {dishes.map((d) => (
          <motion.article
            key={d._id}
            variants={fadeUp}
            className="group relative w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-lg transition"
          >
            <div className="relative h-44 w-full">
              <Image
                src={d.images?.[0] || "/images/placeholder.png"}
                alt={d.name}
                fill
                className="object-cover transition group-hover:scale-105"
              />
              <span className="absolute left-2 top-2 rounded-full bg-orange-500 text-white px-2 py-1 text-[10px] font-medium shadow">
                Signature
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-base font-semibold">{d.name}</h3>
              <p className="mt-1 text-sm text-neutral-600">
                {d.finalPrice ?? d.price} LKR
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Link href={`/products/`} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                  See details →
                </Link>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
};

export default SignatureDishes;
