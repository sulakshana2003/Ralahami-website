/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import useSWR from "swr";
import { useMemo, useState } from "react";

type Item = {
  _id: string;
  name: string;
  unit: "kg"|"g"|"L"|"pcs";
  category?: string;
  unitCost: number;
  stockQty: number;
  reorderLevel: number;
};
type Movement = {
  _id: string;
  itemId: string;
  type: "purchase"|"consume";
  qty: number;
  unitCost?: number;
  note?: string;
  date: string; // YYYY-MM-DD
};

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 2 });
const today = () => {
  const d = new Date(); const mm = String(d.getMonth()+1).padStart(2,"0"); const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
const cls = {
  input:"w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10",
  btn:"rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 active:scale-[.98]",
  card:"rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
  btnGhost:"rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50",
};

export default function InventoryAdminPage() {
  const { data: items, mutate: mutateItems, isLoading: loadingItems } = useSWR<Item[]>("/api/inventory/items", fetcher);
  const [from, setFrom] = useState(() => shift(-7));
  const [to, setTo] = useState(() => today());
  const { data: moves, mutate: mutateMoves } = useSWR<Movement[]>(
    () => `/api/inventory/movements?from=${from}&to=${to}`,
    fetcher
  );

  const lowStock = useMemo(() => (items||[]).filter(i => i.stockQty <= i.reorderLevel), [items]);

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name")?.toString().trim(),
      unit: fd.get("unit")?.toString(),
      category: fd.get("category")?.toString(),
      unitCost: +fd.get("unitCost")!,
      stockQty: +fd.get("stockQty")!,
      reorderLevel: +fd.get("reorderLevel")!,
    };
    if (!body.name || isNaN(body.unitCost) || isNaN(body.stockQty) || isNaN(body.reorderLevel)) return alert("Fill all required fields");
    if (body.unitCost < 0 || body.stockQty < 0 || body.reorderLevel < 0) return alert("Numbers must be positive");
    const r = await fetch("/api/inventory/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return alert(await r.text());
    e.currentTarget.reset();
    mutateItems();
  }

  async function updateItem(p: Partial<Item> & { _id: string }) {
    const r = await fetch("/api/inventory/items", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p._id, ...p }) });
    if (!r.ok) return alert(await r.text());
    mutateItems();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    const r = await fetch(`/api/inventory/items?id=${id}`, { method: "DELETE" });
    if (!r.ok) return alert(await r.text());
    mutateItems();
  }

  async function addMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: any = {
      date: fd.get("date")?.toString(),
      itemId: fd.get("mItem")?.toString(),
      type: fd.get("type")?.toString(),
      qty: Number(fd.get("qty")),
      unitCost: fd.get("unitCost") ? Number(fd.get("unitCost")) : undefined,
      note: fd.get("note")?.toString() || "",
    };
    if (!body.itemId || !body.type || !body.qty || !body.date) return alert("Fill all fields");
    if (body.qty <= 0) return alert("Qty must be positive");
    if (body.type === "purchase" && (body.unitCost == null || body.unitCost < 0)) return alert("Unit cost required for purchase");
    const r = await fetch("/api/inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return alert(await r.text());
    e.currentTarget.reset();
    mutateMoves();
    mutateItems(); // stock and moving average changed
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Admin</h1>
          <p className="text-sm text-neutral-600">Manage raw materials, track purchases & consumption, watch low stock.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className={cls.btnGhost} onClick={seedDummy}>Seed Dummy DB</button>
        </div>
      </header>

      {/* Filters */}
      <div className={cls.card}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-600">From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className={cls.input+" w-[160px]"} />
          <label className="ml-2 text-sm text-neutral-600">To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className={cls.input+" w-[160px]"} />
        </div>
      </div>

      {/* Add Item */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">Add Raw Material</div>
        <form onSubmit={addItem} className={cls.card + " grid gap-2 sm:grid-cols-6"}>
          <input name="name" placeholder="Name (e.g., Rice)" className={cls.input+" sm:col-span-2"} />
          <select name="unit" className={cls.input}>
            <option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="pcs">pcs</option>
          </select>
          <input name="unitCost" placeholder="Unit Cost (LKR)" inputMode="numeric" className={cls.input} />
          <input name="stockQty" placeholder="Initial Stock Qty" inputMode="numeric" className={cls.input} />
          <input name="reorderLevel" placeholder="Reorder Level" inputMode="numeric" className={cls.input} />
          <input name="category" placeholder="Category (optional)" className={cls.input+" sm:col-span-2"} />
          <button className={cls.btn+" sm:col-span-1"}>Add Item</button>
        </form>
      </section>

      {/* Items table */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">Inventory Snapshot</div>
        <div className={cls.card}>
          {loadingItems ? (
            <div className="text-sm text-neutral-600">Loading...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">Item</th><th>Category</th><th>Unit</th><th>Unit Cost</th><th>Stock</th><th>Reorder</th><th>Stock Value</th><th></th>
              </tr>
              </thead>
              <tbody>
              {(items||[]).map(i=>(
                <tr key={i._id} className="border-t">
                  <td className="py-2">{i.name}</td>
                  <td>{i.category || "-"}</td>
                  <td>{i.unit}</td>
                  <td>{fmt.format(i.unitCost)}</td>
                  <td>{i.stockQty}</td>
                  <td>{i.reorderLevel}</td>
                  <td>{fmt.format(i.unitCost * i.stockQty)}</td>
                  <td className="text-right">
                    <button onClick={()=>quickUp(i)} className={cls.btnGhost}>Quick +1</button>{" "}
                    <button onClick={()=>deleteItem(i._id)} className={cls.btnGhost}>Delete</button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Low stock */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">Low Stock Alerts</div>
        <div className={cls.card}>
          {lowStock.length === 0 ? (
            <div className="text-sm text-neutral-600">No low-stock items 🎉</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lowStock.map(i=>(
                <div key={i._id} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                  <div className="font-medium">{i.name}</div>
                  <div className="text-neutral-600">Stock: {i.stockQty} {i.unit} • Reorder ≤ {i.reorderLevel}</div>
                  <div className="text-neutral-500">Unit cost: {fmt.format(i.unitCost)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Movement */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">Record Purchase / Consumption</div>
        <form onSubmit={addMovement} className={cls.card + " grid gap-2 sm:grid-cols-6"}>
          <input name="date" type="date" defaultValue={today()} className={cls.input} />
          <select name="mItem" className={cls.input+" sm:col-span-2"}>
            <option value="">Select Item</option>
            {(items||[]).map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
          </select>
          <select name="type" className={cls.input}>
            <option value="purchase">Purchase</option>
            <option value="consume">Consume</option>
          </select>
          <input name="qty" placeholder="Qty" inputMode="numeric" className={cls.input} />
          <input name="unitCost" placeholder="Unit Cost (for Purchase)" inputMode="numeric" className={cls.input} />
          <input name="note" placeholder="Note (optional)" className={cls.input+" sm:col-span-5"} />
          <button className={cls.btn}>Add Movement</button>
        </form>
      </section>

      {/* Movements table */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">Inventory Movements (range)</div>
        <div className={cls.card}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">Date</th><th>Item</th><th>Type</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(moves||[]).map(m=>{
                const item = (items||[]).find(i=>i._id===m.itemId);
                const unitCost = m.type==="purchase" ? (m.unitCost||0) : (item?.unitCost||0);
                return (
                  <tr key={m._id} className="border-t">
                    <td className="py-2">{m.date}</td>
                    <td>{item?.name || m.itemId}</td>
                    <td className={m.type==="purchase" ? "text-blue-600" : "text-amber-700"}>{m.type}</td>
                    <td>{m.qty} {item?.unit}</td>
                    <td>{fmt.format(unitCost)}</td>
                    <td>{fmt.format(unitCost * m.qty)}</td>
                    <td>{m.note || "-"}</td>
                  </tr>
                );
              })}
              {(moves||[]).length===0 && <tr><td className="py-2 text-neutral-600" colSpan={7}>No movements in range</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );

  // helpers
  async function seedDummy() {
    if (!confirm("This will reset & seed the Inventory DB. Continue?")) return;
    const r = await fetch("/api/inventory/seed", { method: "POST" });
    if (!r.ok) return alert(await r.text());
    mutateItems();
    mutateMoves();
    alert("Seeded!");
  }

  async function quickUp(i: Item) {
    // Quick +1 stock (purchase with same unit cost)
    const body = { date: today(), itemId: i._id, type: "purchase", qty: 1, unitCost: i.unitCost, note: "Quick +1" };
    const r = await fetch("/api/inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return alert(await r.text());
    mutateMoves();
    mutateItems();
  }
}

function shift(days: number) {
  const d = new Date(); d.setDate(d.getDate()+days);
  const mm = String(d.getMonth()+1).padStart(2,"0"); const dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
