/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import React from "react";
import { GetServerSideProps } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../../src/components/ProductCard";
import { dbConnect } from "../../lib/db";
import Product from "../../models/Product";
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
  stock: number;
  isSignatureToday: boolean;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
  finalPrice: number;
};

type Props = { products: ProductItem[] };

const ProductsPage: React.FC<Props> = ({ products }) => {
  return (
    <>
      <Head>
        <title>Menu — Ralahami</title>
      </Head>
      <Navbar />

      {/* --- Hero Section --- */}
      <section
        className="relative min-h-[90vh] flex flex-col items-center justify-center 
        bg-gradient-to-br from-amber-50 via-orange-100 to-rose-100 px-4 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl font-extrabold text-neutral-800"
        >
          Delicious Food Is Waiting For You
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-4 max-w-xl text-neutral-600"
        >
          Our team of chefs bring you the best Sri Lankan & fusion flavors
          straight to your table.
        </motion.p>

        <div className="mt-6 flex gap-4">
          <motion.a
            whileHover={{ scale: 1.05 }}
            href="#menu"
            className="rounded-full bg-amber-600 px-6 py-3 text-white font-semibold shadow-md hover:bg-amber-700"
          >
            Food Menu
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.05 }}
            href="/booking"
            className="rounded-full bg-white px-6 py-3 text-amber-600 font-semibold border border-amber-400 shadow-sm hover:bg-amber-50"
          >
            Book a Table
          </motion.a>
        </div>
      </section>

      {/* --- Menu Grid --- */}
      <section
        id="menu"
        className="relative z-10 bg-gradient-to-br from-white via-amber-50 to-white
        -mt-20 rounded-t-3xl shadow-2xl px-6 md:px-10 pt-24 pb-16"
      >
        <div className="text-center mb-12">
          <p className="uppercase tracking-[0.25em] text-amber-600 text-sm">
            Top List
          </p>
          <h2 className="mt-2 text-4xl font-bold text-neutral-800">
            Our Mainstay Menu
          </h2>
        </div>

        <motion.div
          layout
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {products.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ProductCard product={{ ...p, _id: p.id }} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* --- Services Footer-style row --- */}
      <section className="bg-gradient-to-r from-amber-50 via-white to-rose-50 py-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-2">📱</span>
            <p className="text-sm font-medium">Online Booking</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-2">🍽️</span>
            <p className="text-sm font-medium">Catering Service</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-2">💳</span>
            <p className="text-sm font-medium">Membership</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl mb-2">🛵</span>
            <p className="text-sm font-medium">Delivery Service</p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export const getServerSideProps: GetServerSideProps<{
  products: ProductItem[];
}> = async () => {
  await dbConnect();
  const docs = await Product.find({}).select("-__v").lean();
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
    stock: d.stock ?? 0,
    isSignatureToday: !!d.isSignatureToday,
    tags: d.tags ?? [],
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
    finalPrice: Math.max((d.price || 0) - (d.promotion || 0), 0),
  }));
  return { props: { products } };
};

export default ProductsPage;
