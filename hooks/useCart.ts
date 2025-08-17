import { create } from 'zustand'

export type CartItem = {
  _id: string
  slug: string
  name: string
  price: number
  promotion?: number
  finalPrice: number
  image?: string
  qty: number
}

type CartState = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  remove: (slug: string) => void
  clear: () => void
}

const load = () => {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
}
const save = (items: CartItem[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem('cart', JSON.stringify(items))
}

export const useCart = create<CartState>((set, get) => ({
  items: load(),
  add: (item, qty = 1) => {
    const items = [...get().items]
    const idx = items.findIndex((i) => i.slug === item.slug)
    if (idx >= 0) items[idx].qty += qty
    else items.push({ ...item, qty })
    save(items)
    set({ items })
  },
  remove: (slug) => {
    const items = get().items.filter((i) => i.slug !== slug)
    save(items)
    set({ items })
  },
  clear: () => { save([]); set({ items: [] }) },
}))
