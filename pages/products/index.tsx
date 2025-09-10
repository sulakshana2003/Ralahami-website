/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from 'next/head'
import React from 'react'
import ProductCard from '../../src/components/ProductCard'
import { dbConnect } from '../../lib/db'
import Product from '../../models/Product'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
//import Container from '@/components/Container'

type Props = { products: any[] }
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


const ProductsPage: React.FC<Props> = ({ products }) => {
  return (
    <>
      <Navbar/>
      <Head><title>Menu — Ralahami</title></Head>
      <div className="pt-28 pb-10">
        <div>
          <div className="mb-8 text-center">
            <p className="text-xs tracking-[0.25em] text-amber-600 uppercase">Our Menu</p>
            <h1 className="mt-2 text-4xl font-semibold">Dishes & Specials</h1>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </div>
      </div>
      <Footer/>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<{ products: ProductItem[] }> = async () => {
  await dbConnect()
  // lean() + whitelist to avoid Date serialization problems
  const docs = await Product.find({}).select('-__v').lean()

  const products: ProductItem[] = docs.map((d: any) => ({
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    description: d.description ?? null,
    images: d.images ?? [],
    price: d.price,
    promotion: d.promotion ?? 0,
    category: d.category ?? null,
    spicyLevel: d.spicyLevel ?? 0,
    isAvailable: !!d.isAvailable,
    stock: d.stock ?? 0,
    isSignatureToday: !!d.isSignatureToday,
    tags: d.tags ?? [],
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
    finalPrice: Math.max((d.price || 0) - (d.promotion || 0), 0),
  }))

  return { props: { products } }
}

export default ProductsPage
