/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import React from "react";
import type { GetServerSideProps } from "next";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProductCard from "../../src/components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";

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

// ---------- Helpers ----------
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const ProductsPage: React.FC<Props> = ({ products }) => {
  // ------- Derived meta (categories, price range) -------
  const categories = React.useMemo(
    () => ["All", ...uniq(products.map((p) => p.category || "Uncategorized")).filter(Boolean)],
    [products]
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [onlySignature, setOnlySignature] = React.useState(false);
  const [sort, setSort] = React.useState<"relevance" | "price-asc" | "price-desc" | "spicy-desc">(
    "relevance"
  );

  // ------- Filtering & sorting -------
  const visible = React.useMemo(() => {
    let list = products;

    // category
    if (activeCategory !== "All") {
      list = list.filter((p) => (p.category || "Uncategorized") === activeCategory);
    }

    // signature today
    if (onlySignature) list = list.filter((p) => p.isSignatureToday);

    // search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    // sort
    const sorted = [...list];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.finalPrice - b.finalPrice);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.finalPrice - a.finalPrice);
        break;
      case "spicy-desc":
        sorted.sort((a, b) => b.spicyLevel - a.spicyLevel);
        break;
      default:
        // relevance: gently prioritize signature + search hit in name
        sorted.sort((a, b) => {
          const score = (x: ProductItem) =>
            (x.isSignatureToday ? 2 : 0) +
            (q && x.name.toLowerCase().includes(q) ? 1 : 0) +
            (x.promotion > 0 ? 0.2 : 0);
          return score(b) - score(a);
        });
    }

    return sorted;
  }, [products, activeCategory, onlySignature, searchQuery, sort]);

  const hasActiveFilter = activeCategory !== "All" || onlySignature || !!searchQuery;

  return (
    <>
      <Head>
        <title>Menu — Ralahami</title>
        <meta name="description" content="Explore Ralahami’s handcrafted Sri Lankan & fusion menu." />
      </Head>

      <Navbar />

      {/* ---------- Hero ---------- */}
      <section className="relative w-full min-h-[70vh] md:min-h-[78vh] flex items-center justify-center overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/prodB.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-label="Background video of dishes being prepared"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-white"
          >
            Dishes Crafted to Delight
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
            className="mt-4 mx-auto max-w-2xl text-neutral-100/90"
          >
            Sri Lankan soul, modern technique. Discover our signature plates and seasonal specials.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 flex justify-center"
          >
            <label htmlFor="search" className="sr-only">
              Search dishes
            </label>
            <div className="relative w-full max-w-xl">
              <input
                id="search"
                type="text"
                placeholder="Search dishes, tags, or descriptions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl bg-white/95 backdrop-blur px-5 py-3.5 pr-12 text-black shadow-xl outline-none ring-1 ring-white/30 placeholder:text-neutral-500 focus:ring-2 focus:ring-amber-400"
              />
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
                <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Search" viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C15.99 6.01 13 3 9.5 3S3 6.01 3 9.5 6.01 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
                  />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a
              href="#menu"
              className="rounded-full bg-amber-600 px-6 py-3 text-white text-sm font-semibold shadow-md transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              View Menu
            </a>
            <a
              href="/booking"
              className="rounded-full border border-white/50 bg-white/10 px-6 py-3 text-white text-sm font-semibold shadow-md backdrop-blur transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Book a Table
            </a>
          </div>
        </div>
      </section>

      {/* ---------- Filters + Menu ---------- */}
      <section
        id="menu"
        className="relative -mt-10 rounded-t-[2rem] bg-gradient-to-b from-white via-amber-50/40 to-white px-6 pb-20 pt-16 shadow-[0_-30px_60px_-30px_rgba(0,0,0,0.2)] md:px-10"
      >
        {/* Filter bar */}
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                {visible.length} items
              </span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("All");
                    setOnlySignature(false);
                    setSearchQuery("");
                    setSort("relevance");
                  }}
                  className="text-xs text-neutral-600 underline underline-offset-4 hover:text-neutral-800"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category pills */}
              <div className="flex w-full flex-wrap gap-2 md:w-auto">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={activeCategory === c}
                    onClick={() => setActiveCategory(c)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm transition",
                      activeCategory === c
                        ? "border-amber-500 bg-amber-500 text-white shadow"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Signature toggle */}
              <label className="ml-auto flex cursor-pointer select-none items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-700 hover:border-neutral-300 md:ml-0">
                <input
                  type="checkbox"
                  checked={onlySignature}
                  onChange={(e) => setOnlySignature(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-amber-600 focus:ring-amber-400"
                />
                Signature today
              </label>

              {/* Sort */}
              <div className="relative">
                <label htmlFor="sort" className="sr-only">
                  Sort
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-700 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                  <option value="spicy-desc">Spicy: High → Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active filter chips (accessibility & clarity) */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {searchQuery && (
              <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
                Search: “{searchQuery}”
                <button
                  className="rounded-full p-1 hover:bg-neutral-200"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              </span>
            )}
            {activeCategory !== "All" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
                Category: {activeCategory}
                <button
                  className="rounded-full p-1 hover:bg-neutral-200"
                  aria-label="Clear category"
                  onClick={() => setActiveCategory("All")}
                >
                  ✕
                </button>
              </span>
            )}
            {onlySignature && (
              <span className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">
                Signature today
                <button
                  className="rounded-full p-1 hover:bg-neutral-200"
                  aria-label="Clear signature filter"
                  onClick={() => setOnlySignature(false)}
                >
                  ✕
                </button>
              </span>
            )}
          </div>

{/* Grid */}
<motion.div
  variants={container}
  initial="hidden"
  animate="show"
  className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8"
>
  <AnimatePresence mode="popLayout">
    {visible.map((p) => (
      <motion.div
        key={p.id}
        layout
        variants={item}
        whileHover={{ y: -4 }}
        className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg focus-within:ring-2 focus-within:ring-amber-400"
      >
        {/* Accent top bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 opacity-70" />

        {/* Subtle hover sheen */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(1200px 300px at 80% -10%, rgba(251,191,36,0.12), transparent 60%)",
          }}
        />

        {/* Card content */}
        <div className="relative">
          <ProductCard product={{ ...p, _id: p.id }} />
        </div>

        {/* Badges */}
        <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2">
          {p.isSignatureToday ? (
            <span className="rounded-full bg-amber-600/95 px-3 py-1 text-[11px] font-semibold text-white shadow">
              Signature
            </span>
          ) : null}
          {p.promotion > 0 ? (
            <span className="rounded-full bg-emerald-600/95 px-3 py-1 text-[11px] font-semibold text-white shadow">
              LKR {p.promotion} off
            </span>
          ) : null}
        </div>
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>

          {/* Empty state */}
          {visible.length === 0 && (
            <div className="mx-auto mt-24 max-w-md rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-amber-100/70 grid place-items-center">
                <span className="text-2xl">🔎</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-800">No dishes match your filters</h3>
              <p className="mt-1 text-sm text-neutral-600">
                Try clearing filters or searching for another dish.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("All");
                  setOnlySignature(false);
                  setSearchQuery("");
                  setSort("relevance");
                }}
                className="mt-4 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
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
