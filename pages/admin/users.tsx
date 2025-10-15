/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession, signIn } from "next-auth/react";
import DashboardLayout from "../../src/components/DashboardLayout";

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

  const { data: sessionData } = useSession();
  const adminDisplay =
    (sessionData?.user as any)?.name ||
    (sessionData?.user as any)?.email ||
    "Admin";

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | Role>("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "blocked">("");

  // show all users on one page
  const SHOW_ALL = true;
  const [page, setPage] = useState(1);
  const limit = SHOW_ALL ? 100000 : 10;

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

  // email modal
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<"single" | "bulk">("single");
  const [emailTarget, setEmailTarget] = useState<UserItem | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams({
      q,
      page: String(page),
      limit: String(limit),
    });
    if (roleFilter) params.append("role", roleFilter);
    if (statusFilter) params.append("status", statusFilter);
    return `/api/users?${params.toString()}`;
  }, [q, page, roleFilter, statusFilter, limit]);

  const { data, mutate, isLoading, error } = useSWR(url, fetcher);
  const items: UserItem[] = data?.items ?? [];
  const pages: number = data?.pages ?? 1;

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

  // ---------- Generate Report (print/save) ----------
  async function generateReport() {
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

    const logoDataUrl = await toDataUrl("/images/RalahamiLogo.png");

    const totalUsers = allItems.length;
    const totalAdmins = allItems.filter((u) => u.role === "admin").length;
    const totalActive = allItems.filter((u) => u.isActive).length;
    const totalBlocked = totalUsers - totalActive;

    // --- aggregate by date (YYYY-MM-DD)
    const dateCounts: Record<string, number> = {};
    for (const u of allItems) {
      const d = new Date(u.createdAt);
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().slice(0, 10);
        dateCounts[key] = (dateCounts[key] || 0) + 1;
      }
    }
    const dateKeys = Object.keys(dateCounts).sort();
    const maxCount = dateKeys.length ? Math.max(...dateKeys.map(k => dateCounts[k])) : 0;

    // --- LINE CHART (replaces bar)
    // canvas
    const W = 820, H = 260;
    const m = { t: 28, r: 20, b: 56, l: 40 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;

    const n = Math.max(dateKeys.length, 1);
    const step = n > 1 ? iw / (n - 1) : 0;

    const points = dateKeys.map((k, i) => {
      const v = dateCounts[k];
      const y = m.t + ih - (maxCount ? (v / maxCount) * ih : 0);
      const x = m.l + i * step;
      return { x, y, k, v };
    });

    const path = points.map((p, i) => (i ? `L ${p.x} ${p.y}` : `M ${p.x} ${p.y}`)).join(" ");
    const dots = points.map(p =>
      `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#4f46e5"><title>${p.k}: ${p.v}</title></circle>`
    ).join("");

    const gridTicks = (() => {
      const ticks = 5;
      let out = "";
      for (let t = 0; t <= ticks; t++) {
        const val = Math.round((maxCount * t) / ticks);
        const y = m.t + ih - (ih * t) / ticks;
        out += `<line x1="${m.l}" y1="${y}" x2="${W - m.r}" y2="${y}" stroke="#e5e7eb"></line>`;
        out += `<text x="${m.l - 6}" y="${y + 3}" font-size="10" text-anchor="end" fill="#374151">${val}</text>`;
      }
      return out;
    })();

    const xLabels = dateKeys.map((k, i) => {
      const x = m.l + i * step;
      const y = H - 8;
      return `<text x="${x}" y="${y}" font-size="10" text-anchor="end" transform="rotate(-40 ${x},${y})" fill="#374151">${k}</text>`;
    }).join("");

    const lineChartSvg = `
<svg width="100%" height="240" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${W}" height="${H}" fill="white"/>
  <text x="${W/2}" y="18" text-anchor="middle" font-size="12" fill="#111827" font-weight="600">Users per Registration Date</text>
  ${gridTicks}
  <polyline points="${points.map(p=>`${p.x},${p.y}`).join(" ")}" fill="none" stroke="#c7d2fe" stroke-width="8" stroke-linecap="round" />
  <path d="${path}" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" />
  ${dots}
  ${xLabels}
  <rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="none" stroke="#e5e7eb"/>
</svg>`.trim();

    // --- DONUT (Active vs Blocked)
    const D = 300, cx = D/2, cy = D/2, r = 90, sw = 26, circ = 2*Math.PI*r;
    const active = totalActive, blocked = totalBlocked, totalAB = Math.max(active+blocked,1);
    const activeLen = (active/totalAB)*circ, blockedLen = (blocked/totalAB)*circ;

    const donutSvg = `
<svg width="100%" height="240" viewBox="0 0 ${D} ${D}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${D}" height="${D}" fill="white"/>
  <text x="${D/2}" y="20" text-anchor="middle" font-size="12" fill="#111827" font-weight="600">Active vs Blocked</text>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${sw}" />
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#10b981" stroke-width="${sw}"
          stroke-dasharray="${activeLen} ${circ}" stroke-dashoffset="0" transform="rotate(-90 ${cx} ${cy})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ef4444" stroke-width="${sw}"
          stroke-dasharray="${blockedLen} ${circ}" stroke-dashoffset="-${activeLen}" transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="18" fill="#111827" font-weight="700">${totalAB}</text>
  <text x="${cx}" y="${cy + 24}" text-anchor="middle" font-size="10" fill="#6b7280">users</text>
  <rect x="${cx - 90}" y="${D - 42}" width="10" height="10" fill="#10b981"/>
  <text x="${cx - 74}" y="${D - 33}" font-size="11" fill="#374151">Active (${active})</text>
  <rect x="${cx + 20}" y="${D - 42}" width="10" height="10" fill="#ef4444"/>
  <text x="${cx + 36}" y="${D - 33}" font-size="11" fill="#374151">Blocked (${blocked})</text>
</svg>`.trim();

    // rows
    const rowsHtml = allItems.map((u) => {
      return `<tr>
        <td>${u.name || ""}</td>
        <td>${u.email || ""}</td>
        <td>${u.role}</td>
        <td>${u.isActive ? "Active" : "Blocked"}</td>
        <td>${u.phone || "-"}</td>
        <td>${u.address || "-"}</td>
        <td>${fmtDate(u.createdAt)}</td>
      </tr>`;
    }).join("");

    // HTML
    const now = new Date();
    const title = "User Report";
    const subtitle = now.toLocaleString();

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
  .cards { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin:12px 0 12px; page-break-inside: avoid; }
  .card { border:1px solid #E5E7EB; border-radius:10px; padding:10px; background:#fff; }
  .card .label { font-size:11px; color:#6B7280; }
  .card .value { font-size:18px; font-weight:700; margin-top:2px; }
  /* tighter gap to table */
  .charts {
    display:grid;
    grid-template-columns: minmax(520px, 1fr) 340px;
    gap:16px;
    align-items:start;
    margin:6px 0 8px; /* bottom margin controls gap to table */
  }
  .chartCard { border:1px solid #E5E7EB; border-radius:10px; padding:10px; background:#fff; }
  .chartCard svg { display:block; width:100%; height:240px; }
  table { width:100%; border-collapse: collapse; }
  thead th { background:#F3F4F6; text-align:left; color:#374151; }
  th, td { border:1px solid #E5E7EB; padding:6px 8px; font-size:11px; }
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

  <div class="charts">
    <div class="chartCard">${lineChartSvg}</div>
    <div class="chartCard">${donutSvg}</div>
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

  // ---------- Email (single) ----------
  async function sendEmailSingle() {
    if (!emailTarget?._id) return;
    if (!emailSubject || !emailBody) {
      alert("Subject and message are required");
      return;
    }
    setEmailBusy(true);
    try {
      const r = await fetch(`/api/users/send-email`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: emailTarget._id,
          subject: emailSubject,
          message: emailBody,
          sentBy: adminDisplay,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      alert("Email sent");
      setEmailOpen(false);
    } catch (e: any) {
      alert(e.message || "Failed to send email");
    } finally {
      setEmailBusy(false);
    }
  }

  // ---------- Email (bulk) ----------
  async function sendEmailBulk() {
    const ids = visibleItems.map((u) => u._id);
    if (ids.length === 0) {
      alert("No users in current list.");
      return;
    }
    if (!emailSubject || !emailBody) {
      alert("Subject and message are required");
      return;
    }
    if (!confirm(`Send to ${ids.length} users?`)) return;

    setEmailBusy(true);
    try {
      const r = await fetch(`/api/users/send-email`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ids,
          subject: emailSubject,
          message: emailBody,
          sentBy: adminDisplay,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      alert("Emails sent");
      setEmailOpen(false);
    } catch (e: any) {
      alert(e.message || "Failed to send emails");
    } finally {
      setEmailBusy(false);
    }
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

          {/* Email all currently visible users */}
          <Button
            tone="ghost"
            onClick={() => {
              setEmailMode("bulk");
              setEmailTarget(null);
              setEmailSubject("");
              setEmailBody("");
              setEmailOpen(true);
            }}
          >
            Email All (Current List)
          </Button>
        </div>
      </div>

      {/* Stats */}
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
                    <Button
                      tone="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmailMode("single");
                        setEmailTarget(u);
                        setEmailSubject("");
                        setEmailBody("");
                        setEmailOpen(true);
                      }}
                      title="Send email to this user"
                    >
                      Email
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (kept for completeness but hidden if SHOW_ALL) */}
      {!SHOW_ALL && (
        <div className="mt-4 flex justify-between text-sm">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button tone="ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button tone="ghost" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</Button>
          </div>
        </div>
      )}

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

      {/* Email compose modal */}
      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title={emailMode === "single" ? `Email: ${emailTarget?.name || ""}` : "Email All (Current List)"}
        footer={
          <>
            <Button tone="ghost" onClick={() => setEmailOpen(false)}>Cancel</Button>
            {emailMode === "single" ? (
              <Button onClick={sendEmailSingle} disabled={emailBusy}>
                {emailBusy ? "Sending..." : "Send"}
              </Button>
            ) : (
              <Button onClick={sendEmailBulk} disabled={emailBusy}>
                {emailBusy ? "Sending..." : `Send to ${visibleItems.length}`}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-neutral-500 mb-1">From</div>
            <Input value={`${adminDisplay} (admin)`} readOnly />
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Subject</div>
            <Input
              placeholder="Subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Message</div>
            <textarea
              className="h-36 w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm focus:ring-2 focus:ring-indigo-200"
              placeholder="Write your message..."
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            <div className="mt-2 text-[11px] text-neutral-500">
              Your restaurant logo is embedded automatically. A footer “Sent by: {adminDisplay}” will be added.
            </div>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
