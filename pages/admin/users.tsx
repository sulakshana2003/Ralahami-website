
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession, signIn, signOut } from "next-auth/react";

// ---------- small utils ----------
const fetcher = (url: string) =>
  fetch(url, { credentials: "same-origin" }).then(async (r) => {
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  });

function useDebounced<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

type Role = "user" | "admin";
type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ---------- subcomponents ----------
function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "success" | "danger" | "muted" }) {
  const tones: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    muted: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function IconButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-neutral-50 active:scale-[.98] transition ${props.className || ""}`}
    />
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-neutral-800 active:scale-[.98] transition ${props.className || ""}`}
    />
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 ${props.className || ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 ${props.className || ""}`}
    />
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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-sm text-neutral-500 hover:text-black">✕</button>
          </div>
          <div className="space-y-4">{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-full rounded bg-neutral-200" />
        </td>
      ))}
    </tr>
  );
}

// ---------- main page ----------
export default function AdminUsersPage() {
  const { status } = useSession();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q);
  const [page, setPage] = useState(1);
  const limit = 10;

  // create modal state
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; password: string; role: Role }>({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const url = useMemo(
    () => `/api/users?q=${encodeURIComponent(debouncedQ)}&page=${page}&limit=${limit}`,
    [debouncedQ, page]
  );
  const { data, mutate, isLoading, error } = useSWR(url, fetcher);

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const items: UserItem[] = data?.items ?? [];
  const pages: number = data?.pages ?? 1;

  async function changeRole(id: string, role: Role) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
      credentials: "same-origin",
    });
    if (!res.ok) alert(await res.text());
    await mutate();
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
      credentials: "same-origin",
    });
    if (!res.ok) alert(await res.text());
    await mutate();
  }

  async function resetPassword(id: string) {
    const newPassword = prompt("New password:");
    if (!newPassword) return;
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
      credentials: "same-origin",
    });
    if (!res.ok) alert(await res.text());
    await mutate();
  }

  async function remove(id: string) {
    if (!confirm("Delete this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) alert(await res.text());
    await mutate();
  }

  async function createUser() {
    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password are required");
      return;
    }
    const res = await fetch(`/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
      credentials: "same-origin",
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setForm({ name: "", email: "", password: "", role: "user" });
    setCreateOpen(false);
    await mutate();
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold">Admin • User Management</h1>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={() => setCreateOpen(true)}>+ New User</PrimaryButton>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 active:scale-[.98] transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Controls */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <TextInput
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <IconButton onClick={() => mutate()}>Refresh</IconButton>
          </div>
        </div>

        {/* Table / Cards */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead className="bg-neutral-50 text-left text-sm">
                <tr>
                  <th className="px-4 py-3 font-medium text-neutral-600">Name</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Email</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Role</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Status</th>
                  <th className="px-4 py-3 font-medium text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : items.length === 0
                  ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-neutral-500">
                        {error ? "Error loading users" : "No users found"}
                      </td>
                    </tr>
                    )
                  : items.map((u) => (
                      <tr key={u._id} className="border-t border-neutral-100">
                        <td className="px-4 py-4">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-neutral-500">ID: {u._id}</div>
                        </td>
                        <td className="px-4 py-4">{u.email}</td>
                        <td className="px-4 py-4">
                          <Select
                            value={u.role}
                            onChange={(e) => changeRole(u._id, e.target.value as Role)}
                            aria-label="Change role"
                            className="h-9 w-32"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </Select>
                        </td>
                        <td className="px-4 py-4">
                          {u.isActive ? <Badge tone="success">active</Badge> : <Badge tone="danger">blocked</Badge>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <IconButton onClick={() => toggleActive(u._id, u.isActive)}>
                              {u.isActive ? "Block" : "Unblock"}
                            </IconButton>
                            <IconButton onClick={() => resetPassword(u._id)}>Reset Password</IconButton>
                            <IconButton className="border-rose-200 hover:bg-rose-50" onClick={() => remove(u._id)}>
                              Delete
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 p-3 md:hidden">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="mb-3 h-4 w-2/3 rounded bg-neutral-200" />
                    <div className="mb-2 h-3 w-1/2 rounded bg-neutral-200" />
                    <div className="h-3 w-1/3 rounded bg-neutral-200" />
                  </div>
                ))
              : items.length === 0
              ? (
                <div className="p-6 text-center text-sm text-neutral-500">
                  {error ? "Error loading users" : "No users found"}
                </div>
                )
              : items.map((u) => (
                  <div key={u._id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-neutral-500">{u.email}</div>
                      </div>
                      <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "active" : "blocked"}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Select
                        value={u.role}
                        onChange={(e) => changeRole(u._id, e.target.value as Role)}
                        className="h-9"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        <IconButton onClick={() => toggleActive(u._id, u.isActive)}>
                          {u.isActive ? "Block" : "Unblock"}
                        </IconButton>
                        <IconButton onClick={() => resetPassword(u._id)}>Reset</IconButton>
                        <IconButton className="border-rose-200 hover:bg-rose-50" onClick={() => remove(u._id)}>
                          Delete
                        </IconButton>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            Page <span className="font-medium text-neutral-800">{page}</span> of{" "}
            <span className="font-medium text-neutral-800">{pages}</span>
          </p>
          <div className="flex gap-2">
            <IconButton disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </IconButton>
            <IconButton disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
              Next
            </IconButton>
          </div>
        </div>
      </main>

      {/* Create Modal */}
      <Modal
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        title="Create new user"
        footer={
          <>
            <IconButton onClick={() => setCreateOpen(false)}>Cancel</IconButton>
            <PrimaryButton onClick={createUser}>Create</PrimaryButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextInput
            placeholder="Email address"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <TextInput
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}
