/* eslint-disable @next/next/no-img-element */
import Head from "next/head";
import React, { useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

type StaffMember = {
  id: number;
  name: string;
  role: string;
  experienceNote: string;
  imageUrl: string;
  tags?: string[];
};

const STAFF: StaffMember[] = [
  {
    id: 1,
    name: "Nuwan Silva",
    role: "Head Chef",
    experienceNote:
      "20+ years in Sri Lankan fusion cuisine. Leads Ralahami’s signature menus and seasonal tastings.",
    imageUrl:
      "https://s3.amazonaws.com/bizenglish/wp-content/uploads/2023/03/15120002/International-award-winning-culinary-expert-Nuwan-Silva-Executive-Chef-at-Courtyard-by-Marriott-Colombo-e1678861849201.jpg",
    tags: ["Kitchen", "Leadership"],
  },
  {
    id: 2,
    name: "Samantha Perera",
    role: "Executive Chef",
    experienceNote:
      "Michelin-kitchen trained. Obsessed with local produce, layered flavors, and consistency.",
    imageUrl:
      "https://www.goldengrill.lk/images/master-chef-thumb-01.jpg",
    tags: ["Kitchen"],
  },
  {
    id: 3,
    name: "Dilani Fernando",
    role: "Pastry Chef",
    experienceNote:
      "Crafts delicate desserts inspired by island fruits and Ceylon tea profiles.",
    imageUrl:
      "https://d1ef7ke0x2i9g8.cloudfront.net/hong-kong/_large700/1258580/Yes-Chef-Gisela-Alesbrook-Head-Chef-of-Sri-Lankan-Spot-Hotal-Colombo.webp",
    tags: ["Bakery", "Dessert"],
  },
  {
    id: 4,
    name: "Chamath Ranasinghe",
    role: "Restaurant Manager",
    experienceNote:
      "Hospitality veteran. Ensures smooth service, memorable moments, and happy teams.",
    imageUrl:
      "https://etimg.etb2bimg.com/photo/121901360.cms",
    tags: ["Service", "Leadership"],
  },
  {
    id: 5,
    name: "Ishara Jayasekara",
    role: "Sommelier & Beverage Lead",
    experienceNote:
      "Curates tea pairings and beverage menus that elevate every dish.",
    imageUrl:
      "https://inthemixbyimi.com/wp-content/uploads/2015/09/Tyson-Beats-the-Clocka_Photo-Credit-Shannon-Sturgis.jpg",
    tags: ["Beverage"],
  },
  {
    id: 6,
    name: "Tharindu Wickramasinghe",
    role: "Sous Chef",
    experienceNote:
      "Precision and pace on the pass. Keeps quality high in peak service.",
    imageUrl:
      "https://assets.unileversolutions.com/v1/118558343.jpg",
    tags: ["Kitchen"],
  },
];

const ROLES = [
  "All",
  "Head Chef",
  "Executive Chef",
  "Pastry Chef",
  "Restaurant Manager",
  "Sommelier & Beverage Lead",
  "Sous Chef",
];

export default function OurStaffPage() {
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STAFF.filter((m) => {
      const matchesRole = roleFilter === "All" || m.role === roleFilter;
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.experienceNote.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [roleFilter, query]);

  return (
    <>
      <Head>
        <title>Our Staff • Ralahami Restaurant</title>
        <meta
          name="description"
          content="Meet the culinary and service team behind Ralahami Restaurant — our chefs, managers, and beverage specialists."
        />
      </Head>

      <Navbar />

      {/* Background accent w/ orange hints */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-300/25 via-amber-200/20 to-rose-200/20 blur-3xl" />
      </div>

      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-orange-100/40 bg-white/70 p-8 shadow-xl backdrop-blur-md dark:border-orange-400/10 dark:bg-neutral-900/60">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
                  Meet the Ralahami Team
                </h1>
                <p className="mt-2 max-w-2xl text-neutral-700 dark:text-neutral-300">
                  The heart of Ralahami is our people—chefs, makers, and hosts
                  who obsess over details so every plate feels like home.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, role, notes…"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none ring-orange-300/30 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-900"
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none ring-orange-300/30 focus:ring-4 dark:border-neutral-700 dark:bg-neutral-900 sm:w-56"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
              <Badge>Local Produce</Badge>
              <Badge variant="solid">Sri Lankan Flavours</Badge>
              <Badge>Genuine Hospitality</Badge>
            </div>
          </div>
        </section>

        {/* Vision / Mission / Values with orange accents */}
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
                <Dot /> Our Vision
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                To be Sri Lanka’s most loved neighborhood restaurant—where
                tradition meets modern craft, and every guest leaves inspired.
              </p>
            </Card>
            <Card>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
                <Dot /> Our Mission
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                We champion local farmers, seasonal ingredients, and warm
                hospitality to create food that comforts, surprises, and
                connects.
              </p>
            </Card>
            <Card>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
                <Dot /> Our Values
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <li>• Respect for people, produce, and place</li>
                <li>• Consistency, craft, and cleanliness</li>
                <li>• Learning culture & humble service</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Team Grid */}
        <section className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              The People Behind the Plates
            </h2>
            <span className="text-sm text-neutral-500">
              {filtered.length} team member{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <article
                key={m.id}
                className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="relative h-56 w-full overflow-hidden">
                  <img
                    src={m.imageUrl}
                    alt={m.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* subtle top gradient with orange tint */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 via-orange-900/10 to-transparent" />
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {m.name}
                      </h3>
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        {m.role}
                      </p>
                    </div>
                    {m.tags && (
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {m.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:ring-orange-800/40"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                    {m.experienceNote}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      #RalahamiFamily
                    </span>
                    <button
                      type="button"
                      className="rounded-full bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-300/40 dark:focus:ring-orange-400/30"
                      aria-label={`More about ${m.name}`}
                      onClick={() => alert(`${m.name} • ${m.role}`)}
                    >
                      View Profile
                    </button>
                  </div>
                </div>

                {/* ambient border glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-orange-900/5 group-hover:ring-orange-900/10 dark:ring-orange-100/10 dark:group-hover:ring-orange-100/20" />
              </article>
            ))}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-orange-300 bg-white p-10 text-center text-neutral-600 dark:border-orange-700 dark:bg-neutral-900 dark:text-neutral-300">
              No team members match your search.
            </div>
          )}
        </section>

        {/* CTA with orange gradient */}
        <section className="mx-auto my-16 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-orange-100/40 bg-gradient-to-br from-orange-200/60 via-white to-amber-200/60 p-8 shadow-xl backdrop-blur-md dark:border-orange-400/10 dark:from-orange-900/20 dark:via-neutral-900 dark:to-amber-900/20">
            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Work with Ralahami
              </h3>
              <p className="mt-2 max-w-2xl text-neutral-700 dark:text-neutral-300">
                We’re always looking for passionate people who love food and
                hospitality. If that’s you, we’d love to talk.
              </p>
              
            </div>
            {/* soft glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-orange-200/60 blur-2xl dark:bg-orange-400/10" />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* ---------- UI Helpers ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      {children}
    </div>
  );
}

function Dot() {
  return (
    <span className="inline-block h-2 w-2 rounded-full bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-900/40" />
  );
}

function Badge({
  children,
  variant = "outline",
}: {
  children: React.ReactNode;
  variant?: "outline" | "solid";
}) {
  if (variant === "solid") {
    return (
      <span className="rounded-full bg-orange-600/90 px-3 py-1 font-medium text-white ring-1 ring-orange-700/50">
        {children}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:ring-orange-800/40">
      {children}
    </span>
  );
}
