/* eslint-disable @typescript-eslint/no-explicit-any */

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
import { motion } from "framer-motion"; // 👈 animation

export default function LoginPage() {
  const router = useRouter();
  const { update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
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
        {/* Preload the mp4 for a faster start */}
        <link rel="preload" href="/videos/myaccount.mp4" as="video" />
      </Head>
      <Navbar />

      {/* Full-page background video */}
      <div className="relative min-h-screen overflow-hidden">
        {/* 🔁 looping background video (replaces the image) */}
        <video
          className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/account-bg.jpg"
          aria-hidden="true"
        >
          <source src="/videos/myaccount.mp4" type="video/mp4" />
        </video>

        {/* overlay for readability (same position where your gradient was) */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-stone-900/45 to-black/55" />

        {/* 🔵 floating animated blobs */}
        <motion.div
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 left-10 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-32 right-10 w-48 h-48 rounded-full bg-emerald-400/20 blur-3xl"
        />

        {/* Content */}
        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 py-14 sm:py-16">
          <div className="w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="mx-auto w-full max-w-xl rounded-[28px] border border-white/40 bg-white/90 p-[1.25px] shadow-2xl backdrop-blur-md"
            >
              <div className="rounded-[26px] bg-white/95 p-6 sm:p-8">
                {/* Header */}
                <div className="mb-6 text-center">
                  <motion.h1
                    className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-stone-900"
                    animate={{
                      scale: [1, 1.05, 1],
                      y: [0, -3, 0],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    Welcome Back!
                  </motion.h1>

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

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-5">
                  {/* Email */}
                  <div className="relative">
                    <label htmlFor="email" className="sr-only">
                      Email
                    </label>
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      📧
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="Email"
                      className="h-14 w-full rounded-full border-2 border-stone-300 bg-white pl-12 pr-5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <label htmlFor="password" className="sr-only">
                      Password
                    </label>
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      🔒
                    </span>
                    <input
                      id="password"
                      type="password"
                      placeholder="Password"
                      className="h-14 w-full rounded-full border-2 border-stone-300 bg-white pl-12 pr-5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  {/* Forgot Password */}
                  <div className="text-center text-sm text-stone-600">
                    <Link href="/reset-password" className="font-semibold text-amber-700 hover:text-amber-800">
                      Forgot Password?
                    </Link>
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
                    className="mt-1 w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-semibold text-white shadow-md hover:from-amber-600 hover:to-amber-700 active:scale-[.98] transition disabled:opacity-60"
                  >
                    {loading ? "Logging in…" : "Log In"}
                  </button>
                </form>
              </div>
            </motion.div>

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

// Redirect away if already logged in
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session) {
    const role = (session.user as any)?.role;
    const destination = role === "admin" ? "/admin" : "/";
    return { redirect: { destination, permanent: false } };
  }
  return { props: {} };
}
