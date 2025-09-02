// pages/login.tsx
import { FormEvent, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const { update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (!res || !res.ok) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // refresh session to get role injected by NextAuth callbacks
    const fresh = await update();
    const role = (fresh?.user as any)?.role;
// after const role = ...
// after const role = ...
if (role === "admin") {
-  router.replace("/admin");            // menu
  return;
}

    setLoading(false);
  }

  return (
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
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
      </div>
    </div>
  );
}
