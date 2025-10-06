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
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:scale-[1.02]"
      style={{ perspective: '1000px' }}
    >
      {/* Image Section */}
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={product.images?.[0] || '/images/dishes/hoppers.jpg'}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {product.isSignatureToday && (
          <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-amber-500 to-red-500 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-md">
            Signature
          </span>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-3">
        <Link
          href={`/products/${product.slug}`}
          className="text-sm font-semibold text-neutral-800 transition-colors hover:text-amber-600"
        >
          {product.name}
        </Link>

        {/* Price */}
        <div className="mt-1 flex items-center gap-2 text-xs">
          {product.promotion ? (
            <>
              <span className="font-bold text-amber-700">
                Rs. {finalPrice.toLocaleString()}
              </span>
              <span className="text-neutral-400 line-through">
                Rs. {product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="font-bold text-amber-700">
              Rs. {product.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <div
          className="mt-3 opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0"
        >
          <AddToCartButton product={product as any} />
        </div>
      </div>
    </article>
  )
}

export default ProductCard
