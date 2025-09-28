/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession, signIn } from "next-auth/react";
import DashboardLayout from "../components/DashboardLayout";

// ---------- fetch helper ----------
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
  phone?: string;
  address?: string;
  loyaltyPoints: number;
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
  const map = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost:
      "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-95 transition ${map[tone]} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`}
    />
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`}
    />
  );
}
function Badge({ tone = "muted", children }: any) {
  const colors: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    muted: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[tone]}`}>
      {children}
    </span>
  );
}
function Modal({ open, onClose, title, children, footer }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-neutral-500 hover:text-black">✕</button>
          </div>
          <div className="space-y-4">{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
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

// ---------- helpers for report ----------
function fmtDate(d: string | number | Date) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d ?? "");
  }
}
async function toDataUrl(url: string) {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return ""; // no logo fallback
  }
}

// ---------- main ----------
export default function UsersPage() {
  const { status } = useSession();
  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "blocked">(""); // status filter
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [viewUser, setViewUser] = useState<UserItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({
    name: "",
    email: "",
    password: "",
    role: "user",
    phone: "",
    address: "",
    loyaltyPoints: 0,
    isActive: true,
  });

  const url = useMemo(() => {
    const params = new URLSearchParams({
      q,
      page: String(page),
      limit: String(limit),
    });
    if (roleFilter) params.append("role", roleFilter);
    if (statusFilter) params.append("status", statusFilter);
    return `/api/users?${params.toString()}`;
  }, [q, page, roleFilter, statusFilter]);

  const { data, mutate, isLoading, error } = useSWR(url, fetcher);
  const items: UserItem[] = data?.items ?? [];
  const pages: number = data?.pages ?? 1;

  // Client-side status filtering too (works even if backend ignores ?status)
  const visibleItems = useMemo(() => {
    return items.filter((u) =>
      statusFilter === ""
        ? true
        : statusFilter === "active"
        ? u.isActive
        : !u.isActive
    );
  }, [items, statusFilter]);

  async function save() {
    if (!f.name || !f.email || (!editing && !f.password)) {
      alert("Name, Email and Password (for new user) are required");
      return;
    }

    let payload: any = { ...f };
    if (editing) {
      if (f.password) payload.newPassword = f.password;
      delete payload.password;
    }

    const method = editing ? "PATCH" : "POST";
    const endpoint = editing ? `/api/users/${editing._id}` : "/api/users";

    setBusy(true);
    const res = await fetch(endpoint, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return alert(await res.text());
    setOpen(false);
    setEditing(null);
    await mutate();
  }

  async function toggleActive(u: UserItem) {
    const res = await fetch(`/api/users/${u._id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await mutate();
  }

  async function remove(id: string) {
    if (!confirm("Delete user?")) return;
    const r = await fetch(`/api/users/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!r.ok) return alert(await r.text());
    await mutate();
  }

  // ---------- Generate Report as PDF (manual print/save) ----------
  async function generateReport() {
    // fetch ALL users matching current search/filters (ignores pagination)
    const params = new URLSearchParams({ q, page: "1", limit: "100000" });
    if (roleFilter) params.append("role", roleFilter);
    if (statusFilter) params.append("status", statusFilter);
    const allRes = await fetch(`/api/users?${params.toString()}`, {
      credentials: "same-origin",
    });
    if (!allRes.ok) {
      alert(await allRes.text());
      return;
    }
    const allData = await allRes.json();
    const allItems: UserItem[] = (allData?.items ?? []) as UserItem[];

    // logo
    const logoDataUrl = await toDataUrl("/images/RalahamiLogo.png");

    // compute totals
    const totalUsers = allItems.length;
    const totalAdmins = allItems.filter((u) => u.role === "admin").length;
    const totalActive = allItems.filter((u) => u.isActive).length;
    const totalBlocked = totalUsers - totalActive;

    // build print-friendly HTML (no auto print)
    const now = new Date();
    const title = "User Report";
    const subtitle = now.toLocaleString();

    const rowsHtml = allItems
      .map((u) => {
        return `<tr>
          <td>${u.name || ""}</td>
          <td>${u.email || ""}</td>
          <td>${u.role}</td>
          <td>${u.isActive ? "Active" : "Blocked"}</td>
          <td>${u.phone || "-"}</td>
          <td>${u.address || "-"}</td>
          <td>${fmtDate(u.createdAt)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111827; }
  .header { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
  .logo { height:42px; width:auto; }
  .title { font-size:20px; font-weight:700; margin:0; }
  .subtitle { color:#6B7280; margin-top:2px; font-size:12px; }
  .cards { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin:12px 0 16px; page-break-inside: avoid; }
  .card { border:1px solid #E5E7EB; border-radius:10px; padding:10px; }
  .card .label { font-size:11px; color:#6B7280; }
  .card .value { font-size:18px; font-weight:700; margin-top:2px; }
  table { width:100%; border-collapse: collapse; }
  th, td { border:1px solid #E5E7EB; padding:6px 8px; font-size:11px; }
  thead th { background:#F3F4F6; text-align:left; color:#374151; }
  tr { page-break-inside: avoid; }
  tfoot td { background:#F9FAFB; font-weight:600; }
  @media print { .noprint { display: none !important; } }
</style>
</head>
<body>
  <div class="header">
    ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo"/>` : ""}
    <div>
      <h1 class="title">${title}</h1>
      <div class="subtitle">${subtitle}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Total Users</div><div class="value">${totalUsers}</div></div>
    <div class="card"><div class="label">Admins</div><div class="value">${totalAdmins}</div></div>
    <div class="card"><div class="label">Active</div><div class="value">${totalActive}</div></div>
    <div class="card"><div class="label">Blocked</div><div class="value">${totalBlocked}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:160px">Name</th>
        <th style="width:200px">Email</th>
        <th style="width:80px">Role</th>
        <th style="width:80px">Status</th>
        <th style="width:120px">Phone</th>
        <th>Address</th>
        <th style="width:150px">Created</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot>
      <tr><td colspan="7">Generated on ${subtitle}</td></tr>
    </tfoot>
  </table>

  <div class="noprint" style="margin-top:16px;text-align:right;">
    <button onclick="window.print()" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#111827;color:#fff;">Print / Save as PDF</button>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow popups to open the report.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-neutral-500">Manage accounts, roles & activity</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setF({
                name: "",
                email: "",
                password: "",
                role: "user",
                phone: "",
                address: "",
                loyaltyPoints: 0,
                isActive: true,
              });
              setEditing(null);
              setOpen(true);
            }}
          >
            + Add User
          </Button>
          <Button tone="ghost" onClick={generateReport}>Generate Report</Button>
        </div>
      </div>

      {/* Stats (based on currently visible items) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Users" value={visibleItems.length} />
        <StatCard title="Admins" value={visibleItems.filter((u) => u.role === "admin").length} />
        <StatCard title="Active" value={visibleItems.filter((u) => u.isActive).length} />
        <StatCard title="Blocked" value={visibleItems.filter((u) => !u.isActive).length} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        {/* Role filter — compact */}
        <div className="w-28">
          <Select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as Role | ""); setPage(1); }}
            className="h-9 px-2 w-full"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
        </div>

        {/* Status filter — compact */}
        <div className="w-28">
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as "" | "active" | "blocked"); setPage(1); }}
            className="h-9 px-2 w-full"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </Select>
        </div>

        <Button tone="ghost" onClick={() => mutate()}>Refresh</Button>
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
              <tr><td colSpan={5} className="p-6 text-center text-neutral-500">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="p-6 text-center text-rose-600">{(error as any).message}</td></tr>
            ) : visibleItems.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-neutral-500">No users found</td></tr>
            ) : (
              visibleItems.map((u) => (
                <tr key={u._id} className="border-t hover:bg-neutral-50">
                  {/* Only the name opens the details modal */}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setViewUser(u)}
                      className="text-indigo-600 hover:underline"
                      title="View details"
                    >
                      {u.name}
                    </button>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <Select
                      value={u.role}
                      onChange={async (e) => {
                        await fetch(`/api/users/${u._id}`, {
                          method: "PATCH",
                          credentials: "same-origin",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: e.target.value }),
                        });
                        await mutate();
                      }}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </Select>
                  </td>
                  <td>
                    {u.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Blocked</Badge>}
                  </td>
                  <td className="flex gap-2">
                    <Button tone="ghost" onClick={(e) => { e.stopPropagation(); toggleActive(u); }}>
                      {u.isActive ? "Block" : "Activate"}
                    </Button>
                    <Button tone="ghost" onClick={(e) => {
                      e.stopPropagation();
                      setEditing(u);
                      setF({ ...u, password: "" });
                      setOpen(true);
                    }}>Edit</Button>
                    <Button tone="danger" onClick={(e) => { e.stopPropagation(); remove(u._id); }}>
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
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button tone="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
          <Button tone="ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</Button>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={isOpen}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "Edit User" : "Create User"}
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{editing ? "Save" : "Create"}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          {!editing && <Input placeholder="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}
          {editing && <Input placeholder="New Password (optional)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}
          <Input placeholder="Phone (+94 7XXXXXXXX)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Input placeholder="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </Select>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal open={!!viewUser} onClose={() => setViewUser(null)} title="User Details">
        {viewUser && (
          <div className="space-y-2">
            <p><strong>Name:</strong> {viewUser.name}</p>
            <p><strong>Email:</strong> {viewUser.email}</p>
            <p><strong>Role:</strong> {viewUser.role}</p>
            <p><strong>Phone:</strong> {viewUser.phone || "-"}</p>
            <p><strong>Address:</strong> {viewUser.address || "-"}</p>
            <p><strong>Status:</strong> {viewUser.isActive ? "Active" : "Blocked"}</p>
            <p><strong>Joined:</strong> {new Date(viewUser.createdAt).toLocaleString()}</p>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
