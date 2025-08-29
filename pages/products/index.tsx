import Head from 'next/head'
import React from 'react'
import ProductCard from '../../src/components/ProductCard'
import { dbConnect } from '../../lib/db'
import Product from '../../models/Product'
//import Container from '@/components/Container'

type Props = { products: any[] }

const ProductsPage: React.FC<Props> = ({ products }) => {
  return (
    <>
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
    </>
  )
}

export async function getServerSideProps() {
  await dbConnect()
  const docs = await Product.find({ isAvailable: true }).sort({ isSignatureToday: -1, createdAt: -1 }).lean()
  const products = docs.map((d: any) => ({ ...d, _id: String(d._id) }))
  return { props: { products } }
}

export default ProductsPage
