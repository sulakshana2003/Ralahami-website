import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from './components/Navbar'
import Footer from "./components/Footer";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong.");
      }

      setMessage("If an account with that email exists, a reset link has been sent.");
      setLoading(false);
    } catch (error) {
      setMessage("Failed to send reset email. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-14 sm:py-16">
        <div className="w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mx-auto w-full max-w-xl rounded-[28px] border border-white/40 bg-white/90 p-[1.25px] shadow-2xl backdrop-blur-md"
          >
            <div className="rounded-[26px] bg-white/95 p-6 sm:p-8">
              <div className="mb-6 text-center">
                <motion.h1 className="text-3xl sm:text-[32px] font-extrabold tracking-tight text-stone-900">
                  Reset Your Password
                </motion.h1>
              </div>
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="relative">
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="h-14 w-full rounded-full border-2 border-stone-300 bg-white pl-12 pr-5 text-sm text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-amber-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 py-3.5 text-sm font-semibold text-white shadow-md hover:from-amber-600 hover:to-amber-700 active:scale-[.98] transition disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
                {message && (
                  <p className="mt-4 text-center text-sm text-stone-600">{message}</p>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
