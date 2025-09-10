import Head from 'next/head'
import Image from 'next/image'
import type { GetServerSideProps } from 'next'
import { dbConnect } from '@/lib/db'
import About from '@/models/About'
import Navbar from '../pages/components/Navbar'

type AboutVM = {
  title: string
  subtitle?: string
  heroImage?: string
  body: string[]
  address?: string
  phone?: string
  email?: string
  socials?: { platform: string; url: string }[]
}

export default function AboutPage({ about }: { about: AboutVM | null }) {
  return (
    <>
      <Head><title>About Us — Ralahami</title></Head>
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          {about?.heroImage && (
            <div className="relative mb-8 aspect-[16/6] overflow-hidden rounded-2xl border">
              <Image src={about.heroImage} alt="About hero" fill className="object-cover" />
            </div>
          )}

          <h1 className="text-4xl font-semibold">{about?.title ?? 'About Ralahami'}</h1>
          {about?.subtitle && <p className="mt-2 text-neutral-600">{about.subtitle}</p>}

          <div className="prose prose-neutral mt-6 max-w-none">
            {(about?.body?.length ? about.body : [
              'We started with a simple idea: bring authentic Sri Lankan flavors to everyone, made from seasonal ingredients and cooked with care.',
              'Our team sources locally whenever possible and prepares each dish fresh. We believe in community, hospitality, and good food.'
            ]).map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {(about?.address || about?.phone || about?.email) && (
            <div className="mt-10 grid gap-6 rounded-2xl border p-6 sm:grid-cols-3">
              {about?.address && <div><h3 className="text-sm font-semibold">Address</h3><p className="mt-1 text-sm text-neutral-700">{about.address}</p></div>}
              {about?.phone && <div><h3 className="text-sm font-semibold">Phone</h3><p className="mt-1 text-sm text-neutral-700">{about.phone}</p></div>}
              {about?.email && <div><h3 className="text-sm font-semibold">Email</h3><p className="mt-1 text-sm text-neutral-700">{about.email}</p></div>}
            </div>
          )}

          {about?.socials?.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold">Socials</h3>
              <ul className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-700">
                {about.socials.map((s, i) => (
                  <li key={i}><a className="hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.platform}</a></li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<{ about: AboutVM | null }> = async () => {
  await dbConnect()
  const d: any = await About.findOne({}).lean()

  const about: AboutVM | null = d ? {
    title: d.title,
    subtitle: d.subtitle || null,
    heroImage: d.heroImage || null,
    body: Array.isArray(d.body) ? d.body : [],
    address: d.address || null,
    phone: d.phone || null,
    email: d.email || null,
    socials: d.socials || [],
  } : null

  return { props: { about } }
}
