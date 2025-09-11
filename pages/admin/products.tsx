// pages/admin/products.tsx
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession, signIn, signOut } from "next-auth/react";
import AdminLayout from "../components/AdminLayout"; // ✅ reuse the same layout as Users page

// ---------- utils ----------
const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json(); // API returns a plain array
};

// ---------- UI atoms (visual only) ----------
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
      className={`rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[.98] transition ${props.className || ""}`}
    />
  );
}
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`}
    />
  );
}
function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`}
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[tone]}`}
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
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="text-sm text-neutral-500 hover:text-black"
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

// ---------- types ----------
type Product = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  price: number;
  promotion: number;
  category?: string;
  spicyLevel: number; // 0..3
  isAvailable: boolean;
  stock: number;
  isSignatureToday: boolean;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminProductsPage() {
  const { status } = useSession();
  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  // filters
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [signatureToday, setSignatureToday] = useState(false);

  // client-side pagination (API returns array)
  const [page, setPage] = useState(1);
  const limit = 10;

  // modal form state (unchanged field names)
  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "",
    slug: "",
    description: "",
    imagesText: "",
    price: "",
    promotion: "0",
    category: "",
    spicyLevel: "0",
    isAvailable: true,
    stock: "0",
    isSignatureToday: false,
    tagsText: "",
  });

  // build list URL (no page param — we paginate client-side)
  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (signatureToday) params.set("signatureToday", "1");
    params.set("limit", "200");
    return `/api/products${params.toString() ? `?${params}` : ""}`;
  }, [q, category, signatureToday]);

  const { data, isLoading, error, mutate } = useSWR<Product[]>(listUrl, fetcher);

  // pagination slice
  const all: Product[] = data ?? [];
  const pages = Math.max(1, Math.ceil(all.length / limit));
  const items = all.slice((page - 1) * limit, page * limit);

  // helpers
  const toArrayByLine = (s: string) =>
    s.split("\n").map((x) => x.trim()).filter(Boolean);
  const toArrayByComma = (s: string) =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

  function openCreate() {
    setEditing(null);
    setF({
      name: "",
      slug: "",
      description: "",
      imagesText: "",
      price: "",
      promotion: "0",
      category: "",
      spicyLevel: "0",
      isAvailable: true,
      stock: "0",
      isSignatureToday: false,
      tagsText: "",
    });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setF({
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      imagesText: (p.images || []).join("\n"),
      price: String(p.price ?? ""),
      promotion: String(p.promotion ?? "0"),
      category: p.category || "",
      spicyLevel: String(p.spicyLevel ?? "0"),
      isAvailable: p.isAvailable,
      stock: String(p.stock ?? "0"),
      isSignatureToday: p.isSignatureToday,
      tagsText: (p.tags || []).join(", "),
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      name: f.name.trim(),
      slug: f.slug.trim(),
      description: f.description.trim() || undefined,
      images: toArrayByLine(f.imagesText),
      price: Number(f.price || 0),
      promotion: Number(f.promotion || 0),
      category: f.category.trim() || undefined,
      spicyLevel: Math.max(0, Math.min(3, Number(f.spicyLevel || 0))),
      isAvailable: Boolean(f.isAvailable),
      stock: Math.max(0, Number(f.stock || 0)),
      isSignatureToday: Boolean(f.isSignatureToday),
      tags: toArrayByComma(f.tagsText),
    };

    if (!payload.name || !payload.slug) {
      alert("Name and slug are required.");
      return;
    }

    const url = editing
      ? `/api/products/${encodeURIComponent(editing.slug)}`
      : `/api/products`;
    const method = editing ? "PUT" : "POST";

    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });
    setBusy(false);

    if (!res.ok) {
      const txt = await res.text();
      alert(txt || "Failed to save");
      return;
    }

    setOpen(false);
    setEditing(null);
    await mutate();
  }

  async function remove(slug: string) {
    if (!confirm("Delete this product?")) return;
    setBusy(true);
    const res = await fetch(`/api/products/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setBusy(false);
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await mutate();
  }

  async function toggleAvailable(p: Product) {
    setBusy(true);
    const res = await fetch(`/api/products/${encodeURIComponent(p.slug)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !p.isAvailable }),
      credentials: "same-origin",
    });
    setBusy(false);
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await mutate();
  }

  return (
    <AdminLayout>
      {/* Header like Users page */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div>
          <h1 className="text-base font-semibold">Product Management</h1>
          <p className="text-xs text-neutral-500">
            Manage your catalog, pricing, and stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrimaryButton onClick={openCreate} disabled={busy}>
            + New Product
          </PrimaryButton>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 active:scale-[.98] transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="grid gap-3 border-b border-neutral-100 px-5 py-4 sm:grid-cols-5">
        <TextInput
          placeholder="Search by name…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <TextInput
          placeholder="Category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={signatureToday}
            onChange={(e) => {
              setSignatureToday(e.target.checked);
              setPage(1);
            }}
          />
          Signature today
        </label>
        <IconButton onClick={() => mutate()}>Refresh</IconButton>
      </div>

      {/* Table surface */}
      <div className="p-3">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <table className="hidden w-full border-collapse md:table">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-sm text-neutral-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-sm text-rose-600"
                  >
                    {(error as any).message || "Error loading products"}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-sm text-neutral-500"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr
                    key={p._id}
                    className="border-t border-neutral-100 align-top"
                  >
                    <td className="px-4 py-4">
                      <div className="flex gap-3">
                        <div className="grid grid-cols-3 gap-1">
                          {(p.images || [])
                            .slice(0, 3)
                            .map((src, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={src}
                                alt={p.name}
                                className="h-14 w-14 rounded-lg border object-cover"
                              />
                            ))}
                        </div>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-neutral-500">
                            /{p.slug}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.category ? <Badge>{p.category}</Badge> : null}
                            {p.tags?.map((t) => (
                              <Badge key={t}>{t}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-medium">
                      Rs. {Number(p.price).toFixed(2)}
                    </td>

                    <td className="px-4 py-4">{p.stock} in stock</td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {p.isAvailable ? (
                          <Badge tone="success">available</Badge>
                        ) : (
                          <Badge tone="danger">unavailable</Badge>
                        )}
                        {p.isSignatureToday ? (
                          <Badge tone="success">signature</Badge>
                        ) : null}
                        {p.spicyLevel > 0 ? (
                          <Badge>🌶 x{p.spicyLevel}</Badge>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <IconButton onClick={() => openEdit(p)} disabled={busy}>
                          Edit
                        </IconButton>
                        <IconButton
                          onClick={() => toggleAvailable(p)}
                          disabled={busy}
                        >
                          {p.isAvailable ? "Mark Unavailable" : "Mark Available"}
                        </IconButton>
                        <IconButton
                          className="border-rose-200 hover:bg-rose-50"
                          onClick={() => remove(p.slug)}
                          disabled={busy}
                        >
                          Delete
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="grid gap-3 p-3 md:hidden">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="mb-3 h-4 w-2/3 rounded bg-neutral-200" />
                  <div className="mb-2 h-3 w-1/2 rounded bg-neutral-200" />
                  <div className="h-3 w-1/3 rounded bg-neutral-200" />
                </div>
              ))
            ) : error ? (
              <div className="p-6 text-center text-sm text-rose-600">
                {(error as any).message || "Error loading products"}
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-neutral-500">
                No products found
              </div>
            ) : (
              items.map((p) => (
                <div
                  key={p._id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-neutral-500">/{p.slug}</div>
                  <div className="mt-2 text-sm">
                    <span className="font-medium">
                      Rs. {Number(p.price).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.category ? <Badge>{p.category}</Badge> : null}
                    {p.tags?.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <IconButton onClick={() => openEdit(p)} disabled={busy}>
                      Edit
                    </IconButton>
                    <IconButton
                      onClick={() => toggleAvailable(p)}
                      disabled={busy}
                    >
                      {p.isAvailable ? "Unavail" : "Avail"}
                    </IconButton>
                    <IconButton
                      className="border-rose-200 hover:bg-rose-50"
                      onClick={() => remove(p.slug)}
                      disabled={busy}
                    >
                      Delete
                    </IconButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between px-2">
          <p className="text-sm text-neutral-500">
            Page <span className="font-medium text-neutral-800">{page}</span> of{" "}
            <span className="font-medium text-neutral-800">{pages}</span>
          </p>
          <div className="flex gap-2">
            <IconButton
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </IconButton>
            <IconButton
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </IconButton>
          </div>
        </div>
      </div>

      {/* Create/Edit modal */}
      <Modal
        open={isOpen}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit • ${editing.name}` : "Create new product"}
        footer={
          <>
            <IconButton
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
              disabled={busy}
            >
              Cancel
            </IconButton>
            <PrimaryButton onClick={save} disabled={busy}>
              {editing ? "Save Changes" : "Create"}
            </PrimaryButton>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            placeholder="Name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <TextInput
            placeholder="Slug (unique)"
            value={f.slug}
            onChange={(e) => setF({ ...f, slug: e.target.value })}
            disabled={!!editing}
          />
          <TextInput
            placeholder="Category"
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          />
          <TextInput
            placeholder="Price"
            type="number"
            value={f.price}
            onChange={(e) => setF({ ...f, price: e.target.value })}
          />
          <TextInput
            placeholder="Promotion (discount amount)"
            type="number"
            value={f.promotion}
            onChange={(e) => setF({ ...f, promotion: e.target.value })}
          />
          <TextInput
            placeholder="Stock"
            type="number"
            value={f.stock}
            onChange={(e) => setF({ ...f, stock: e.target.value })}
          />
          <TextInput
            placeholder="Spicy level (0–3)"
            type="number"
            value={f.spicyLevel}
            onChange={(e) => setF({ ...f, spicyLevel: e.target.value })}
          />
          <div className="sm:col-span-2">
            <TextArea
              rows={3}
              placeholder="Description"
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea
              rows={4}
              placeholder={"Images (one URL or /path per line)\nhttps://.../1.jpg\n/images/2.jpg"}
              value={f.imagesText}
              onChange={(e) => setF({ ...f, imagesText: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextInput
              placeholder="Tags (comma separated)"
              value={f.tagsText}
              onChange={(e) => setF({ ...f, tagsText: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={f.isAvailable}
              onChange={(e) => setF({ ...f, isAvailable: e.target.checked })}
            />
            Available
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={f.isSignatureToday}
              onChange={(e) =>
                setF({ ...f, isSignatureToday: e.target.checked })
              }
            />
            Mark as signature dish today
          </label>
        </div>
      </Modal>
    </AdminLayout>
  );
}
