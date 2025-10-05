/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import useSWR from "swr";
import { useSession, signIn } from "next-auth/react";
import DashboardLayout from "../components/DashboardLayout";

/* =============================== Fetcher =============================== */
const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

/* =============================== UI Primitives =============================== */
/** Professional Buttons */
function Button({
  children,
  tone = "primary",
  variant = "solid",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "neutral" | "danger" | "success";
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };
  const tones = {
    primary: {
      solid: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-300 shadow-sm",
      outline:
        "border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
      ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
    },
    neutral: {
      solid: "bg-slate-800 text-white hover:bg-black/90 focus:ring-slate-300 shadow-sm",
      outline:
        "border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
      ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
    },
    success: {
      solid:
        "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300 shadow-sm",
      outline:
        "border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
      ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
    },
    danger: {
      solid: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-300 shadow-sm",
      outline:
        "border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 focus:ring-slate-200 shadow-sm",
      ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
    },
  } as const;

  return (
    <button
      {...props}
      className={[
        base,
        sizes[size],
        tones[tone][variant],
        className || "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Professional Icon Button */
function IconButton({
  label,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...props}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm",
        className || "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ---------- forwardRef for input controls ---------- */
const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:outline-none ${className}`}
    />
  )
);
Input.displayName = "Input";

const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:outline-none ${className}`}
    />
  )
);
TextArea.displayName = "TextArea";

const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => (
    <select
      ref={ref}
      {...props}
      className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:outline-none ${className}`}
    />
  )
);
Select.displayName = "Select";

function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "success" | "danger" | "muted" | "info" | "warning";
}) {
  const map: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    muted: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    info: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}
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
  maxWidth = "max-w-4xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${maxWidth} rounded-2xl bg-white p-6 shadow-2xl border border-slate-200`}>
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 rounded-lg"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* =============================== Toast (no deps) =============================== */
type ToastItem = { id: number; title: string; tone?: "success" | "danger" | "info" };
function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  function push(title: string, tone: ToastItem["tone"] = "info") {
    const id = Date.now();
    setItems((xs) => [...xs, { id, title, tone }]);
    setTimeout(() => {
      setItems((xs) => xs.filter((x) => x.id !== id));
    }, 3000);
  }
  function remove(id: number) {
    setItems((xs) => xs.filter((x) => x.id !== id));
  }
  return { items, push, remove };
}
function ToastHost({ items, onClose }: { items: ToastItem[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[120] flex flex-col gap-2">
      {items.map((t) => {
        const toneClass =
          t.tone === "success"
            ? "bg-emerald-600"
            : t.tone === "danger"
            ? "bg-rose-600"
            : "bg-slate-900";
        return (
          <div
            key={t.id}
            className={`text-white text-sm rounded-lg shadow px-3 py-2 ${toneClass} flex items-center gap-3`}
          >
            <span>{t.title}</span>
            <button
              className="text-white/70 hover:text-white ml-2"
              onClick={() => onClose(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* =============================== Utils =============================== */
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function downloadCSV(rows: any[], filename = "products.csv") {
  const headers = Object.keys(rows[0] || {});
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* =============================== Types =============================== */
type Product = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  price: number;
  promotion: number;
  category?: string;
  spicyLevel: number;
  isAvailable: boolean;
  isSignatureToday: boolean;
  tags: string[];
};

type AvailabilityFilter = "all" | "available" | "unavailable";

/* =============================== Main =============================== */
export default function ProductsAdminPage() {
  const { status } = useSession();
  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  /* ----- Toasts ----- */
  const toasts = useToasts();

  /* ----- Search & Filters ----- */
  const [q, setQ] = useState("");
  const qDeb = useDebounced(q, 250);
  const [category, setCategory] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [signatureToday, setSignatureToday] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Restore view from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("admin.products.view");
    if (saved) {
      try {
        const v = JSON.parse(saved);
        setCategory(v.category ?? "");
        setAvailability(v.availability ?? "all");
        setSignatureToday(!!v.signatureToday);
        setSort(v.sort ?? "newest");
        setPageSize(v.pageSize ?? 12);
      } catch {}
    }
  }, []);
  // Save view
  useEffect(() => {
    const v = { category, availability, signatureToday, sort, pageSize };
    localStorage.setItem("admin.products.view", JSON.stringify(v));
  }, [category, availability, signatureToday, sort, pageSize]);

  /* ----- Create/Edit modal state ----- */
  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const [f, setF] = useState<any>({
    name: "",
    slug: "",
    description: "",
    category: "",
    imagesText: "",
    tagsText: "",
    price: "",
    promotion: "",
    spicyLevel: "",
    isSignatureToday: false,
    isAvailable: true,
  });

  /* ----- View modal state ----- */
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Product | null>(null);

  /* ----- Bulk selection ----- */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allSelected = useMemo(
    () => selectedIds.length > 0 && selectedIds.length === items.length,
    // eslint-disable-next-line
    [selectedIds]
  );

  /* ----- Data fetching ----- */
  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (qDeb) params.set("q", qDeb);
    if (category) params.set("category", category);
    if (signatureToday) params.set("signatureToday", "1");
    params.set("limit", "200");
    return `/api/products${params.toString() ? `?${params}` : ""}`;
  }, [qDeb, category, signatureToday]);

  const { data, isLoading, error, mutate } = useSWR<Product[]>(listUrl, fetcher);
  const all = data ?? [];

  /* ----- Client-side availability filter + sort ----- */
  const filtered = useMemo(() => {
    let rows = [...all];
    if (availability === "available") rows = rows.filter((r) => r.isAvailable);
    if (availability === "unavailable") rows = rows.filter((r) => !r.isAvailable);

    if (sort === "newest") {
      // keep as-is
    } else if (sort === "name-asc") rows.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "name-desc") rows.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === "price-asc") rows.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") rows.sort((a, b) => b.price - a.price);

    return rows;
  }, [all, availability, sort]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, pages);
  useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
    // eslint-disable-next-line
  }, [pages]);

  const items = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  /* =============================== Handlers =============================== */
  function openCreate() {
    setEditing(null);
    setF({
      name: "",
      slug: "",
      description: "",
      category: "",
      imagesText: "",
      tagsText: "",
      price: "",
      promotion: "",
      spicyLevel: "",
      isSignatureToday: false,
      isAvailable: true,
    });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setF({
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      category: p.category || "",
      imagesText: (p.images || []).join("\n"),
      tagsText: (p.tags || []).join(", "),
      price: String(p.price),
      promotion: String(p.promotion),
      spicyLevel: String(p.spicyLevel),
      isSignatureToday: p.isSignatureToday,
      isAvailable: p.isAvailable,
    });
    setOpen(true);
  }

  function openView(p: Product) {
    setViewing(p);
    setViewOpen(true);
  }

  async function save() {
    const priceVal = Number(f.price);
    const promoVal = Number(f.promotion);
    const spicyVal = Number(f.spicyLevel);

    if (!f.name.trim() || !f.slug.trim()) return toasts.push("Name & Slug are required", "danger");
    if (priceVal < 0) return toasts.push("Price must be positive", "danger");
    if (promoVal < 0) return toasts.push("Promotion cannot be negative", "danger");
    if (spicyVal < 0 || spicyVal > 3) return toasts.push("Spicy level must be 0–3", "danger");

    const payload: any = {
      name: f.name.trim(),
      slug: f.slug.trim(),
      description: f.description.trim() || undefined,
      category: f.category.trim() || undefined,
      images: f.imagesText
        .split("\n")
        .map((x: string) => x.trim())
        .filter(Boolean),
      tags: f.tagsText
        .split(",")
        .map((x: string) => x.trim())
        .filter(Boolean),
      price: priceVal,
      promotion: promoVal,
      spicyLevel: spicyVal,
      isSignatureToday: Boolean(f.isSignatureToday),
    };

    const url = editing ? `/api/products/${encodeURIComponent(editing.slug)}` : `/api/products`;
    const method = editing ? "PUT" : "POST";

    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const msg = await res.text();
      toasts.push(msg || "Failed to save", "danger");
      return;
    }
    setOpen(false);
    setEditing(null);
    await mutate();
    toasts.push(editing ? "Product updated" : "Product created", "success");
  }

  async function remove(slug: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`, { method: "DELETE" });
    if (!res.ok) {
      toasts.push(await res.text(), "danger");
      return;
    }
    await mutate();
    toasts.push("Product deleted", "success");
  }

  // Optimistic toggle with rollback (SWR v2)
  async function toggleAvailability(p: Product) {
    const next = !p.isAvailable;

    // function that transforms current cache → updated cache
    const optimistic = (xs: Product[] = []) =>
      xs.map((x) => (x._id === p._id ? { ...x, isAvailable: next } : x));

    // Optimistic update without revalidate (v2 API)
    await mutate(optimistic, {
      revalidate: false,       // don't refetch yet
      populateCache: true,     // write result into cache
      rollbackOnError: true,   // if fetch fails, rollback to previous
    });

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.slug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      });
      if (!res.ok) throw new Error(await res.text());

      // sync with server
      await mutate();
      toasts.push(next ? "Marked available" : "Marked unavailable", "success");
    } catch (err: any) {
      // SWR rolls back automatically; we revalidate to be in sync
      await mutate();
      toasts.push(err?.message || "Failed to toggle", "danger");
    }
  }

  // Bulk actions (client-side sequential)
  async function bulkToggle(next: boolean) {
    const ids = new Set(selectedIds);
    const rows = items.filter((x) => ids.has(x._id));
    if (rows.length === 0) return;

    // optimistic (SWR v2)
    await mutate(
      (xs: Product[] = []) => xs.map((x) => (ids.has(x._id) ? { ...x, isAvailable: next } : x)),
      {
        revalidate: false,
        populateCache: true,
        rollbackOnError: true,
      }
    );

    try {
      await Promise.all(
        rows.map((p) =>
          fetch(`/api/products/${encodeURIComponent(p.slug)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isAvailable: next }),
          })
        )
      );
      await mutate();
      setSelectedIds([]);
      toasts.push(
        next ? "Selected products marked available" : "Selected products marked unavailable",
        "success"
      );
    } catch {
      await mutate();
      toasts.push("Bulk toggle failed", "danger");
    }
  }

  async function bulkDelete() {
    const ids = new Set(selectedIds);
    const rows = items.filter((x) => ids.has(x._id));
    if (rows.length === 0) return;
    if (!confirm(`Delete ${rows.length} product(s)? This cannot be undone.`)) return;

    try {
      await Promise.all(
        rows.map((p) => fetch(`/api/products/${encodeURIComponent(p.slug)}`, { method: "DELETE" }))
      );
      await mutate();
      setSelectedIds([]);
      toasts.push("Selected products deleted", "success");
    } catch {
      toasts.push("Bulk delete failed", "danger");
    }
  }

  function exportSelectedCSV() {
    if (selectedIds.length === 0) {
      toasts.push("Nothing selected", "info");
      return;
    }
    const ids = new Set(selectedIds);
    const rows = items.filter((x) => ids.has(x._id));
    const out = rows.map((p) => ({
      name: p.name,
      slug: p.slug,
      category: p.category || "",
      price: p.price,
      promotion: p.promotion,
      finalPrice: Math.max((p.price || 0) - (p.promotion || 0), 0),
      available: p.isAvailable ? "yes" : "no",
      signatureToday: p.isSignatureToday ? "yes" : "no",
      tags: (p.tags || []).join("|"),
    }));
    if (out.length) downloadCSV(out, "selected-products.csv");
  }

  function exportFilteredCSV() {
    const rows = filtered.map((p) => ({
      name: p.name,
      slug: p.slug,
      category: p.category || "",
      price: p.price,
      promotion: p.promotion,
      finalPrice: Math.max((p.price || 0) - (p.promotion || 0), 0),
      available: p.isAvailable ? "yes" : "no",
      signatureToday: p.isSignatureToday ? "yes" : "no",
      tags: (p.tags || []).join("|"),
    }));
    if (rows.length) downloadCSV(rows, "filtered-products.csv");
  }

  // Keyboard shortcuts
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "n") {
        openCreate();
      } else if (e.key === "?") {
        alert("Shortcuts:\n/ Focus search\nn New product\n? Help");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, []);

  /* =============================== Category Options =============================== */
  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "Beverages", label: "Beverages" },
    { value: "Salad", label: "Salad" },
    { value: "Vegetables", label: "Vege" },
    { value: "Traditional", label: "Traditional" },
    { value: "Fast Food", label: "Fast Food" },
    { value: "Foreign Cuisin", label: "Foreign Cuisin" },
    { value: "Deserts", label: "Deserts" },
  ];

  /* =============================== UI =============================== */
  return (
    <DashboardLayout>
      {/* Toasts */}
      <ToastHost items={toasts.items} onClose={toasts.remove} />

      {/* Header – plain professional */}
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 mb-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Admin</div>
            <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
            <p className="text-sm text-slate-500">Curate your menu, pricing, and visibility.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              tone="neutral"
              onClick={async () => {
                const res = await fetch("/api/products/report");
                if (!res.ok) return toasts.push("Failed to generate report", "danger");
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "products-report.pdf";
                a.click();
                window.URL.revokeObjectURL(url);
              }}
            >
              <span className="text-base">📄</span>
              <span>Report (PDF)</span>
            </Button>
            <Button variant="outline" tone="neutral" onClick={exportFilteredCSV}>
              <span className="text-base">⇩</span>
              <span>Export Filtered CSV</span>
            </Button>

            {/* ✅ Fix: add onClick to open create modal */}
            <Button tone="primary" onClick={openCreate}>
              <span className="text-base">＋</span>
              <span>New Product</span>
            </Button>
          </div>
        </div>

        {/* KPIs – plain */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI title="Total Products" value={all.length} />
          <KPI title="Visible (Available)" value={all.filter((p) => p.isAvailable).length} tone="success" />
          <KPI title="Hidden (Unavailable)" value={all.filter((p) => !p.isAvailable).length} tone="warning" />
          <KPI title="Signature Today" value={all.filter((p) => p.isSignatureToday).length} tone="info" />
        </div>
      </div>

      {/* Filters toolbar */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Search</span>
              <Input
                ref={searchRef}
                placeholder="Search by name, tag..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Category</span>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-52">
                {categoryOptions.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Availability</span>
              <Select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
                className="w-44"
              >
                <option value="all">All</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable Only</option>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={signatureToday}
                onChange={(e) => setSignatureToday(e.target.checked)}
              />
              Signature today
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 whitespace-nowrap">Sort</span>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-44">
                <option value="newest">Newest</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
                <option value="price-asc">Price Low–High</option>
                <option value="price-desc">Price High–Low</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="w-28"
              aria-label="Items per page"
            >
              {[6, 12, 24, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </Select>
            <Button
              tone="neutral"
              variant="ghost"
              onClick={() => {
                setQ("");
                setCategory("");
                setAvailability("all");
                setSignatureToday(false);
                setSort("newest");
                setPage(1);
                setPageSize(12);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk toolbar */}
      {selectedIds.length > 0 && (
        <div className="mb-3 rounded-xl border border-slate-200 bg-white px-4 py-2 flex items-center gap-2 text-sm shadow-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <span className="text-slate-400">•</span>
          <Button size="sm" variant="outline" onClick={() => bulkToggle(true)}>
            Mark Available
          </Button>
          <Button size="sm" variant="outline" tone="danger" onClick={() => bulkToggle(false)}>
            Mark Unavailable
          </Button>
          <Button size="sm" variant="outline" onClick={exportSelectedCSV}>
            Export CSV
          </Button>
          <Button size="sm" tone="danger" onClick={bulkDelete}>
            Delete
          </Button>
          <button className="ml-auto text-slate-500 hover:text-slate-900" onClick={() => setSelectedIds([])}>
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg白 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur text-slate-600">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    aria-label="Select all"
                    type="checkbox"
                    checked={allSelected && selectedIds.length > 0}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? items.map((x) => x._id) : [])
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Signature</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                [...Array(pageSize)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="text-rose-600 font-medium">Failed to load products</div>
                      <Button variant="outline" onClick={() => mutate()}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                    <div className="inline-flex flex-col items-center gap-3">
                      <div className="text-lg font-semibold">No products found</div>
                      <div className="text-sm text-slate-500">
                        Try adjusting filters or create a new product.
                      </div>
                      <Button onClick={openCreate}>+ Create Product</Button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((p, idx) => {
                  const selected = selectedIds.includes(p._id);
                  const finalPrice = Math.max((p.price || 0) - (p.promotion || 0), 0);
                  return (
                    <tr key={p._id} className={idx % 2 === 1 ? "bg-slate-50/30" : ""}>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`Select ${p.name}`}
                          type="checkbox"
                          checked={selected}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, p._id]
                                : prev.filter((id) => id !== p._id)
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative group">
                            {p.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="h-12 w-12 rounded-md object-cover border"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-md border flex items-center justify-center text-[10px] text-slate-400">
                                No image
                              </div>
                            )}
                            {/* Hover enlarge preview */}
                            {p.images?.[0] && (
                              <div className="pointer-events-none absolute left-14 top-0 hidden group-hover:block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.images[0]}
                                  alt={p.name}
                                  className="h-32 w-32 rounded-lg object-cover border shadow-xl bg-white"
                                />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate max-w-[240px]">{p.name}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[240px]">
                              Slug: {p.slug}
                            </div>
                          </div>
                          <IconButton label="View details" onClick={() => openView(p)} title="View details">
                            👁
                          </IconButton>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.category ? <Badge tone="muted">{p.category}</Badge> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-medium">LKR {finalPrice.toFixed(2)}</span>
                          {p.promotion > 0 && (
                            <span className="text-[11px] line-through text-slate-400">
                              LKR {p.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.isAvailable ? <Badge tone="success">Available</Badge> : <Badge tone="danger">Unavailable</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.isSignatureToday ? <Badge tone="info">Signature</Badge> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Button
                            tone={p.isAvailable ? "success" : "danger"}
                            variant="outline"
                            size="sm"
                            onClick={() => toggleAvailability(p)}
                            title={p.isAvailable ? "Hide from menu" : "Show on menu"}
                          >
                            {p.isAvailable ? "Mark Unavailable" : "Mark Available"}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                          <Button tone="danger" size="sm" onClick={() => remove(p.slug)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: pagination */}
        <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
          <div className="text-slate-600">
            Showing <span className="font-medium">{items.length}</span> of{" "}
            <span className="font-medium">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              tone="neutral"
              size="sm"
              disabled={clampedPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <div className="px-2">
              Page <span className="font-medium">{clampedPage}</span> of{" "}
              <span className="font-medium">{pages}</span>
            </div>
            <Button
              variant="outline"
              tone="neutral"
              size="sm"
              disabled={clampedPage >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={isOpen}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Product" : "Create Product"}
        footer={
          <>
            <Button variant="outline" tone="neutral" onClick={() => setOpen(false)}>
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
            placeholder="Name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <Input
            placeholder="Slug"
            value={f.slug}
            onChange={(e) => setF({ ...f, slug: e.target.value })}
            disabled={!!editing}
          />
          <Select
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {[
              { value: "", label: "All Categories" },
              { value: "Beverages", label: "Beverages" },
              { value: "Salad", label: "Salad" },
              { value: "Vegetables", label: "Vege" },
              { value: "Traditional", label: "Traditional" },
              { value: "Fast Food", label: "Fast Food" },
              { value: "Foreign Cuisin", label: "Foreign Cuisin" },
              { value: "Deserts", label: "Deserts" },
            ].map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Price"
            type="number"
            min="0"
            value={f.price}
            onChange={(e) => setF({ ...f, price: e.target.value })}
          />
          <Input
            placeholder="Promotion"
            type="number"
            min="0"
            value={f.promotion}
            onChange={(e) => setF({ ...f, promotion: e.target.value })}
          />
          <Input
            placeholder="Spicy level 0–3"
            type="number"
            min="0"
            max="3"
            value={f.spicyLevel}
            onChange={(e) => setF({ ...f, spicyLevel: e.target.value })}
          />

          <div className="sm:col-span-2">
            <TextArea
              placeholder="Description"
              rows={3}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea
              placeholder="Images (one URL per line)"
              rows={3}
              value={f.imagesText}
              onChange={(e) => setF({ ...f, imagesText: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              placeholder="Tags (comma separated)"
              value={f.tagsText}
              onChange={(e) => setF({ ...f, tagsText: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={f.isSignatureToday}
              onChange={(e) => setF({ ...f, isSignatureToday: e.target.checked })}
            />{" "}
            Signature today
          </label>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewing(null);
        }}
        title={viewing ? `Product • ${viewing.name}` : "Product"}
        footer={
          <>
            <Button variant="outline" tone="neutral" onClick={() => setViewOpen(false)}>
              Close
            </Button>
            {viewing && (
              <Button
                variant="outline"
                tone="neutral"
                onClick={() => {
                  setViewOpen(false);
                  openEdit(viewing);
                }}
              >
                Edit This
              </Button>
            )}
          </>
        }
        maxWidth="max-w-3xl"
      >
        {viewing && (
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-3">
              {/* Main image */}
              <div className="aspect-square w-full overflow-hidden rounded-xl border bg-slate-50">
                {viewing.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewing.images[0]}
                    alt={viewing.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">
                    No image
                  </div>
                )}
              </div>
              {/* Thumbs */}
              {viewing.images && viewing.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {viewing.images.slice(1, 5).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`${viewing.name}-${i + 2}`}
                      className="aspect-square rounded-lg border object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-lg font-semibold">{viewing.name}</h4>
                {viewing.category && <Badge tone="muted">Category: {viewing.category}</Badge>}
                {viewing.isAvailable ? <Badge tone="success">Available</Badge> : <Badge tone="danger">Unavailable</Badge>}
                {viewing.isSignatureToday && <Badge tone="info">Signature Today</Badge>}
              </div>
              <div className="rounded-xl border p-3 bg-slate-50">
                <div className="text-sm text-slate-600">Pricing</div>
                <div className="mt-1 flex items-center gap-4">
                  <div className="text-lg font-semibold">
                    Final: LKR {Math.max((viewing.price || 0) - (viewing.promotion || 0), 0).toFixed(2)}
                  </div>
                  {viewing.promotion > 0 && (
                    <>
                      <div className="text-sm line-through text-slate-400">
                        LKR {viewing.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-emerald-700">− LKR {viewing.promotion.toFixed(2)}</div>
                    </>
                  )}
                </div>
              </div>

              {viewing.description && (
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Description</div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewing.description}</p>
                </div>
              )}
              {!!viewing.tags?.length && (
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {viewing.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-slate-500">
                Slug: <code className="bg-slate-100 px-1 py-0.5 rounded">{viewing.slug}</code>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

/* =============================== Tiny Components =============================== */
/** Plain KPI card with subtle left accent bar */
function KPI({
  title,
  value,
  tone = "muted",
}: {
  title: string;
  value: number | string;
  tone?: "muted" | "success" | "warning" | "info";
}) {
  const bar =
    tone === "success"
      ? "bg-emerald-500/70"
      : tone === "warning"
      ? "bg-amber-500/70"
      : tone === "info"
      ? "bg-indigo-500/70"
      : "bg-slate-400/70";

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`absolute left-0 top-0 h-full w-1.5 rounded-l-xl ${bar}`} />
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-4 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-md bg-slate-200" />
          <div className="space-y-1">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center"><div className="h-4 w-16 bg-slate-200 rounded mx-auto" /></td>
      <td className="px-4 py-3 text-center"><div className="h-4 w-20 bg-slate-200 rounded mx-auto" /></td>
      <td className="px-4 py-3 text-center"><div className="h-5 w-24 bg-slate-200 rounded mx-auto" /></td>
      <td className="px-4 py-3 text-center"><div className="h-5 w-20 bg-slate-200 rounded mx-auto" /></td>
      <td className="px-4 py-3">
        <div className="flex gap-2 justify-center">
          <div className="h-8 w-24 bg-slate-200 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
        </div>
      </td>
    </tr>
  );
}
