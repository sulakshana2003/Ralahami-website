import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCart } from "@/hooks/useCart";

type ProductItem = {
  id?: string;
  _id?: string;
  slug: string;
  name: string;
  images?: string[];
  image?: string;
  price: number;
  promotion?: number;
  finalPrice?: number;
  stock?: number;
};

function normalize(p: ProductItem) {
  return {
    id: String(p.id ?? p._id ?? p.slug),
    slug: p.slug,
    name: p.name,
    images: p.images,
    image: p.image ?? p.images?.[0],
    price: p.price,
    promotion: p.promotion,
    finalPrice: p.finalPrice,
    stock: p.stock,
  };
}

export default function AddToCartButton({
  product,
  className,
}: {
  product: ProductItem;
  className?: string;
}) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const [qty, setQtyLocal] = useState(1);

  const onAdd = () => {
    const prevQty = items.find((i) => i.slug === product.slug)?.qty ?? 0;
    add(normalize(product), qty);

    toast.custom((t) => (
      <div
        className={`pointer-events-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg transition-all ${
          t.visible ? "animate-in fade-in slide-in-from-top-2" : "animate-out fade-out"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">🛒</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Added <span className="font-semibold">{product.name}</span> × {qty}
            </p>
            <div className="mt-2 flex gap-2">
              <Link
                href="/cart"
                onClick={() => toast.dismiss(t.id)}
                className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                View cart
              </Link>
              <button
                onClick={() => {
                  if (prevQty > 0) setQty(product.slug, prevQty);
                  else remove(product.slug);
                  toast.dismiss(t.id);
                }}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
              >
                Undo
              </button>
            </div>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
    ), { duration: 2500 });

    if ("vibrate" in navigator) { try { (navigator as any).vibrate?.(10); } catch {} }
  };

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQtyLocal(Math.max(1, parseInt(e.target.value || "1", 10)))}
        className="w-16 rounded-full border border-neutral-300 px-3 py-2 text-sm"
      />
      <button
        onClick={onAdd}
        className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Add to cart
      </button>
    </div>
  );
}
