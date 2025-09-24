import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** ----- user key helpers ----- */
const ANON_KEY = "cart:anonId";
const AUTH_UID_KEY = "auth:uid";

function ensureAnonId(): string {
  if (typeof window === "undefined") return "anon-ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = `anon-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function getUserKey(): string {
  if (typeof window === "undefined") return "anon-ssr";
  return localStorage.getItem(AUTH_UID_KEY) || ensureAnonId();
}

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  unitPrice: number;
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
  items: CartItem[];
  add: (p: ProductInput, qty?: number) => void;       // C (Create)
  setQty: (slug: string, qty: number) => void;        // U (Update)
  remove: (slug: string) => void;                     // D (Delete)
  clear: () => void;                                  // D (Delete all)
  subtotal: () => number;                             // R (Read aggregate)
  totalItems: () => number;                           // R (Read aggregate)
};

function computeUnitPrice(p: { finalPrice?: number; price: number; promotion?: number }) {
  const base = p.finalPrice ?? (Number(p.price) - Number(p.promotion ?? 0));
  const num = Number(base);
  return Math.max(0, Number.isFinite(num) ? num : 0);
}

/** storage that appends :<userKey> to persist name */
const userScopedStorage = createJSONStorage(() => ({
  getItem: (name: string) => localStorage.getItem(`${name}:${getUserKey()}`),
  setItem: (name: string, value: string) => localStorage.setItem(`${name}:${getUserKey()}`, value),
  removeItem: (name: string) => localStorage.removeItem(`${name}:${getUserKey()}`),
}));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (p, q = 1) => {
        const qty = Math.max(1, q);
        const items = [...get().items];
        const idx = items.findIndex((x) => x.slug === p.slug);
        if (idx >= 0) {
          const max = items[idx].stock ?? p.stock ?? Infinity;
          items[idx] = { ...items[idx], qty: Math.min(items[idx].qty + qty, max) };
        } else {
          items.push({
            id: String(p.id ?? p._id ?? p.slug),
            slug: p.slug,
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
      storage: userScopedStorage,
      partialize: (s) => ({ items: s.items }),
      migrate: (persisted: any) => {
        if (persisted && Array.isArray(persisted.items)) return persisted;
        try {
          const legacyRaw = localStorage.getItem("cart");
          if (legacyRaw) {
            const legacy = JSON.parse(legacyRaw);
            if (Array.isArray(legacy) && legacy.length) {
              const items: CartItem[] = legacy.map((it: any) => {
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
              localStorage.removeItem("cart");
              return { items };
            }
          }
        } catch {}
        return { items: [] };
      },
    }
  )
);
