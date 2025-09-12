/* eslint-disable @next/next/no-html-link-for-pages */
// /pages/admin/index.tsx
import { signOut } from "next-auth/react";

export default function AdminMenu() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h1 className="text-lg font-semibold mb-4">Admin Menu</h1>
        <div className="grid gap-3">
          <a
            href="/admin/users"
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50 text-center"
          >
            User Management
          </a>
          <a
            href="/admin/products"
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50 text-center"
          >
            Product Management
          </a>
          <a
            href="/admin/finance"
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm hover:bg-neutral-50 text-center"
          >
            Finance Management
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
