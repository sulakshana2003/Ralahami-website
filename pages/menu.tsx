// pages/menu.tsx
import Head from 'next/head'
import { useMemo, useState } from 'react'
import type { GetServerSideProps } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { dbConnect } from '@/lib/db'
import Product from '@/models/Product'
import Navbar from './components/Navbar'
import ProductCard from '@/src/components/ProductCard'

type ProductItem = {
  _id: string
  name: string
  slug: string
  images: string[]
  price: number
  promotion?: number
  isSignatureToday?: boolean
  category?: string | null
  tags?: string[]
  description?: string | null
}

type Props = { products: ProductItem[] }

const CUISINES = [
  'All cuisines',
  'Sri Lankan',
  'Indian',
  'Thai',
  'Chinese',
  'Italian',
  'Japanese',
  'Korean',
  'Middle Eastern',
  'Western',
  'Other',
] as const
type Cuisine = typeof CUISINES[number]

// quick heuristic if you don't have a cuisine field
function inferCuisine(p: ProductItem): Cuisine {
  const hay = [
    p.category || '',
    (p.tags || []).join(' '),
    p.name || '',
    (p.description || '')
  ].join(' ').toLowerCase()

  if (/(sri|lanka|kottu|hopper|pol|parippu|mallum|sambol)/.test(hay)) return 'Sri Lankan'
  if (/(indian|masala|biryani|tikka|paneer|naan|dal)/.test(hay)) return 'Indian'
  if (/(thai|pad thai|tom yum|green curry|red curry|basil)/.test(hay)) return 'Thai'
  if (/(chinese|noodle|dumpling|szechuan|fried rice)/.test(hay)) return 'Chinese'
  if (/(italian|pasta|pizza|risotto)/.test(hay)) return 'Italian'
  if (/(japanese|sushi|ramen|teriyaki|donburi|udon|tempura)/.test(hay)) return 'Japanese'
  if (/(korean|kimchi|bibimbap|bulgogi|tteokbokki)/.test(hay)) return 'Korean'
  if (/(middle eastern|shawarma|hummus|falafel|kebab|tahini)/.test(hay)) return 'Middle Eastern'
  if (/(burger|steak|grill|fried chicken|western)/.test(hay)) return 'Western'
  return 'Other'
}

export default function MenuPage({ products }: Props) {
  const [activeCuisine, setActiveCuisine] = useState<Cuisine>('All cuisines')
  const [query, setQuery] = useState('')

  const enriched = useMemo(() => {
    return products.map((p) => {
      const cuisine = inferCuisine(p)
      return { ...p, cuisine }
    })
  }, [products])

  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      const cuisineOK = activeCuisine === 'All cuisines' ? true : p.cuisine === activeCuisine
      const q = query.trim().toLowerCase()
      const queryOK = !q
        ? true
        : [p.name, p.description || '', p.category || '', ...(p.tags || []), p.cuisine]
            .join(' ')
            .toLowerCase()
            .includes(q)
      return cuisineOK && queryOK
    })
  }, [enriched, activeCuisine, query])

  return (
    <>
      <Head><title>Menu — Ralahami</title></Head>
      <Navbar />

      <div className="pt-28 pb-16">
        {/* Header */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-xs tracking-[0.25em] text-amber-600 uppercase">Our Menu</p>
            <h1 className="mt-2 text-4xl font-semibold">Explore Our Dishes</h1>
            <p className="mt-2 text-neutral-600">Pick a cuisine or search by name</p>
          </div>

          {/* Filters bar */}
          <div className="mb-8 rounded-2xl border bg-white/80 backdrop-blur px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="text-sm font-medium whitespace-nowrap">Cuisine</label>
                <select
                  value={activeCuisine}
                  onChange={(e) => setActiveCuisine(e.target.value as Cuisine)}
                  className="w-full md:w-64 rounded-xl border px-3 h-11"
                >
                  {CUISINES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dishes…"
                  className="w-full md:w-80 rounded-xl border px-3 h-11"
                />
              </div>
            </div>
          </div>

          {/* Grid of cards */}
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard
                key={p._id}
                product={{
                  _id: p._id,
                  name: p.name,
                  slug: p.slug,
                  images: p.images,
                  price: p.price,
                  promotion: p.promotion,
                  isSignatureToday: p.isSignatureToday,
                }}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-neutral-600 mt-16">
              No dishes match your selection.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<{ products: ProductItem[] }> = async () => {
  await dbConnect()
  const docs: any[] = await Product.find().select('-__v').lean()

  const products: ProductItem[] = docs.map((d) => ({
    _id: String(d._id),
    name: d.name,
    slug: d.slug,
    images: d.images ?? [],
    price: Number(d.price) || 0,
    promotion: Number(d.promotion) || 0,
    isSignatureToday: !!d.isSignatureToday,
    category: d.category ?? null,
    tags: d.tags ?? [],
    description: d.description ?? null,
  }))

  return { props: { products } }
}
