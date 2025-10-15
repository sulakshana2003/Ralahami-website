/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Navbar from "../../src/components/Navbar";
import Footer from "../../src/components/Footer";
import { motion } from "framer-motion";

export default function ResetPasswordSetPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Ensure we have the token (router.query is async)
  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.token;
    const t = Array.isArray(raw) ? raw[0] : raw;
    setToken(typeof t === "string" ? t : null);
  }, [router.isReady, router.query.token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!token) {
      setErr("Invalid or missing token.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.message || "Failed to reset password.");
      setMsg("Password reset successful. You can now log in.");
    } catch (e: any) {
      setErr(e.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Set New Password — Ralahami</title>
        <link rel="preload" href="/videos/myaccount.mp4" as="video" />
      </Head>

      <Navbar />

      <div className="relative min-h-screen overflow-hidden">
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-stone-900/45 to-black/55" />

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

        <main className="relative z-10 flex min-h-screen items-center justify-center px-4 sm:px-6 py-14 sm:py-16">
          <div className="w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="mx-auto w-full max-w-xl rounded-[28px] border border-white/40 bg-white/90 p-[1.25px] shadow-2xl backdrop-blur-md"
            >
              <div className="rounded-[26px] bg-white/95 p-6 sm:p-8">
                <div className="mb-6 text-center">
                  <motion.h1
                    className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-stone-900"
                    animate={{ scale: [1, 1.05, 1], y: [0, -3, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Set Your New Password
                  </motion.h1>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="relative">
                    <label htmlFor="password" className="sr-only">New Password</label>
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      🔒
                    </span>
                    <input
                      id="password"
                      type="password"
                      placeholder="New password"
                      className="h-14 w-full rounded-full border-2 border-stone-300 bg-white pl-12 pr-5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="relative">
                    <label htmlFor="confirm" className="sr-only">Confirm Password</label>
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                      ✅
                    </span>
                    <input
                      id="confirm"
                      type="password"
                      placeholder="Confirm password"
                      className="h-14 w-full rounded-full border-2 border-stone-300 bg-white pl-12 pr-5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  {err && (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-red-600">
                      {err}
                    </p>
                  )}
                  {msg && (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-emerald-700">
                      {msg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="mt-1 w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-semibold text-white shadow-md hover:from-amber-600 hover:to-amber-700 active:scale-[.98] transition disabled:opacity-60"
                  >
                    {loading ? "Resetting…" : "Reset Password"}
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
