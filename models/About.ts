import { Schema, model, models, Document } from 'mongoose'

export interface IAbout extends Document {
  title: string
  subtitle?: string
  heroImage?: string
  body: string[]                 // paragraphs
  address?: string
  phone?: string
  email?: string
  socials?: { platform: string; url: string }[]
}

const AboutSchema = new Schema<IAbout>(
  {
    title: { type: String, required: true },
    subtitle: String,
    heroImage: String,            // /images/... or https://domain/...
    body: { type: [String], default: [] },
    address: String,
    phone: String,
    email: String,
    socials: [{ platform: String, url: String }],
  },
  { timestamps: true }
)

export default models.About || model<IAbout>('About', AboutSchema)
