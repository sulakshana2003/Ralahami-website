/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import useSWR from "swr";
import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";
import toast from "react-hot-toast";

/* ---------- helpers ---------- */
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" });
const today = (shift = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + shift);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

/* ---------- small UI ---------- */
function Button({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "danger" | "ghost" | "success";
}) {
  const map = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost: "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50",
    danger: "bg-white border border-rose-300 text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition active:scale-[.98] ${
        map[tone]
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
      className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">{children}</div>
    </section>
  );
}

/* ---------- main ---------- */
export default function FinancePage() {
  const [tab, setTab] = useState<
    | "dashboard"
    | "reservations"
    | "inventory"
    | "employees"
    | "products"
    | "promotions"
    | "reports"
  >("dashboard");

  const [from, setFrom] = useState(today(-7));
  const [to, setTo] = useState(today());

  const { data, mutate } = useSWR(`/api/finance?from=${from}&to=${to}`, fetcher);

  const summary = data?.summary;
  const {
    orders,
    reservations,
    employees,
    payrolls,
    inventoryItems,
    inventoryMoves,
    products,
    promotions,
  } = data?.data || {};

  /* ---------- API actions ---------- */
  async function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch(`/api/finance?action=product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Product added!");
      e.currentTarget.reset();
      mutate();
    } catch (err) {
      toast.error("Failed to add product");
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete product?")) return;
    try {
      const res = await fetch(`/api/finance?action=product&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Product deleted!");
      mutate();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function addPromotion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch(`/api/finance?action=promotion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Promotion added!");
      e.currentTarget.reset();
      mutate();
    } catch (err) {
      toast.error("Failed to add promotion");
    }
  }

  async function deletePromotion(id: string) {
    if (!confirm("Delete promotion?")) return;
    try {
      const res = await fetch(`/api/finance?action=promotion&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Promotion deleted!");
      mutate();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function togglePromotion(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/finance?action=promotion&id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Status updated");
      mutate();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function editPromotion(id: string) {
    const title = prompt("New title?");
    const desc = prompt("New description?");
    if (!title || !desc) return;
    try {
      const res = await fetch(`/api/finance?action=promotion&id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, desc }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Promotion updated");
      mutate();
    } catch {
      toast.error("Edit failed");
    }
  }

  /* ---------- UI ---------- */
  return (
    <AdminGuard>
      <DashboardLayout>
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold">Financial Management</h1>
          <div className="flex gap-2 flex-wrap mt-3 sm:mt-0">
            {[
              "dashboard",
              "reservations",
              "inventory",
              "employees",
              "products",
              "promotions",
              "reports",
            ].map((t) => (
              <Button
                key={t}
                tone={tab === t ? "primary" : "ghost"}
                onClick={() => setTab(t as any)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3 mb-8">
          <label className="text-sm">From</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[160px]"
          />
          <label className="text-sm">To</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px]"
          />
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && summary && (
          <Section title="Summary">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title="Online Revenue" value={fmt.format(summary.online.revenue)} />
              <StatCard title="Online Profit" value={fmt.format(summary.online.profit)} />
              <StatCard title="Reservation Revenue" value={fmt.format(summary.reservations.revenue)} />
              <StatCard title="Payroll Outflow" value={fmt.format(summary.payroll.outflow)} />
              <StatCard title="Inventory Purchases" value={fmt.format(summary.inventory.purchases)} />
              <StatCard title="Net Profit" value={fmt.format(summary.netProfit)} />
            </div>
          </Section>
        )}

        {/* Reservations */}
        {tab === "reservations" && (
          <Section title="Reservations">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Name</th>
                  <th>Party</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(reservations || []).map((r: any) => (
                  <tr key={r._id} className="border-t">
                    <td className="py-2">{r.date}</td>
                    <td>{r.slot}</td>
                    <td>{r.name}</td>
                    <td>{r.partySize}</td>
                    <td>{fmt.format(r.amount)}</td>
                    <td>{r.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Inventory */}
        {tab === "inventory" && (
          <>
            <Section title="Items">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th>Name</th>
                    <th>Unit</th>
                    <th>Cost</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryItems || []).map((i: any) => (
                    <tr key={i._id} className="border-t">
                      <td className="py-2">{i.name}</td>
                      <td>{i.unit}</td>
                      <td>{fmt.format(i.unitCost)}</td>
                      <td>{i.stockQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
            <Section title="Movements">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(inventoryMoves || []).map((m: any) => (
                    <tr key={m._id} className="border-t">
                      <td className="py-2">{m.date}</td>
                      <td>
                        {inventoryItems?.find((i: any) => i._id === m.itemId)?.name || m.itemId}
                      </td>
                      <td>{m.type}</td>
                      <td>{m.qty}</td>
                      <td>{m.unitCost ? fmt.format(m.unitCost) : "-"}</td>
                      <td>{m.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </>
        )}

        {/* Employees */}
        {tab === "employees" && (
          <>
            <Section title="Employees">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {(employees || []).map((e: any) => (
                    <tr key={e._id} className="border-t">
                      <td className="py-2">{e.name}</td>
                      <td>{e.role}</td>
                      <td>{fmt.format(e.baseSalary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
            <Section title="Payroll">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(payrolls || []).map((p: any) => {
                    const emp = employees?.find((e: any) => e._id === p.employeeId);
                    return (
                      <tr key={p._id} className="border-t">
                        <td className="py-2">{p.date}</td>
                        <td>{emp?.name || p.employeeId}</td>
                        <td>{p.type}</td>
                        <td>{fmt.format(p.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          </>
        )}

        {/* Products */}
        {tab === "products" && (
          <>
            <Section title="Add Product">
              <form onSubmit={addProduct} className="grid sm:grid-cols-6 gap-3">
                <Input name="name" placeholder="Name" required />
                <Input name="slug" placeholder="Slug" required />
                <Input name="category" placeholder="Category" />
                <Input type="number" name="price" placeholder="Price" required />
                <Input type="number" name="stock" placeholder="Stock" required />
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isAvailable" /> Available
                </label>
                <Button>Add</Button>
              </form>
            </Section>
            <Section title="Products">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Available</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(products || []).map((p: any) => (
                    <tr key={p._id} className="border-t">
                      <td className="py-2">{p.name}</td>
                      <td>{p.category || "-"}</td>
                      <td>{fmt.format(p.price)}</td>
                      <td>{p.stock}</td>
                      <td>{p.isAvailable ? "Yes" : "No"}</td>
                      <td>
                        <Button tone="danger" onClick={() => deleteProduct(p._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </>
        )}

        {/* Promotions */}
        {tab === "promotions" && (
          <>
            <Section title="Add Promotion">
              <form onSubmit={addPromotion} className="grid sm:grid-cols-3 gap-3">
                <Input name="title" placeholder="Title" required />
                <Input name="desc" placeholder="Description" required />
                <Input name="cta" placeholder="CTA" required />
                <Input name="link" placeholder="Link (optional)" />
                <Input name="image" placeholder="Image URL (optional)" />
                <Button tone="success">Add</Button>
              </form>
            </Section>

            <Section title="All Promotions">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>CTA</th>
                    <th>Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(promotions || []).map((p: any) => (
                    <tr key={p._id} className="border-t">
                      <td className="py-2">{p.title}</td>
                      <td>{p.desc}</td>
                      <td>{p.cta}</td>
                      <td>
                        <Button
                          tone={p.isActive ? "success" : "ghost"}
                          onClick={() => togglePromotion(p._id, p.isActive)}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </Button>
                      </td>
                      <td className="flex gap-2">
                        <Button onClick={() => editPromotion(p._id)}>Edit</Button>
                        <Button tone="danger" onClick={() => deletePromotion(p._id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <Section title="Reports">
            <Button onClick={() => window.open(`/api/finance?action=report&from=${from}&to=${to}`, "_blank")}>
              Download Report
            </Button>
          </Section>
        )}
      </DashboardLayout>
    </AdminGuard>
  );
}
