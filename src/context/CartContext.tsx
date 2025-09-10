import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { CartItem, ProductItem } from "../types/cart";

type CartState = { items: CartItem[] };
type Action =
  | { type: "HYDRATE"; payload: CartState }
  | { type: "ADD"; product: ProductItem; qty?: number }
  | { type: "REMOVE"; id: string }
  | { type: "SET_QTY"; id: string; qty: number }
  | { type: "CLEAR" };

type Ctx = CartState & {
  isReady: boolean;
  addToCart: (p: ProductItem, qty?: number) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalItems: number;
};

const STORAGE_KEY = "cart:v1";

const CartContext = createContext<Ctx | undefined>(undefined);

function unitPrice(p: ProductItem) {
  // prefer precomputed finalPrice, fall back to price - promotion
  return Math.max(p.finalPrice ?? (p.price - (p.promotion || 0)), 0);
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;

    case "ADD": {
      const qty = Math.max(1, action.qty ?? 1);
      const idx = state.items.findIndex(i => i.id === action.product.id);
      if (idx >= 0) {
        const copy = [...state.items];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return { items: copy };
      }
      const item: CartItem = {
        id: action.product.id,
        name: action.product.name,
        slug: action.product.slug,
        image: action.product.images?.[0],
        unitPrice: unitPrice(action.product),
        qty,
      };
      return { items: [...state.items, item] };
    }

    case "REMOVE":
      return { items: state.items.filter(i => i.id !== action.id) };

    case "SET_QTY": {
      const q = Math.max(1, action.qty);
      return { items: state.items.map(i => i.id === action.id ? { ...i, qty: q } : i) };
    }

    case "CLEAR":
      return { items: [] };

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const hydratedRef = useRef(false);

  // hydrate (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "HYDRATE", payload: JSON.parse(raw) });
    } catch {}
    hydratedRef.current = true;
  }, []);

  // persist
  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const subtotal = useMemo(
    () => state.items.reduce((s, i) => s + i.unitPrice * i.qty, 0),
    [state.items]
  );
  const totalItems = useMemo(
    () => state.items.reduce((s, i) => s + i.qty, 0),
    [state.items]
  );

  const value: Ctx = {
    ...state,
    isReady: hydratedRef.current,
    addToCart: (product, qty) => dispatch({ type: "ADD", product, qty }),
    removeFromCart: (id) => dispatch({ type: "REMOVE", id }),
    setQty: (id, qty) => dispatch({ type: "SET_QTY", id, qty }),
    clearCart: () => dispatch({ type: "CLEAR" }),
    subtotal,
    totalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
