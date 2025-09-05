// pages/products/[slug].tsx
import Head from 'next/head'
import Image from 'next/image'
import type { GetServerSideProps } from 'next'
import { dbConnect } from '@/lib/db'
import Product from '@/models/Product'
//import AddToCartButton from '@/components/AddToCartButton'

type ProductItem = {
  id: string
  name: string
  slug: string
  description: string | null
  images: string[]
  price: number
  promotion: number
  category: string | null
  spicyLevel: number
  isAvailable: boolean
  stock: number
  isSignatureToday: boolean
  tags: string[]
  createdAt: string | null
  updatedAt: string | null
  finalPrice: number
}

type Props = { product: ProductItem }

const ProductDetailPage: React.FC<Props> = ({ product }) => {
  const finalPrice = Math.max(product.price - (product.promotion || 0), 0)

  return (
    <>
      <Head><title>{product.name} — Ralahami</title></Head>
      <div className="pt-28 pb-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200">
            <Image
              src={product.images?.[0] || '/images/dishes/hoppers.jpg'}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            {product.isSignatureToday && (
              <p className="text-xs tracking-[0.25em] text-amber-600 uppercase">Signature Today</p>
            )}
            <h1 className="mt-2 text-3xl font-semibold">{product.name}</h1>
            <p className="mt-3 text-neutral-700">{product.description || '—'}</p>
            <div className="mt-4 text-lg">
              {product.promotion ? (
                <>
                  <span className="font-semibold">Rs. {finalPrice.toLocaleString()}</span>
                  <span className="ml-3 text-neutral-500 line-through text-base">
                    Rs. {product.price.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="font-semibold">Rs. {product.price.toLocaleString()}</span>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              {/* <AddToCartButton product={product} /> */}
              <button className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">Add to cart</button>
              <a
                href="/cart"
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                Go to Cart
              </a>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-4 text-sm text-neutral-600">
              <div><dt className="font-medium">Spice</dt><dd>{product.spicyLevel ?? 0}/3</dd></div>
              <div><dt className="font-medium">Availability</dt><dd>{product.isAvailable ? 'Available' : 'Unavailable'}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<{ product: ProductItem }> = async (ctx) => {
  await dbConnect()
  const { slug } = ctx.params as { slug: string }

  const d: any = await Product.findOne({ slug }).select('-__v').lean()
  if (!d) return { notFound: true }

  const product: ProductItem = {
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    description: d.description ?? null,
    images: d.images ?? [],
    price: Number(d.price) || 0,
    promotion: Number(d.promotion) || 0,
    category: d.category ?? null,
    spicyLevel: Number(d.spicyLevel) || 0,
    isAvailable: !!d.isAvailable,
    stock: Number(d.stock) || 0,
    isSignatureToday: !!d.isSignatureToday,
    tags: d.tags ?? [],
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
    finalPrice: Math.max((Number(d.price) || 0) - (Number(d.promotion) || 0), 0),
  }

  return { props: { product } }
}

export default ProductDetailPage
