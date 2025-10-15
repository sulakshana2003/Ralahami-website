/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSidePropsContext } from "next";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

/* ---------------- Helpers ---------------- */
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

/* ---------------- Background Video ---------------- */
function BackgroundVideo() {
  return (
    <>
      <Head>
        <link rel="preload" href="/videos/account-bg.mp4" as="video" />
      </Head>

      <div className="fixed inset-0 -z-10">
        <video
          className="h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/myaccount.mp4"
          aria-hidden="true"
        >
          <source src="/videos/myaccount.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/30" />
      </div>
    </>
  );
}

/* ---------------- Edit Modal ---------------- */
function EditProfileModal({ user, isOpen, onClose, onUpdate }: any) {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/users/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      setSuccess(true);
      await onUpdate();

      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Edit Profile</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
              disabled={loading}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              Profile updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* --- Name Field --- */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                required
                disabled={loading}
              />
            </div>

            {/* --- Phone Field --- */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+94 7XXXXXXXX"
                pattern="^\+94\s7\d{8}$"
                title="Phone number must be in +94 7XXXXXXXX format"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-neutral-500">
                Format: +94 7XXXXXXXX (e.g., +94 771234567)
              </p>
            </div>

            {/* --- Address Field --- */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                placeholder="Enter your address"
                disabled={loading}
              />
            </div>

            {/* --- Buttons --- */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border rounded-xl text-sm font-medium hover:bg-neutral-50 transition disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main Account Page ---------------- */
export default function Account() {
  const { data, update } = useSession();
  const user = data?.user as any;
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleProfileUpdate = async () => {
    await update();
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundVideo />

      <div className="px-4 sm:px-6 pt-24 pb-12 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm bg-white/90 backdrop-blur hover:bg-white transition"
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
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              My Account
            </h1>
            <p className="text-sm text-white/80">
              Profile overview and account actions
            </p>
          </div>
        </div>

        {/* Profile Card Section */}
        <div className="overflow-hidden rounded-2xl border bg-white/90 backdrop-blur shadow-sm">
          <div className="h-28 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
          <div className="-mt-10 px-6 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl ring-4 ring-white bg-neutral-100 text-neutral-700 flex items-center justify-center text-2xl font-bold overflow-hidden">
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={user?.name || "Avatar"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(user?.name, user?.email)
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">
                      {user?.name || "Unnamed User"}
                    </h2>
                    <RoleBadge role={(user?.role as string) || "user"} />
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2 text-sm text-neutral-600">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="opacity-80"
                    >
                      <path
                        d="M4 6h16v12H4z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="m4 7 8 6 8-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                      />
                    </svg>
                    {user?.email || "no-email"}
                  </div>
                </div>
              </div>

              <div className="pb-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[.98] transition"
                >
                  ✏️ Edit Profile
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-rose-700 active:scale-[.98] transition"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="px-6 sm:px-8 pb-8 pt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    Name
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">
                    {user?.name || "—"}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    Email
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900 break-all">
                    {user?.email || "—"}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    Phone
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">
                    {user?.phone || "Not set"}
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    Role
                  </div>
                  <div className="mt-1">
                    <RoleBadge role={(user?.role as string) || "user"} />
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-neutral-500">
                    Address
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">
                    {user?.address || "Not set"}
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="space-y-4">
                <div className="rounded-xl border bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
                    Quick Links
                  </div>
                  <div className="grid gap-2">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 transition"
                    >
                      <span>Home</span>
                      <span>↗</span>
                    </Link>
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 transition"
                    >
                      <span>Products</span>
                      <span>↗</span>
                    </Link>
                    <Link
                      href="/reservation"
                      className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 transition"
                    >
                      <span>Reservations</span>
                      <span>↗</span>
                    </Link>
                    {user?.role === "admin" && (
                      <Link
                        href="/admin"
                        className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50 transition"
                      >
                        <span>Admin Dashboard</span>
                        <span>↗</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/80 drop-shadow">
          Need to update your Email? Contact an Admin via ralahamihotel@gmail.com . Your
          account information is private and only visible to you and administrators.
        </p>
      </div>

      <EditProfileModal
        user={user}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdate={handleProfileUpdate}
      />
    </div>
  );
}

/* ---------------- Server Auth Check ---------------- */
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) return { redirect: { destination: "/login", permanent: false } };
  return { props: {} };
}
