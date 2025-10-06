/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, models, Document } from 'mongoose'

export interface IProduct extends Document {
  name: string
  slug: string
  description?: string
  images: string[]
  price: number          // base price, in LKR
  promotion?: number     // discount in LKR (e.g., 250)
  category?: string
  spicyLevel?: number    // 0-3
  isAvailable: boolean
  isSignatureToday: boolean
  tags?: string[]
  finalPrice?: number    // virtual
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    images: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    promotion: { type: Number, default: 0, min: 0 },
    category: { type: String, index: true },
    spicyLevel: { type: Number, min: 0, max: 3, default: 0 },
    isAvailable: { type: Boolean, default: true },
    isSignatureToday: { type: Boolean, default: false, index: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
)

// virtual: finalPrice = price - promotion (not below 0)
ProductSchema.virtual('finalPrice').get(function (this: IProduct) {
  const promo = this.promotion || 0
  return Math.max((this.price || 0) - promo, 0)
})

// enforce "only 4 signature dishes today"
ProductSchema.pre('save', async function (next) {
  const doc = this as IProduct
  if (doc.isModified('isSignatureToday') && doc.isSignatureToday) {
    const count = await (this.constructor as any).countDocuments({
      isSignatureToday: true,
      _id: { $ne: doc._id },
    })
    if (count >= 4) {
      return next(new Error('Signature dishes today limit reached (4).'))
    }
  }
  next()
})

export default models.Product || model<IProduct>('Product', ProductSchema)
