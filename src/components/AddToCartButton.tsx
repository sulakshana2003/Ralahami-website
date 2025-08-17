import React from 'react'
import { useCart } from '@/hooks/useCart'
import { toast } from 'react-hot-toast'

type Props = {
  product: {
    _id: string
    slug: string
    name: string
    price: number
    promotion?: number
    images?: string[]
  }
  className?: string
}

const AddToCartButton: React.FC<Props> = ({ product, className = '' }) => {
  const add = useCart((s) => s.add)
  const finalPrice = Math.max(product.price - (product.promotion || 0), 0)
  const img = product.images?.[0]

  return (
    <button
      onClick={() => {
        add({ _id: product._id, slug: product.slug, name: product.name, price: product.price, promotion: product.promotion, finalPrice, image: img }, 1)
        toast.success('Added to cart')
      }}
      className={`rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 ${className}`}
    >
      Add to Cart
    </button>
  )
}

export default AddToCartButton
