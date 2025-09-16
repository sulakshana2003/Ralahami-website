/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";

// ---------- helpers ----------
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
});
const today = (shift = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + shift);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---------- small UI ----------
function Button({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "danger" | "ghost";
}) {
  const map = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost:
      "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50",
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
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        {children}
      </div>
    </section>
  );
}

// ---------- types ----------
type Summary = {
  netProfit: number;
  online: { revenue: number; profit: number };
  reservations: { revenue: number };
  payroll: { outflow: number };
  inventory: { purchases: number };
};
type OnlineOrder = {
  _id: string;
  date: string;
  orderId: string;
  revenue: number;
  cost: number;
};
type Reservation = {
  _id: string;
  date: string;
  slot: string;
  name: string;
  partySize: number;
  amount: number;
  paymentStatus: string;
};
type Employee = { _id: string; name: string; role: string; baseSalary: number };
type Payroll = {
  _id: string;
  date: string;
  employeeId: string;
  type: string;
  amount: number;
};
type InventoryItem = {
  _id: string;
  name: string;
  unit: string;
  unitCost: number;
  stockQty: number;
};
type InventoryMove = {
  _id: string;
  date: string;
  itemId: string;
  type: string;
  qty: number;
  unitCost?: number;
  note?: string;
};
type Product = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  stock: number;
  isAvailable: boolean;
};

// ---------- main ----------
export default function FinanceAdminPage() {
  const [tab, setTab] = useState<
    | "dashboard"
    | "revenues"
    | "reservations"
    | "inventory"
    | "employees"
    | "products"
    | "reports"
  >("dashboard");
  const [from, setFrom] = useState(today(-7));
  const [to, setTo] = useState(today());

  // SWR
  const { data: summary } = useSWR<Summary>(
    `/api/finance/summary?from=${from}&to=${to}`,
    fetcher
  );
  const { data: orders, mutate: refetchOrders } = useSWR<OnlineOrder[]>(
    `/api/orders?from=${from}&to=${to}`,
    fetcher
  );
  const { data: reservations } = useSWR<Reservation[]>(
    `/api/reservations/reservations?from=${from}&to=${to}`,
    fetcher
  );
  const { data: employees } = useSWR<Employee[]>(
    "/api/Employee/employees",
    fetcher
  );
  const { data: payroll } = useSWR<Payroll[]>(
    `/api/Employee/payroll?from=${from}&to=${to}`,
    fetcher
  );
  const { data: items } = useSWR<InventoryItem[]>(
    "/api/inventory/items",
    fetcher
  );
  const { data: moves } = useSWR<InventoryMove[]>(
    `/api/inventory/movements?from=${from}&to=${to}`,
    fetcher
  );
  const { data: products, mutate: refetchProducts } = useSWR<Product[]>(
    "/api/products",
    fetcher
  );

  // actions
  async function addOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      date: fd.get("date"),
      orderId: fd.get("orderId"),
      revenue: +(fd.get("revenue") || 0),
      cost: +(fd.get("cost") || 0),
      note: fd.get("note"),
    };
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    e.currentTarget.reset();
    refetchOrders();
  }
  async function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      slug: fd.get("slug"),
      price: +(fd.get("price") || 0),
      stock: +(fd.get("stock") || 0),
      category: fd.get("category"),
      isAvailable: fd.get("isAvailable") === "on",
    };
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    e.currentTarget.reset();
    refetchProducts();
  }
  async function deleteProduct(id: string) {
    if (!confirm("Delete product?")) return;
    await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    refetchProducts();
  }
  function downloadCSV() {
    window.open(`/api/finance/report?from=${from}&to=${to}`, "_blank");
  }

  return (
    <AdminGuard>
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">Financial Management</h1>
        <div className="flex gap-2 flex-wrap mt-3 sm:mt-0">
          {[
            "dashboard",
            "revenues",
            "reservations",
            "inventory",
            "employees",
            "products",
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
            <StatCard
              title="Online Revenue"
              value={fmt.format(summary.online.revenue)}
            />
            <StatCard
              title="Online Profit"
              value={fmt.format(summary.online.profit)}
            />
            <StatCard
              title="Reservation Revenue"
              value={fmt.format(summary.reservations.revenue)}
            />
            <StatCard
              title="Payroll Outflow"
              value={fmt.format(summary.payroll.outflow)}
            />
            <StatCard
              title="Inventory Purchases"
              value={fmt.format(summary.inventory.purchases)}
            />
            <StatCard
              title="Net Profit"
              value={fmt.format(summary.netProfit)}
            />
          </div>
        </Section>
      )}

      {/* Revenues */}
      {tab === "revenues" && (
        <>
          <Section title="Add Online Order">
            <form onSubmit={addOrder} className="grid sm:grid-cols-6 gap-3">
              <Input type="date" name="date" defaultValue={to} />
              <Input name="orderId" placeholder="Order ID" />
              <Input type="number" name="revenue" placeholder="Revenue" />
              <Input type="number" name="cost" placeholder="Cost" />
              <Input name="note" placeholder="Note" className="sm:col-span-2" />
              <Button>Add</Button>
            </form>
          </Section>
          <Section title="Orders">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Revenue</th>
                  <th>Cost</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).map((o) => (
                  <tr key={o._id} className="border-t">
                    <td className="py-2">{o.date}</td>
                    <td>{o.orderId}</td>
                    <td>{fmt.format(o.revenue)}</td>
                    <td>{fmt.format(o.cost)}</td>
                    <td
                      className={
                        o.revenue - o.cost >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {fmt.format(o.revenue - o.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
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
              {(reservations || []).map((r) => (
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
                {(items || []).map((i) => (
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
                {(moves || []).map((m) => (
                  <tr key={m._id} className="border-t">
                    <td className="py-2">{m.date}</td>
                    <td>
                      {items?.find((i) => i._id === m.itemId)?.name || m.itemId}
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
                {(employees || []).map((e) => (
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
                {(payroll || []).map((p) => {
                  const emp = employees?.find((e) => e._id === p.employeeId);
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
              <Input name="name" placeholder="Name" />
              <Input name="slug" placeholder="Slug" />
              <Input name="category" placeholder="Category" />
              <Input type="number" name="price" placeholder="Price" />
              <Input type="number" name="stock" placeholder="Stock" />
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
                {(products || []).map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="py-2">{p.name}</td>
                    <td>{p.category || "-"}</td>
                    <td>{fmt.format(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>{p.isAvailable ? "Yes" : "No"}</td>
                    <td>
                      <Button
                        tone="danger"
                        onClick={() => deleteProduct(p._id)}
                      >
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
          <Button onClick={downloadCSV}>Download CSV</Button>
        </Section>
      )}
    </DashboardLayout>
    </AdminGuard>
  );
}
