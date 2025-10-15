// pages/products/[slug].tsx
/* eslint-disable react/no-unescaped-entities, no-underscore-dangle */
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useCart } from "@/hooks/useCart";

/* ----------------------------- Types ----------------------------- */
type Product = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  images?: string[];
  price: number;            // base LKR price
  promotion?: number;       // ABS LKR, or mistakenly percent/fraction (handled)
  category?: string;
  spicyLevel?: number;      // 0..3
  isAvailable?: boolean;
  isSignatureToday?: boolean;
  tags?: string[];
};

type Related = Pick<
  Product,
  "_id" | "slug" | "name" | "images" | "price" | "promotion" | "isAvailable"
>;

type Props = { product: Product | null; related: Related[] };

/* ----------------------------- Utils ----------------------------- */
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const currencyLKR = (amount: number) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(amount);

/** Robust price logic */
function computePrices(price: number, promotion?: number) {
  const base = Number(price) || 0;
  const promo = Math.max(0, Number(promotion) || 0);

  // 1) absolute off
  let display = Math.max(0, base - promo);

  // 2) fallback encodings (fraction/percent)
  if (promo > 0 && display === base) {
    const asFraction = Math.max(0, base - base * promo); // e.g. 0.15
    const asPercent = Math.max(0, base - (base * promo) / 100); // e.g. 15
    display = Math.min(display, asFraction, asPercent);
  }

  display = Math.round(display * 100) / 100;
  const discount = base - display;
  const showOriginal = discount >= 1;
  const originalPrice = showOriginal ? base : 0;
  const savePercent =
    showOriginal && base > 0
      ? Math.min(100, Math.max(0, Math.round((discount / base) * 100)))
      : 0;

  return { displayPrice: display, originalPrice, savePercent };
}

/* -------------------------- Server Side -------------------------- */
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slugParam = ctx.params?.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
  if (!slug) return { notFound: true };

  const { dbConnect } = await import("@/lib/db");
  const ProductModel = (await import("@/models/Product")).default as any;

  await dbConnect();

  const doc = await ProductModel.findOne({ slug }, { __v: 0 }).lean();
  if (!doc) return { notFound: true };

  const product: Product = {
    _id: String(doc._id),
    slug: String(doc.slug),
    name: String(doc.name),
    description: doc.description ?? "",
    images: Array.isArray(doc.images) ? doc.images.filter(Boolean) : [],
    price: Number(doc.price) || 0,
    promotion: typeof doc.promotion === "number" ? doc.promotion : 0,
    category: doc.category ?? "",
    spicyLevel: typeof doc.spicyLevel === "number" ? doc.spicyLevel : 0,
    isAvailable: !!doc.isAvailable,
    isSignatureToday: !!doc.isSignatureToday,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
  };

  // Related: same category, available, exclude current
  let related: Related[] = [];
  if (product.category) {
    const relDocs = await ProductModel.find(
      { category: product.category, isAvailable: true, slug: { $ne: product.slug } },
      { _id: 1, slug: 1, name: 1, images: 1, price: 1, promotion: 1, isAvailable: 1 }
    )
      .sort({ isSignatureToday: -1, createdAt: -1 })
      .limit(5)
      .lean();

    related = (relDocs || []).map((d: any) => ({
      _id: String(d._id),
      slug: String(d.slug),
      name: String(d.name),
      images: Array.isArray(d.images) ? d.images.filter(Boolean) : [],
      price: Number(d.price) || 0,
      promotion: typeof d.promotion === "number" ? d.promotion : 0,
      isAvailable: !!d.isAvailable,
    }));
  }

  return { props: { product, related } };
};

/* ---------------------------- Page ---------------------------- */
export default function ProductSlugPage({
  product,
  related,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({
    open: false,
    msg: "",
  });

  // Zustand-style cart interop (works with your /cart.tsx)
  const addFromStore = useCart((s: any) => s.add);
  const setQtyInStore = useCart((s: any) => s.setQty);
  const getState = (useCart as any).getState?.bind(useCart);

  const imgs = useMemo(
    () => (product?.images?.length ? product.images : ["/images/placeholder.png"]),
    [product?.images]
  );

  if (!product) {
    return (
      <>
        <Head>
          <title>Menu — Ralahami</title>
        </Head>
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-28 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            We couldn't find that product.
          </h1>
          <p className="mt-2 text-slate-600">
            It may have been moved or is temporarily unavailable.
          </p>
          <div className="mt-6">
            <Link
              href="/products"
              className="rounded-xl border px-5 py-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              Browse menu
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { displayPrice, originalPrice, savePercent } = computePrices(
    product.price,
    product.promotion
  );

  const pageTitle = `${product.name} • Ralahami.lk`;
  const pageDesc =
    product.description?.slice(0, 160) || `Explore ${product.name} at Ralahami.lk.`;
  const canonical = `/products/${encodeURIComponent(product.slug)}`;

  function handleAddToCart() {
    if (!product.isAvailable) return;

    const image = imgs[0] || "/images/placeholder.png";
    const unit = Number(displayPrice) || 0;
    const addQty = clamp(Number(qty) || 1, 1, 99);

    const payload = {
      slug: product.slug,
      id: product._id,              // keep an id for downstream use
      name: product.name,
      image,
      imageUrl: image,
      unitPrice: unit,
      price: unit,
      qty: addQty,
    };

    // Try Zustand store first
    let added = false;
    try {
      if (typeof addFromStore === "function") {
        try {
          addFromStore(payload); // object signature
          added = true;
        } catch {
          try {
            addFromStore(product.slug, product.name, image, unit, addQty); // positional signature
            added = true;
          } catch {}
        }
      }
    } catch {}

    // Ensure desired quantity (some stores add 1 by default)
    try {
      if (added && typeof setQtyInStore === "function" && typeof getState === "function") {
        const items = getState()?.items ?? [];
        const current = items.find((it: any) => it.slug === product.slug);
        const currentQty = Number(current?.qty || 0);
        setQtyInStore(product.slug, currentQty > 0 ? currentQty + (addQty - 1) : addQty);
      }
    } catch {}

    // Fallback to localStorage if store missing
    if (!added) {
      try {
        const key = "cart";
        const raw = localStorage.getItem(key);
        let list: any[] = [];
        try {
          list = raw ? JSON.parse(raw) : [];
        } catch {
          list = [];
        }
        const idx = list.findIndex((x) => x.slug === payload.slug);
        if (idx >= 0) {
          list[idx].qty = clamp((Number(list[idx].qty) || 1) + addQty, 1, 999);
          list[idx].unitPrice =
            Number(list[idx].unitPrice ?? payload.unitPrice) || payload.unitPrice;
          list[idx].price = Number(list[idx].price ?? payload.price) || payload.price;
          if (!list[idx].image) list[idx].image = payload.image;
        } else {
          list.push(payload);
        }
        localStorage.setItem(key, JSON.stringify(list));
        window.dispatchEvent(new Event("storage"));
        added = true;
      } catch {}
    }

    if (added) {
      setToast({ open: true, msg: `Added ${addQty} × ${product.name}` });
      window.setTimeout(() => setToast({ open: false, msg: "" }), 2500);
    }
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={imgs[0]} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={imgs[0]} />
      </Head>

      <Navbar />

      <div className="bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-50 via-white to-emerald-50">
        {/* room for fixed navbar */}
        <div className="h-24 md:h-28" />

        <main className="mx-auto max-w-6xl px-4 pb-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Media */}
            <section className="md:sticky md:top-28 self-start">
              <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-lg shadow-emerald-100/30">
                <img
                  src={imgs[activeIdx]}
                  alt={product.name}
                  className="aspect-[4/3] w-full object-cover"
                  onError={(e) =>
                    ((e.currentTarget as HTMLImageElement).src = "/images/placeholder.png")
                  }
                />

                <div className="absolute left-3 top-3 flex gap-2">
                  {product.isAvailable ? (
                    <span className="rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white shadow">
                      In Stock
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-600/90 px-3 py-1 text-xs font-semibold text-white shadow">
                      Out of Stock
                    </span>
                  )}
                  {product.isSignatureToday && (
                    <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white shadow">
                      Chef’s Special
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
                {imgs.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    aria-label={`Preview image ${i + 1}`}
                    className={`overflow-hidden rounded-xl border transition focus:outline-none focus:ring-2 ${
                      activeIdx === i
                        ? "border-emerald-500 ring-emerald-200"
                        : "border-slate-200 hover:border-emerald-300"
                    }`}
                    onClick={() => setActiveIdx(i)}
                  >
                    <img
                      src={src}
                      alt={`thumb-${i + 1}`}
                      className="aspect-square w-full object-cover"
                      onError={(e) =>
                        ((e.currentTarget as HTMLImageElement).src =
                          "/images/placeholder.png")
                      }
                    />
                  </button>
                ))}
              </div>
            </section>

            {/* Details */}
            <section>
              <div className="mb-1 inline-flex items-center gap-2">
                {typeof product.spicyLevel === "number" && (
                  <SpicyBadge level={product.spicyLevel} />
                )}
                {product.category && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                    {product.category}
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                {product.name}
              </h1>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <div className="text-4xl font-extrabold tracking-tight text-emerald-700">
                  {currencyLKR(displayPrice)}
                </div>
                {originalPrice > 0 && originalPrice !== displayPrice && (
                  <>
                    <div className="text-lg text-slate-400 line-through">
                      {currencyLKR(originalPrice)}
                    </div>
                    {savePercent > 0 && (
                      <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Save {savePercent}%
                      </div>
                    )}
                  </>
                )}
              </div>

              <p className="mt-4 leading-7 text-slate-700">
                {product.description || "No description provided yet."}
              </p>

              {Array.isArray(product.tags) && product.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {product.tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Qty + Actions */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-slate-300 bg-white">
                  <button
                    type="button"
                    className="h-10 w-10 leading-none hover:bg-slate-50"
                    onClick={() => setQty((q) => clamp(q - 1, 1, 99))}
                    aria-label="Decrease quantity"
                  >
                    –
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={qty}
                    onChange={(e) =>
                      setQty(clamp(parseInt(e.target.value || "1", 10), 1, 99))
                    }
                    className="h-10 w-16 border-x border-slate-300 text-center text-sm outline-none"
                  />
                  <button
                    type="button"
                    className="h-10 w-10 leading-none hover:bg-slate-50"
                    onClick={() => setQty((q) => clamp(q + 1, 1, 99))}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!product.isAvailable}
                  onClick={handleAddToCart}
                  className={`rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition
                    ${
                      product.isAvailable
                        ? "bg-black text-white hover:opacity-90 active:scale-[0.99]"
                        : "bg-slate-300 text-slate-600 cursor-not-allowed"
                    }`}
                >
                  {product.isAvailable ? "Add to Cart" : "Unavailable"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/products/${encodeURIComponent(
                            product.slug
                          )}`
                        : `/products/${encodeURIComponent(product.slug)}`;
                    if (navigator.share) {
                      navigator
                        .share({
                          title: product.name,
                          text: product.description || "Check this out!",
                          url,
                        })
                        .catch(() => {});
                    } else {
                      navigator.clipboard
                        .writeText(url)
                        .then(() => setToast({ open: true, msg: "Link copied!" }));
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition"
                >
                  Share
                </button>
              </div>

              {/* Related */}
              <section className="mt-14">
                <h2 className="mb-5 text-lg font-semibold text-slate-900">
                  You may also like
                </h2>
                {related.length === 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className="group rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md"
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-100" />
                        <div className="mt-3 h-3 w-3/4 rounded bg-slate-100 group-hover:bg-emerald-50 transition" />
                        <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 group-hover:bg-emerald-50 transition" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {related.map((r) => {
                      const { displayPrice: rp, originalPrice: ro } = computePrices(
                        r.price,
                        r.promotion
                      );
                      const img = r.images?.[0] || "/images/placeholder.png";
                      return (
                        <Link
                          href={`/products/${encodeURIComponent(r.slug)}`}
                          key={r._id}
                          className="group block rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:shadow-md"
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                            <Image src={img} alt={r.name} fill className="object-cover" />
                          </div>
                          <div className="mt-3 line-clamp-1 text-sm font-medium text-slate-900">
                            {r.name}
                          </div>
                          <div className="mt-1 text-xs">
                            <div className="font-semibold text-emerald-700">
                              {currencyLKR(rp)}
                            </div>
                            {ro > 0 && ro !== rp && (
                              <div className="text-slate-400 line-through">
                                {currencyLKR(ro)}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>
          </div>
        </main>
      </div>

      {/* Non-blocking toast (kept under navbar z-index so it won't block it) */}
      <div
        className={`fixed bottom-6 right-6 z-40 transition-all ${
          toast.open ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
        }`}
        aria-live="polite"
      >
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <span className="text-lg">🛒</span>
          <div className="text-sm text-neutral-900">{toast.msg}</div>
          <Link
            href="/cart"
            className="ml-2 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            View cart
          </Link>
          <button
            onClick={() => setToast({ open: false, msg: "" })}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Undo
          </button>
          <button
            onClick={() => setToast({ open: false, msg: "" })}
            className="ml-1 text-neutral-400 hover:text-neutral-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <Footer />
    </>
  );
}

/* ------------------------ Tiny component ------------------------ */
function SpicyBadge({ level = 0 }: { level?: number }) {
  const l = clamp(level ?? 0, 0, 3);
  const titles = ["Not spicy", "Mild", "Medium", "Hot"];
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium bg-white/70 backdrop-blur border-emerald-100 text-emerald-700"
      title={titles[l]}
      aria-label={`Spiciness: ${titles[l]}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block">
        <path
          d="M12 2c1.657 0 3 1.343 3 3 0 2-3 3-3 6 0-3-3-4-3-6 0-1.657 1.343-3 3-3zm0 0c-3 0-5 2-5 5 0 6 5 8 5 15 0-7 5-9 5-15 0-3-2-5-5-5z"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
      <span>Spicy:</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className={`mx-[1px] inline-block h-2 w-2 rounded-full ${
            i < l ? "bg-emerald-600" : "bg-emerald-200"
          }`}
        />
      ))}
    </div>
  );
}
