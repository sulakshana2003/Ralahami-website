import { useState } from "react";
import { useCart } from "@/src/context/CartContext";
import type { ProductItem } from "@/src/types/cart";

export default function AddToCartButton({ product }: { product: ProductItem }) {
  const { addToCart } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
        className="w-16 rounded-full border border-neutral-300 px-3 py-2 text-sm"
      />
      <button
        onClick={() => addToCart(product, qty)}
        className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Add to cart
      </button>
    </div>
  );
}
