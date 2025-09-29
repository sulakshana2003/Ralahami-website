// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { getServerSession } from "next-auth";
// import { authOptions } from "./api/auth/[...nextauth]";
// import type { GetServerSidePropsContext } from "next";
// import { signOut, useSession } from "next-auth/react";

// // --- small helpers (no deps) ---
// function initials(name?: string, email?: string) {
//   if (name && name.trim()) {
//     const parts = name.trim().split(/\s+/).slice(0, 2);
//     return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
//   }
//   return email ? email[0]?.toUpperCase() ?? "U" : "U";
// }
// function RoleBadge({ role }: { role?: string }) {
//   const map: Record<string, string> = {
//     admin:
//       "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
//     user:
//       "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
//   };
//   return (
//     <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${map[role ?? "user"]}`}>
//       {role ?? "user"}
//     </span>
//   );
// }

// export default function Account() {
//   const { data } = useSession();
//   const user = data?.user as any;

//   async function copyEmail() {
//     if (user?.email) {
//       try {
//         await navigator.clipboard.writeText(user.email);
//       } catch {
//         // ignore
//       }
//     }
//   }

//   return (
//     <div className="px-4 sm:px-6 pt-24 pb-12 max-w-4xl mx-auto">
//       <div className="mb-6">
//         <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">My Account</h1>
//         <p className="text-sm text-neutral-500 mt-1">Profile overview and account actions</p>
//       </div>

//       <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
//         {/* Hero / banner */}
//         <div className="h-28 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

//         {/* Header row */}
//         <div className="-mt-10 px-6 sm:px-8">
//           <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
//             <div className="flex items-center gap-4">
//               {/* Avatar */}
//               <div className="h-20 w-20 rounded-2xl ring-4 ring-white bg-neutral-100 text-neutral-700 flex items-center justify-center text-2xl font-bold overflow-hidden">
//                 {user?.image ? (
//                   // eslint-disable-next-line @next/next/no-img-element
//                   <img
//                     src={user.image}
//                     alt={user?.name || "Avatar"}
//                     className="h-full w-full object-cover"
//                   />
//                 ) : (
//                   initials(user?.name, user?.email)
//                 )}
//               </div>

//               <div>
//                 <div className="flex items-center gap-2">
//                   <h2 className="text-xl font-semibold">{user?.name || "Unnamed User"}</h2>
//                   <RoleBadge role={(user?.role as string) || "user"} />
//                 </div>
//                 <button
//                   onClick={copyEmail}
//                   className="mt-1 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
//                   title="Click to copy email"
//                 >
//                   {/* mail icon */}
//                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
//                     <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
//                     <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
//                   </svg>
//                   {user?.email || "no-email"}
//                 </button>
//               </div>
//             </div>

//             <div className="pb-2">
//               <button
//                 onClick={() => signOut({ callbackUrl: "/" })}
//                 className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 active:scale-[.98] transition"
//               >
//                 {/* logout icon */}
//                 <svg width="16" height="16" viewBox="0 0 24 24" className="text-white" fill="none">
//                   <path d="M15 12H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
//                   <path d="m12 9 3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//                   <path d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" stroke="currentColor" strokeWidth="1.6" />
//                 </svg>
//                 Logout
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Info grid */}
//         <div className="px-6 sm:px-8 pb-8 pt-6">
//           <div className="grid sm:grid-cols-2 gap-4">
//             <div className="rounded-xl border bg-white p-4">
//               <div className="text-xs uppercase tracking-wide text-neutral-500">Name</div>
//               <div className="mt-1 text-sm font-medium text-neutral-900">{user?.name || "—"}</div>
//             </div>
//             <div className="rounded-xl border bg-white p-4">
//               <div className="text-xs uppercase tracking-wide text-neutral-500">Email</div>
//               <div className="mt-1 text-sm font-medium text-neutral-900">{user?.email || "—"}</div>
//             </div>
//             <div className="rounded-xl border bg-white p-4">
//               <div className="text-xs uppercase tracking-wide text-neutral-500">Role</div>
//               <div className="mt-1">
//                 <RoleBadge role={(user?.role as string) || "user"} />
//               </div>
//             </div>
//             <div className="rounded-xl border bg-white p-4">
//               <div className="text-xs uppercase tracking-wide text-neutral-500">Member Since</div>
//               <div className="mt-1 text-sm font-medium text-neutral-900">
//                 {/* If you later add createdAt to session, this will show nicely. For now show Today's date placeholder */}
//                 {new Date().toLocaleDateString()}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* subtle footer note */}
//       <p className="mt-4 text-xs text-neutral-500">
//         Need to update your details? Contact an administrator.
//       </p>
//     </div>
//   );
// }

// // Protect with server-side redirect if not logged in
// export async function getServerSideProps(ctx: GetServerSidePropsContext) {
//   const session = await getServerSession(ctx.req, ctx.res, authOptions);
//   if (!session) return { redirect: { destination: "/login", permanent: false } };
//   return { props: {} };
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSidePropsContext } from "next";
import { signOut, useSession } from "next-auth/react";

// --- helpers ---
function initials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  return email ? email[0]?.toUpperCase() ?? "U" : "U";
}
function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, string> = {
    admin: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    user: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${map[role ?? "user"]}`}
    >
      {role ?? "user"}
    </span>
  );
}

// --- background video layer ---
function BackgroundVideo() {
  return (
    <>
      {/* Preload hint for faster start */}
      <Head>
        <link rel="preload" href="/videos/account-bg.mp4" as="video" />
      </Head>

      <div className="fixed inset-0 -z-10">
        {/* Video */}
        <video
          className="h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="\videos\myaccount.mp4"
          aria-hidden="true"
        >
          <source src="\videos\myaccount.mp4" type="video/mp4" />
        </video>

        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>
    </>
  );
}

export default function Account() {
  const { data } = useSession();
  const user = data?.user as any;

  return (
    <div className="relative min-h-screen">
      <BackgroundVideo />

      <div className="px-4 sm:px-6 pt-24 pb-12 max-w-5xl mx-auto">
        {/* Top bar: Back to Home + Title */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm bg-white/90 backdrop-blur hover:bg-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M10 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 12h18"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Back to Home
          </Link>
          <div className="text-right text-white drop-shadow">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">My Account</h1>
            <p className="text-sm text-white/80">Profile overview and account actions</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white/90 backdrop-blur shadow-sm">
          {/* Banner stays; with video behind it the gradient still looks nice */}
          <div className="h-28 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

          {/* Header row */}
          <div className="-mt-10 px-6 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-20 w-20 rounded-2xl ring-4 ring-white bg-neutral-100 text-neutral-700 flex items-center justify-center text-2xl font-bold overflow-hidden">
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={user?.name || "Avatar"} className="h-full w-full object-cover" />
                  ) : (
                    initials(user?.name, user?.email)
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{user?.name || "Unnamed User"}</h2>
                    <RoleBadge role={(user?.role as string) || "user"} />
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2 text-sm text-neutral-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
                      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                    {user?.email || "no-email"}
                  </div>
                </div>
              </div>

              <div className="pb-2">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 active:scale-[.98] transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" className="text-white" fill="none">
                    <path d="M15 12H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path
                      d="m12 9 3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Info + Quick Links */}
          <div className="px-6 sm:px-8 pb-8 pt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Info cards */}
              <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Name</div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">{user?.name || "—"}</div>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Email</div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">{user?.email || "—"}</div>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Role</div>
                  <div className="mt-1">
                    <RoleBadge role={(user?.role as string) || "user"} />
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Session Expires</div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">
                    {data?.expires ? new Date(data.expires).toLocaleString() : "—"}
                  </div>
                </div>
                <div className="rounded-xl border bg-white p-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Security</div>
                  <ul className="mt-2 text-sm text-neutral-700 list-disc pl-5 space-y-1">
                    <li>Password: •••••••• (hidden)</li>
                    <li>
                      Two-factor authentication: <span className="font-medium">Not enabled</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right: Quick links */}
              <div className="space-y-4">
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">Quick Links</div>
                  <div className="mt-3 grid gap-2">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      Home <span>↗</span>
                    </Link>
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      Products <span>↗</span>
                    </Link>
                    <Link
                      href="/reservation"
                      className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                    >
                      Reservations <span>↗</span>
                    </Link>
                    {user?.role === "admin" && (
                      <Link
                        href="/admin"
                        className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50"
                      >
                        Admin Dashboard <span>↗</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              {/* /Right */}
            </div>
          </div>
        </div>

        {/* Note */}
        <p className="mt-4 text-xs text-white/80 drop-shadow">
          Need to update your details? Contact an administrator. (Your account information is private and only visible to you and
          administrators.)
        </p>
      </div>
    </div>
  );
}

// SSR protection (unchanged)
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
}


