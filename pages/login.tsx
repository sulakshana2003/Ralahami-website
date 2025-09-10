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
      return;
    }

    // Refresh session so callbacks (id/role) are available
    const fresh = await update();
    const role = (fresh?.user as any)?.role;

    // Route based on role
    if (role === "admin") {
      router.replace("/admin"); // admin dashboard
      return;
    }

    router.replace("/"); // normal users → home
    setLoading(false);
  }

  return (
    <>
      <Head>
        <title>Login — Ralahami</title>
      </Head>
      <Navbar/>

      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <h1 className="text-lg font-semibold mb-4">Login</h1>

          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>

          <p className="mt-4 text-sm text-neutral-700">
            Don’t have an account?{" "}
            <Link href="/register" className="underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
      <Footer/>
    </>
  );
}

// Redirect away if already logged in
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session) {
    // If admin, go straight to admin; else home
    const role = (session.user as any)?.role;
    const destination = role === "admin" ? "/admin" : "/";
    return { redirect: { destination, permanent: false } };
  }
  return { props: {} };
}