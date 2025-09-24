/* eslint-disable @typescript-eslint/no-explicit-any */

// pages/login.tsx
import { FormEvent, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signIn, useSession } from "next-auth/react";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSidePropsContext } from "next";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const { update } = useSession(); // refresh session after sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false, // handle redirects manually
      email,
      password,
    });

    if (!res || !res.ok) {
      setLoading(false);
      setError("Invalid email or password.");
      if (res?.error === "AccessDenied") {
        setError("Your account has been blocked by an admin. You can’t sign in.");
      } else if (res?.error === "CredentialsSignin") {
        setError("Invalid email or password.");
      } else {
        setError("Unable to sign in. Please try again.");
      }
      return;
    }

    const fresh = await update();
    const role = (fresh?.user as any)?.role;

    if (role === "admin") {
      router.replace("/admin");
      return;
    }

    router.replace("/");
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>Login — Ralahami</title>
      </Head>

      <Navbar />

      {/* Full-page background photo */}
      <div className="relative min-h-screen">
        {/* Put your image at /public/images/login-bg.jpg */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/log2.jpg"
          alt="Background"
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
        />
        {/* Warm overlay for readability */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-stone-900/45 to-black/55" />

        {/* Content */}
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 py-14 sm:py-16">
          <div className="w-full max-w-2xl">
            {/* Card */}
            <div className="mx-auto w-full max-w-xl rounded-[28px] border border-white/40 bg-white/90 p-[1.25px] shadow-2xl backdrop-blur-md">
              <div className="rounded-[26px] bg-white/95 p-6 sm:p-8">

                {/* Header */}
                <div className="mb-6 text-center">
                  <h1 className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-stone-900">
                    Welcome Back!
                  </h1>
                  <p className="mt-1 text-sm sm:text-base text-stone-600">
                    Don’t have an account?{" "}
                    <Link
                      href="/register"
                      className="font-semibold text-amber-700 underline decoration-amber-400/70 decoration-2 underline-offset-2 hover:text-amber-800"
                    >
                      Sign Up
                    </Link>
                  </p>
                </div>

                {/* Form (functions unchanged) */}
                <form onSubmit={onSubmit} className="space-y-5">
                  {/* Email */}
                  <div className="relative">
                    <label htmlFor="email" className="sr-only">Email</label>
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="Email"
                      className="h-14 w-full rounded-full border-2 border-stone-300 bg-white pl-12 pr-5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500 focus:ring-0"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <label htmlFor="password" className="sr-only">Password</label>
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </span>
                    <input
                      id="password"
                      type="password"
                      placeholder="Password"
                      className="h-14 w-full rounded-full border-2 border-stone-300 bg-white pl-12 pr-5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500 focus:ring-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900">
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-1 w-full rounded-full bg-stone-900 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 active:scale-[.99] transition disabled:opacity-60"
                  >
                    {loading ? "Logging in…" : "Log In"}
                  </button>
                </form>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-white/80">
              Photo background © Ralahami
            </p>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}

// Redirect away if already logged in (unchanged)
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session) {
    const role = (session.user as any)?.role;
    const destination = role === "admin" ? "/admin" : "/";
    return { redirect: { destination, permanent: false } };
  }
  return { props: {} };
}
