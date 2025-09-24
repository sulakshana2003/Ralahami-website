// pages/admin/users.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession, signIn, } from "next-auth/react";
import DashboardLayout from "../components/DashboardLayout";

// ---------- utils ----------
const fetcher = (url: string) =>
  fetch(url, { credentials: "same-origin" }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  });

// ---------- types ----------
type Role = "user" | "admin";
type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

// ---------- UI atoms ----------
function Button({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost:
      "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-[.98] transition ${
        styles[tone]
      } ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
  );
}
function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "success" | "danger" | "muted";
}) {
  const map: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    muted: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-black"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">{children}</div>
          {footer && (
            <div className="mt-6 flex justify-end gap-2">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

// ---------- main ----------
export default function UsersPage() {
  const { status } = useSession();
  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({
    name: "",
    email: "",
    password: "",
    role: "user",
    isActive: true,
  });

  const url = useMemo(
    () => `/api/users?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    [q, page]
  );
  const { data, mutate, isLoading, error } = useSWR(url, fetcher);

  const items: UserItem[] = data?.items ?? [];
  const pages: number = data?.pages ?? 1;

  // actions
  async function save() {
    const payload = { ...f };
    const url = editing ? `/api/users/${editing._id}` : `/api/users`;
    const method = editing ? "PUT" : "POST";
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return alert(await res.text());
    setOpen(false);
    setEditing(null);
    await mutate();
  }

  async function remove(id: string) {
    if (!confirm("Delete user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (!res.ok) return alert(await res.text());
    await mutate();
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-neutral-500">
            Manage accounts, roles & activity
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Users" value={items.length} />
        <StatCard
          title="Admins"
          value={items.filter((u) => u.role === "admin").length}
        />
        <StatCard
          title="Active"
          value={items.filter((u) => u.isActive).length}
        />
        <StatCard
          title="Blocked"
          value={items.filter((u) => !u.isActive).length}
        />
      </div>

      {/* Search */}
      <div className="mb-4 flex gap-3">
        <Input
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Button tone="ghost" onClick={() => mutate()}>
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-neutral-500">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-rose-600">
                  {(error as any).message}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-neutral-500">
                  No users found
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="px-4 py-3">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <Select
                      value={u.role}
                      onChange={async (e) => {
                        await fetch(`/api/users/${u._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: e.target.value }),
                        });
                        mutate();
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </Select>
                  </td>
                  <td>
                    {u.isActive ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="danger">Blocked</Badge>
                    )}
                  </td>
                  <td className="flex gap-2">
                    <Button tone="danger" onClick={() => remove(u._id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-between text-sm">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            tone="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            tone="ghost"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={isOpen}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit User` : "Create User"}
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={busy}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Full name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <Input
            placeholder="Email"
            type="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
          {!editing && (
            <Input
              placeholder="Password"
              type="password"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
          )}
          <Select
            value={f.role}
            onChange={(e) => setF({ ...f, role: e.target.value as Role })}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </Select>
          <Select
            value={String(f.isActive)}
            onChange={(e) =>
              setF({ ...f, isActive: e.target.value === "true" })
            }
          >
            <option value="true">Active</option>
            <option value="false">Blocked</option>
          </Select>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
