"use client";

import useSWR from "swr";
import { useState } from "react";

// ---------- Helpers ----------
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
});
const today = (shift = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + shift);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const cls = {
  input:
    "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10",
  btn: "rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 active:scale-[.98]",
  btnGhost:
    "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50",
  card: "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
};

// ---------- Types ----------
type Summary = {
  netProfit: number;
  online: { revenue: number; cost: number; profit: number };
  reservations: { revenue: number; profit: number };
  payroll: { outflow: number };
  inventory: { purchases: number; cogsApprox: number };
};

type OnlineOrder = {
  _id: string;
  date: string;
  orderId: string;
  revenue: number;
  cost: number;
  note?: string;
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
  note?: string;
};
type InventoryItem = {
  _id: string;
  name: string;
  unit: string;
  unitCost: number;
  stockQty: number;
  reorderLevel: number;
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
  promotion?: number;
  stock: number;
  isAvailable: boolean;
};

// ---------- Main ----------
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
  const [to, setTo] = useState(today(0));

  // SWR data
  const { data: summary } = useSWR<Summary>(
    `/api/finance/summary?from=${from}&to=${to}`,
    fetcher
  );
  const { data: orders, mutate: refetchOrders } = useSWR<OnlineOrder[]>(
    `/api/orders?from=${from}&to=${to}`,
    fetcher
  );
  const { data: reservations, mutate: refetchRes } = useSWR<Reservation[]>(
    `/api/reservations/reservations?from=${from}&to=${to}`,
    fetcher
  );
  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);
  const { data: payroll } = useSWR<Payroll[]>(
    `/api/payroll?from=${from}&to=${to}`,
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

  // ---------- Actions ----------
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
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
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
      promotion: +(fd.get("promotion") || 0),
      stock: +(fd.get("stock") || 0),
      isAvailable: fd.get("isAvailable") === "on",
      category: fd.get("category"),
    };
    const r = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    e.currentTarget.reset();
    refetchProducts();
  }
  async function deleteProduct(id: string) {
    if (confirm("Delete?")) {
      await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      refetchProducts();
    }
  }

  function downloadCSV() {
    window.open(`/api/finance/report?from=${from}&to=${to}`, "_blank");
  }

  // ---------- UI ----------
  const TabBtn = ({ id, label }: { id: any; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-xl text-sm ${
        tab === id ? "bg-black text-white" : "bg-white border"
      }`}
    >
      {label}
    </button>
  );
  const Section = ({ title, children }: { title: string; children: any }) => (
    <section className="mt-6">
      <div className="mb-2 font-semibold">{title}</div>
      <div className={cls.card}>{children}</div>
    </section>
  );
  const Stat = ({ title, value }: { title: string; value: string }) => (
    <div className={cls.card}>
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <header className="mb-6 flex flex-col sm:flex-row justify-between">
        <h1 className="text-2xl font-bold">Financial Management Admin</h1>
        <div className="flex gap-2 flex-wrap">
          {[
            "dashboard",
            "revenues",
            "reservations",
            "inventory",
            "employees",
            "products",
            "reports",
          ].map((t) => (
            <TabBtn key={t} id={t} label={t} />
          ))}
        </div>
      </header>

      <div className={cls.card}>
        <label>From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={cls.input + " w-40"}
        />
        <label className="ml-2">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={cls.input + " w-40"}
        />
      </div>

      {/* Dashboard */}
      {tab === "dashboard" && summary && (
        <Section title="Summary">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Stat
              title="Online Revenue"
              value={fmt.format(summary.online.revenue)}
            />
            <Stat
              title="Online Profit"
              value={fmt.format(summary.online.profit)}
            />
            <Stat
              title="Reservation Revenue"
              value={fmt.format(summary.reservations.revenue)}
            />
            <Stat
              title="Payroll Outflow"
              value={fmt.format(summary.payroll.outflow)}
            />
            <Stat
              title="Inventory Purchases"
              value={fmt.format(summary.inventory.purchases)}
            />
            <Stat title="Net Profit" value={fmt.format(summary.netProfit)} />
          </div>
        </Section>
      )}

      {/* Revenues */}
      {tab === "revenues" && (
        <>
          <Section title="Add Online Order">
            <form onSubmit={addOrder} className="grid sm:grid-cols-6 gap-2">
              <input
                name="date"
                type="date"
                defaultValue={to}
                className={cls.input}
              />
              <input
                name="orderId"
                placeholder="Order ID"
                className={cls.input}
              />
              <input
                name="revenue"
                placeholder="Revenue"
                className={cls.input}
                type="number"
              />
              <input
                name="cost"
                placeholder="Cost"
                className={cls.input}
                type="number"
              />
              <input
                name="note"
                placeholder="Note"
                className={cls.input + " sm:col-span-2"}
              />
              <button className={cls.btn}>Add</button>
            </form>
          </Section>
          <Section title="Orders">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order</th>
                  <th>Rev</th>
                  <th>Cost</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).map((o) => (
                  <tr key={o._id}>
                    <td>{o.date}</td>
                    <td>{o.orderId}</td>
                    <td>{fmt.format(o.revenue)}</td>
                    <td>{fmt.format(o.cost)}</td>
                    <td>{fmt.format(o.revenue - o.cost)}</td>
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
            <thead>
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
                <tr key={r._id}>
                  <td>{r.date}</td>
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
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Cost</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {(items || []).map((i) => (
                  <tr key={i._id}>
                    <td>{i.name}</td>
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
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {(moves || []).map((m) => (
                  <tr key={m._id}>
                    <td>{m.date}</td>
                    <td>
                      {items?.find((i) => i._id === m.itemId)?.name || m.itemId}
                    </td>
                    <td>{m.type}</td>
                    <td>{m.qty}</td>
                    <td>{m.unitCost || "-"}</td>
                    <td>{m.note}</td>
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
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Salary</th>
                </tr>
              </thead>
              <tbody>
                {(employees || []).map((e) => (
                  <tr key={e._id}>
                    <td>{e.name}</td>
                    <td>{e.role}</td>
                    <td>{fmt.format(e.baseSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="Payroll">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Emp</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(payroll || []).map((p) => (
                  <tr key={p._id}>
                    <td>{p.date}</td>
                    <td>
                      {employees?.find((e) => e._id === p.employeeId)?.name}
                    </td>
                    <td>{p.type}</td>
                    <td>{fmt.format(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      )}

      {/* Products */}
      {tab === "products" && (
        <>
          <Section title="Add Product">
            <form onSubmit={addProduct} className="grid sm:grid-cols-6 gap-2">
              <input name="name" placeholder="Name" className={cls.input} />
              <input name="slug" placeholder="Slug" className={cls.input} />
              <input
                name="category"
                placeholder="Category"
                className={cls.input}
              />
              <input
                name="price"
                type="number"
                placeholder="Price"
                className={cls.input}
              />
              <input
                name="promotion"
                type="number"
                placeholder="Promotion"
                className={cls.input}
              />
              <input
                name="stock"
                type="number"
                placeholder="Stock"
                className={cls.input}
              />
              <label>
                <input type="checkbox" name="isAvailable" /> Available
              </label>
              <button className={cls.btn}>Add</button>
            </form>
          </Section>
          <Section title="Products">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Avail</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(products || []).map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{fmt.format(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>{p.isAvailable ? "Yes" : "No"}</td>
                    <td>
                      <button
                        onClick={() => deleteProduct(p._id)}
                        className="text-red-600"
                      >
                        Del
                      </button>
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
          <button onClick={downloadCSV} className={cls.btn}>
            Download CSV
          </button>
        </Section>
      )}
    </div>
  );
}
