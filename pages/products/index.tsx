/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import React from "react";
import type { GetServerSideProps } from "next";
import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";
import ProductCard from "../../src/components/ProductCard";
import { motion } from "framer-motion";

type ProductItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: string[];
  price: number;
  promotion: number;
  category: string | null;
  spicyLevel: number;
  isAvailable: boolean;
  isSignatureToday: boolean;
  tags: string[];
  finalPrice: number;
};

type Props = { products: ProductItem[] };

const ProductsPage: React.FC<Props> = ({ products }) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>Menu — Ralahami</title>
      </Head>
      <Navbar />

      {/* Hero */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center text-center overflow-hidden">
        <video className="absolute inset-0 w-full h-full object-cover" src="/videos/prodB.mp4" autoPlay muted loop playsInline />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-4">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-6xl font-extrabold text-white"
          >
            Delicious Food Is Waiting For You
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-4 max-w-xl mx-auto text-neutral-100"
          >
            Our team of chefs bring you the best Sri Lankan & fusion flavors.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 flex justify-center">
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 rounded-full px-5 py-3 text-black focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </motion.div>
          <div className="mt-6 flex gap-4 justify-center">
            <motion.a whileHover={{ scale: 1.05 }} href="#menu" className="rounded-full bg-amber-600 px-6 py-3 text-white font-semibold shadow-md hover:bg-amber-700">
              Food Menu
            </motion.a>
            <motion.a whileHover={{ scale: 1.05 }} href="/booking" className="rounded-full bg-white px-6 py-3 text-amber-600 font-semibold border border-amber-400 shadow-sm hover:bg-amber-50">
              Book a Table
            </motion.a>
          </div>
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="relative z-10 bg-gradient-to-br from-white via-amber-50 to-white -mt-20 rounded-t-3xl shadow-2xl px-6 md:px-10 pt-24 pb-16">
        <div className="text-center mb-12">
          <p className="uppercase tracking-[0.25em] text-amber-600 text-sm">Top List</p>
          <h2 className="mt-2 text-4xl font-bold text-neutral-800">Our Mainstay Menu</h2>
        </div>
        <motion.div layout className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={{ once: true }}>
          {filteredProducts.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <ProductCard product={{ ...p, _id: p.id }} />
            </motion.div>
          ))}
        </motion.div>
        {filteredProducts.length === 0 && (
          <div className="text-center text-neutral-600 mt-16">No dishes match your selection.</div>
        )}
      </section>

      <Footer />
    </>
  );
};

export const getServerSideProps: GetServerSideProps<{ products: ProductItem[] }> = async () => {
  // Import server-only modules INSIDE the function to avoid client bundling
  const { dbConnect } = await import("../../lib/db");
  const Product = (await import("../../models/Product")).default;

  await dbConnect();

  // ✅ Only fetch items that are available
  const docs: any[] = await Product.find({ isAvailable: true }).select("-__v").lean();

  const products: ProductItem[] = docs.map((d: any) => ({
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    description: d.description ?? null,
    images: d.images ?? [],
    price: d.price,
    promotion: d.promotion ?? 0,
    category: d.category ?? null,
    spicyLevel: d.spicyLevel ?? 0,
    isAvailable: !!d.isAvailable,
    isSignatureToday: !!d.isSignatureToday,
    tags: d.tags ?? [],
    finalPrice: Math.max((d.price || 0) - (d.promotion || 0), 0),
  }));

  return { props: { products } };
};

export default ProductsPage;
