import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AddToCartButton from './AddToCartButton'

type Props = {
  product: {
    _id: string
    name: string
    slug: string
    images: string[]
    price: number
    promotion?: number
    isSignatureToday?: boolean
  }
}

const ProductCard: React.FC<Props> = ({ product }) => {
  const finalPrice = Math.max(product.price - (product.promotion || 0), 0)

  return (
    <article className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative h-48 w-full">
        <Image
          src={product.images?.[0] || '/images/dishes/hoppers.jpg'}
          alt={product.name}
          fill
          className="object-cover transition group-hover:scale-[1.03]"
        />
        {product.isSignatureToday && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium">Signature</span>
        )}
      </div>
      <div className="p-4">
        <Link href={`/products/${product.slug}`} className="text-base font-semibold hover:underline">
          {product.name}
        </Link>
        <div className="mt-1 text-sm">
          {product.promotion ? (
            <>
              <span className="font-semibold">Rs. {finalPrice.toLocaleString()}</span>
              <span className="ml-2 text-neutral-500 line-through">Rs. {product.price.toLocaleString()}</span>
            </>
          ) : (
            <span className="font-semibold">Rs. {product.price.toLocaleString()}</span>
          )}
        </div>
        <div className="mt-4">
          <AddToCartButton product={product as any} className="w-full" />
        </div>
      </div>
    </article>
  )
}

export default ProductCard
