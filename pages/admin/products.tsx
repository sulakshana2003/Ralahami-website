/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession, signIn } from "next-auth/react";
import DashboardLayout from "../components/DashboardLayout";

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

function Button({ children, tone = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost: "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  return <button {...props} className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-[.98] transition ${styles[tone]} ${props.className || ""}`}>{children}</button>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`} />;
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`} />;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`} />;
}
function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "success" | "danger" | "muted" }) {
  const map: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    muted: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}
function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
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
  stock: number;
  isSignatureToday: boolean;
  tags: string[];
};

export default function ProductsAdminPage() {
  const { status } = useSession();
  useEffect(() => { if (status === "unauthenticated") signIn(); }, [status]);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [signatureToday, setSignatureToday] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const [f, setF] = useState<any>({
    name: "", slug: "", description: "", category: "",
    imagesText: "", tagsText: "", price: "",
    promotion: "", stock: "", spicyLevel: "",
    isSignatureToday: false, isAvailable: true,
  });

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (signatureToday) params.set("signatureToday", "1");
    params.set("limit", "200");
    return `/api/products${params.toString() ? `?${params}` : ""}`;
  }, [q, category, signatureToday]);

  const { data, isLoading, error, mutate } = useSWR<Product[]>(listUrl, fetcher);
  const all = data ?? [];
  const pages = Math.max(1, Math.ceil(all.length / limit));
  const items = all.slice((page - 1) * limit, page * limit);

  function openCreate() {
    setEditing(null);
    setF({ name: "", slug: "", description: "", category: "", imagesText: "", tagsText: "", price: "", promotion: "", stock: "", spicyLevel: "", isSignatureToday: false, isAvailable: true });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setF({
      name: p.name, slug: p.slug, description: p.description || "",
      category: p.category || "",
      imagesText: (p.images || []).join("\n"),
      tagsText: (p.tags || []).join(", "),
      price: String(p.price), promotion: String(p.promotion),
      stock: String(p.stock), spicyLevel: String(p.spicyLevel),
      isSignatureToday: p.isSignatureToday, isAvailable: p.isAvailable,
    });
    setOpen(true);
  }

  async function save() {
    const priceVal = Number(f.price);
    const stockVal = Number(f.stock);
    const promoVal = Number(f.promotion);
    const spicyVal = Number(f.spicyLevel);
    if (!f.name.trim() || !f.slug.trim()) return alert("Name and Slug are required");
    if (priceVal < 0) return alert("Price must be a positive number");
    if (stockVal < 0) return alert("Stock must be a positive number");
    if (promoVal < 0) return alert("Promotion cannot be negative");
    if (spicyVal < 0 || spicyVal > 3) return alert("Spicy level must be between 0 and 3");
    const payload = {
      name: f.name.trim(),
      slug: f.slug.trim(),
      description: f.description.trim() || undefined,
      category: f.category.trim() || undefined,
      images: f.imagesText.split("\n").map((x: string) => x.trim()).filter(Boolean),
      tags: f.tagsText.split(",").map((x: string) => x.trim()).filter(Boolean),
      price: priceVal,
      promotion: promoVal,
      stock: stockVal,
      spicyLevel: spicyVal,
      isSignatureToday: Boolean(f.isSignatureToday),
      isAvailable: Boolean(f.isAvailable),
    };
    const url = editing ? `/api/products/${encodeURIComponent(editing.slug)}` : `/api/products`;
    const method = editing ? "PUT" : "POST";
    setBusy(true);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) return alert(await res.text());
    setOpen(false);
    setEditing(null);
    await mutate();
  }

  async function remove(slug: string) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`, { method: "DELETE" });
    if (!res.ok) return alert(await res.text());
    await mutate();
  }

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

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Management</h1>
          <p className="text-sm text-neutral-500">Manage your product catalog, pricing, and stock</p>
        </div>
        <Button onClick={openCreate}>+ New Product</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Products" value={all.length} />
        <StatCard title="Available" value={all.filter((p) => p.isAvailable).length} />
        <StatCard title="Low Stock" value={all.filter((p) => p.stock <= 5).length} />
        <StatCard title="Signature Today" value={all.filter((p) => p.isSignatureToday).length} />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <Input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categoryOptions.map((opt) => (
            <option key={opt.label} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={signatureToday} onChange={(e) => setSignatureToday(e.target.checked)} />
          Signature today
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 text-left">Image</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-neutral-500">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="p-6 text-center text-rose-600">{(error as any).message}</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-neutral-500">No products found</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p._id} className={`border-t ${p.stock <= 5 ? "bg-rose-50" : ""}`}>
                  <td className="px-4 py-3">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="h-12 w-12 rounded-md object-cover border" />
                    ) : (
                      <span className="text-neutral-400 text-xs">No image</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">LKR {p.price.toFixed(2)}</td>
                  <td className="px-4 py-3">{p.stock}</td>
                  <td className="px-4 py-3">
                    {p.isAvailable ? <Badge tone="success">Available</Badge> : <Badge tone="danger">Unavailable</Badge>}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button tone="ghost" onClick={() => openEdit(p)}>Edit</Button>
                    <Button tone="danger" onClick={() => remove(p.slug)}>Delete</Button>
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

      {/* Modal */}
      <Modal
        open={isOpen}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? "Edit Product" : "Create Product"}
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{editing ? "Save" : "Create"}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Input placeholder="Slug" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} disabled={!!editing} />
          <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {categoryOptions.map((opt) => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
          <Input placeholder="Price" type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          <Input placeholder="Promotion" type="number" min="0" value={f.promotion} onChange={(e) => setF({ ...f, promotion: e.target.value })} />
          <Input placeholder="Stock" type="number" min="0" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
          <Input placeholder="Spicy level 0–3" type="number" min="0" max="3" value={f.spicyLevel} onChange={(e) => setF({ ...f, spicyLevel: e.target.value })} />
          <div className="sm:col-span-2">
            <TextArea placeholder="Description" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <TextArea placeholder="Images (one URL per line)" rows={3} value={f.imagesText} onChange={(e) => setF({ ...f, imagesText: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Input placeholder="Tags (comma separated)" value={f.tagsText} onChange={(e) => setF({ ...f, tagsText: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={f.isAvailable} onChange={(e) => setF({ ...f, isAvailable: e.target.checked })} /> Available
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={f.isSignatureToday} onChange={(e) => setF({ ...f, isSignatureToday: e.target.checked })} /> Signature today
          </label>
        </div>
      </Modal>
    </DashboardLayout>
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
