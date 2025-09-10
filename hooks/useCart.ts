// src/hooks/useCart.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  unitPrice: number; // actual per-unit price charged
  qty: number;
  stock?: number;
};

type ProductInput = {
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

type CartState = {
  // set to true by default; if you want a hydration gate, toggle it via onRehydrateStorage
  isReady: boolean;
  items: CartItem[];

  add: (p: ProductInput, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;

  subtotal: () => number;
  totalItems: () => number;
};

// robust unit price: prefers finalPrice, else (price - promotion), clamped >= 0
function computeUnitPrice(p: { finalPrice?: number; price: number; promotion?: number }) {
  const base = p.finalPrice ?? (Number(p.price) - Number(p.promotion ?? 0));
  const num = Number(base);
  return Math.max(0, Number.isFinite(num) ? num : 0);
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      isReady: true, // set to true; if you need SSR guards, you can flip this via onRehydrateStorage
      items: [],

      add: (p, q = 1) => {
        const qty = Math.max(1, q);
        const slug = p.slug;
        const items = [...get().items];
        const i = items.findIndex((x) => x.slug === slug);

        if (i >= 0) {
          const max = items[i].stock ?? p.stock ?? Infinity;
          items[i] = { ...items[i], qty: Math.min(items[i].qty + qty, max) };
        } else {
          items.push({
            id: String(p.id ?? p._id ?? slug),
            slug,
            name: p.name,
            image: p.image ?? p.images?.[0],
            unitPrice: computeUnitPrice(p),
            qty: Math.min(qty, p.stock ?? qty),
            stock: p.stock,
          });
        }
        set({ items });
      },

      setQty: (slug, qty) => {
        const q = Math.max(1, qty);
        set({
          items: get().items.map((x) =>
            x.slug === slug ? { ...x, qty: x.stock ? Math.min(q, x.stock) : q } : x
          ),
        });
      },

      remove: (slug) => set({ items: get().items.filter((x) => x.slug !== slug) }),

      clear: () => set({ items: [] }),

      subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.qty, 0),

      totalItems: () => get().items.reduce((n, i) => n + i.qty, 0),
    }),
    {
      name: "cart:v2",
      version: 2,
      storage: createJSONStorage(() => localStorage),

      // migrate from v1 (or empty) and from legacy localStorage key "cart"
      migrate: (persisted: any, _version) => {
        // If we already have a valid v2 state, keep it.
        if (persisted && Array.isArray(persisted.items)) return persisted;

        // Try to migrate legacy "cart" array shape:
        try {
          const legacyRaw = localStorage.getItem("cart");
          if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw);
            if (Array.isArray(legacy) && legacy.length) {
              const items: CartItem[] = legacy.map((it: any) => {
                // safe unit price from legacy item
                const base = it?.finalPrice ?? (Number(it?.price) - Number(it?.promotion ?? 0));
                const num = Number(base);
                const unitPrice = Math.max(0, Number.isFinite(num) ? num : 0);

                return {
                  id: String(it.id ?? it._id ?? it.slug),
                  slug: String(it.slug),
                  name: String(it.name),
                  image: it.image,
                  unitPrice,
                  qty: Number(it.qty) || 1,
                  stock: it.stock,
                };
              });

              // clean up old key after successful migration
              localStorage.removeItem("cart");
              return { items, isReady: true };
            }
          }
        } catch {
          // ignore migration errors, fall through to empty state
        }

        return { items: [], isReady: true };
      },

      // If you want to flip isReady after hydration, uncomment this:
      // onRehydrateStorage: () => () => useCart.setState({ isReady: true }),

      // Only persist items (not methods)
      partialize: (state) => ({ items: state.items }),
    }
  )
);
