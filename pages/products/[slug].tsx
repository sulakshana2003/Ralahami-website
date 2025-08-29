import Head from 'next/head'
import Image from 'next/image'
import React from 'react'
import type { GetServerSidePropsContext } from 'next'
import { dbConnect } from '../../lib/db'
import Product from '../../models/Product'
//import Container from '@/components/Container'
import AddToCartButton from '../../src/components/AddToCartButton'

type Props = { product: any }

const ProductDetailPage: React.FC<Props> = ({ product }) => {
  const finalPrice = Math.max(product.price - (product.promotion || 0), 0)

  return (
    <>
      <Head><title>{product.name} — Ralahami</title></Head>
      <div className="pt-28 pb-16">
        <div>
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200">
              <Image src={product.images?.[0] || '/images/dishes/hoppers.jpg'} alt={product.name} fill className="object-cover" />
            </div>
            <div>
              {product.isSignatureToday && <p className="text-xs tracking-[0.25em] text-amber-600 uppercase">Signature Today</p>}
              <h1 className="mt-2 text-3xl font-semibold">{product.name}</h1>
              <p className="mt-3 text-neutral-700">{product.description || '—'}</p>
              <div className="mt-4 text-lg">
                {product.promotion ? (
                  <>
                    <span className="font-semibold">Rs. {finalPrice.toLocaleString()}</span>
                    <span className="ml-3 text-neutral-500 line-through text-base">Rs. {product.price.toLocaleString()}</span>
                  </>
                ) : (
                  <span className="font-semibold">Rs. {product.price.toLocaleString()}</span>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <AddToCartButton product={product} />
                <a href="/cart" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">Go to Cart</a>
              </div>
              <dl className="mt-8 grid grid-cols-2 gap-4 text-sm text-neutral-600">
                <div><dt className="font-medium">Spice</dt><dd>{product.spicyLevel ?? 0}/3</dd></div>
                <div><dt className="font-medium">Availability</dt><dd>{product.isAvailable ? 'Available' : 'Unavailable'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  await dbConnect()
  const { slug } = ctx.params as { slug: string }

  const doc = await Product.findOne({ slug }) // hydrated document
  if (!doc) return { notFound: true }

  // toObject() gives a plain object with correct types
  const product = { ...doc.toObject(), _id: doc._id.toString() }
  return { props: { product } }
}

export default ProductDetailPage
