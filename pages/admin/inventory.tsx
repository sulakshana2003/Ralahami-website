/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard"
import BarChart from "../components/BarChart";

// ---------- utils ----------
const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
function shift(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

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
      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-[.98] transition ${
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
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
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

// ---------- types ----------
type Item = {
  _id: string;
  name: string;
  unit: "kg" | "g" | "L" | "pcs";
  category?: string;
  unitCost: number;
  stockQty: number;
  reorderLevel: number;
};
type Movement = {
  _id: string;
  itemId: string;
  type: "purchase" | "consume";
  qty: number;
  unitCost?: number;
  note?: string;
  date: string;
};


const categories = [
  "Fruits", "Vegetables", "Dairy", "Beverages", "Snacks",
  "Bakery", "Canned Goods", "Frozen Foods", "Spices", "Condiments",
  "Meat", "Poultry", "Seafood", "Grains", "Legumes",
  "Oils & Vinegars", "Sauces & Dressings", "Nuts & Seeds", "Cheese", "Eggs"
];

// Modal component for editing an item
function EditModal({ isOpen, onClose, item, onSubmit }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Edit Raw Material</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name (e.g., Rice)</label>
            <Input
              id="name"
              name="name"
              placeholder="Name (e.g., Rice)"
              defaultValue={item?.name}  // Pre-fill with current item name
              required
            />
          </div>

          {/* Unit field */}
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit</label>
            <Select name="unit" id="unit" defaultValue={item?.unit}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="pcs">pcs</option>
            </Select>
          </div>

          {/* Unit Cost field */}
          <div>
            <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700">Unit Cost (LKR)</label>
            <Input
              id="unitCost"
              name="unitCost"
              placeholder="Unit Cost (LKR)"
              type="number"
              defaultValue={item?.unitCost}  // Pre-fill with current unit cost
              required
            />
          </div>

          {/* Stock Qty field */}
          <div>
            <label htmlFor="stockQty" className="block text-sm font-medium text-gray-700">Initial Stock Qty</label>
            <Input
              id="stockQty"
              name="stockQty"
              placeholder="Initial Stock Qty"
              type="number"
              defaultValue={item?.stockQty}  // Pre-fill with current stock quantity
              required
            />
          </div>

          {/* Reorder Level field */}
          <div>
            <label htmlFor="reorderLevel" className="block text-sm font-medium text-gray-700">Reorder Level</label>
            <Input
              id="reorderLevel"
              name="reorderLevel"
              placeholder="Reorder Level"
              type="number"
              defaultValue={item?.reorderLevel}  // Pre-fill with current reorder level
              required
            />
          </div>

          {/* Category field */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <Select name="category" id="category" defaultValue={item?.category}>
              <option value="">Select Category</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-between mt-4">
            <Button type="button" tone="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Update</Button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ---------- main ----------
export default function InventoryAdminPage() {
  
  const { data: items, mutate: mutateItems } = useSWR<Item[]>(
    "/api/inventory/items",
    fetcher
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [from, setFrom] = useState(() => shift(-7));
  const [to, setTo] = useState(() => today());
  const { data: moves, mutate: mutateMoves } = useSWR<Movement[]>(
    () => `/api/inventory/movements?from=${from}&to=${to}`,
    fetcher
  );

  const list = Array.isArray(items) ? items : [];
  const lowStock = useMemo(
    () => list.filter((i) => i.stockQty <= i.reorderLevel),
    [list]
  );
  const totalValue = useMemo(
    () => list.reduce((s, i) => s + i.stockQty * i.unitCost, 0),
    [list]
  );

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [unitCost, setUnitCost] = useState<number | null>(null);
  // --- actions ---
  async function addItem(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();

  // Get the form element
  const form = e.currentTarget;

  if (form) {
    const fd = new FormData(form);
    const body = {
      name: fd.get("name")?.toString().trim(),
      unit: fd.get("unit")?.toString(),
      category: fd.get("category")?.toString(),
      unitCost: +fd.get("unitCost")!,
      stockQty: +fd.get("stockQty")!,
      reorderLevel: +fd.get("reorderLevel")!,

    };

    const r = await fetch("/api/inventory/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) return alert(await r.text());

    // Reset form only if it exists
    form.reset();
    mutateItems();
  }
}
const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  // Open the edit form in the modal
  function openEditForm(item: Item) {
    setEditingItem(item);
    setModalOpen(true);
  }

  // Close the modal
  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
  }

async function updateItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingItem) return;

    const form = e.currentTarget;
    const fd = new FormData(form);

    const body = {
      name: fd.get("name")?.toString().trim(),
      unit: fd.get("unit")?.toString(),
      category: fd.get("category")?.toString(),
      unitCost: +fd.get("unitCost")!,
      stockQty: +fd.get("stockQty")!,
      reorderLevel: +fd.get("reorderLevel")!,
    };

    const r = await fetch(`/api/inventory/items/${editingItem._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) return alert(await r.text());

    form.reset();
    closeModal(); // Close the modal
    mutateItems(); // Refresh the items list
  }


  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    const r = await fetch(`/api/inventory/items?id=${id}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert(await r.text());
    mutateItems();
  }
  async function addMovement(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;
  const fd = new FormData(form);

  const itemId = fd.get("mItem")?.toString();
  const qty = Number(fd.get("qty"));
  
  // Find the item based on the selected item ID
  const selectedItem = list.find((i) => i._id === itemId);

  // Add check to prevent issues when selectedItem is undefined
  if (selectedItem) {
    // Check if the movement type is "consume" and if stock is enough
    if (fd.get("type") === "consume" && selectedItem.stockQty < qty) {
      alert(`Not enough stock to consume. Available: ${selectedItem.stockQty} ${selectedItem.unit}`);
      return; // Stop the action if stock is insufficient
    }
  } else {
    // Handle the case where selectedItem is not found
    alert("Item not found.");
    return;
  }

  const body: any = {
    date: fd.get("date")?.toString(),
    itemId,
    type: fd.get("type")?.toString(),
    qty,
    unitCost: unitCost, // Use the selected unit cost
    note: fd.get("note")?.toString() || "",
  };

  // Step 1: Create the inventory movement
  const r = await fetch("/api/inventory/movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) return alert(await r.text());

  // Step 2: Update the stock quantity in the Inventory
  const updatedStock =
    fd.get("type") === "purchase"
      ? selectedItem.stockQty + qty
      : selectedItem.stockQty - qty;

  // Update the stock in the InventoryItem collection
  const stockUpdateResponse = await fetch(`/api/inventory/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stockQty: updatedStock }),
  });

  if (!stockUpdateResponse.ok) return alert(await stockUpdateResponse.text());

  // Reset form after success
  form.reset();
  mutateMoves();  // Refresh movements
  mutateItems();  // Refresh inventory items
}




async function deleteMovement(movementId: string, itemId: string, qty: number, type: "purchase" | "consume") {
  // Step 1: Delete the movement from the inventory movements collection
  const r = await fetch(`/api/inventory/movements/${movementId}`, {
    method: "DELETE",
  });

  if (!r.ok) return alert(await r.text());

  // Step 2: Adjust the stock in the inventory based on the movement type
  const item = list.find((i) => i._id === itemId);
  if (item) {
    let updatedStock = item.stockQty;
    if (type === "purchase") {
      updatedStock -= qty;  // Decrease stock for deleted purchase
    } else if (type === "consume") {
      updatedStock += qty;  // Increase stock for deleted consumption
    }

    // Update the stock in the InventoryItem collection
    const stockUpdateResponse = await fetch(`/api/inventory/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockQty: updatedStock }),
    });

    if (!stockUpdateResponse.ok) return alert(await stockUpdateResponse.text());
  }

  // Refresh data after successful deletion
  mutateMoves();  // Refresh movements
  mutateItems();  // Refresh inventory items
}


// Function to update the stock level
async function updateStockLevel(itemId: string, qty: number, type: "purchase" | "consume") {
  const item = list.find((i) => i._id === itemId);
  if (!item) return;

  let updatedStock = item.stockQty;

  if (type === "purchase") {
    updatedStock += qty;  // Increase stock for purchase
  } else if (type === "consume") {
    updatedStock -= qty;  // Decrease stock for consumption
  }

  // Update the item in the inventory database
  const r = await fetch(`/api/inventory/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stockQty: updatedStock }),
  });

  if (!r.ok) return alert(await r.text());
  mutateItems();  // Refresh the inventory list
}
  // ===== Report helpers & action (NEW) =====
  function safe(s: any) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]!));
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
      return "";
    }
  }
  async function generateReport() {
    // Snapshot data
    const allItems: Item[] = list;
    const allMoves: Movement[] = Array.isArray(moves) ? moves : [];

    const logo = await toDataUrl("/images/RalahamiLogo.png");
    const now = new Date();
    const stamp =
      `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ` +
      `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

    // Build item rows
    const itemRows = allItems.map(i => `
      <tr>
        <td>${safe(i.name)}</td>
        <td>${safe(i.category || "-")}</td>
        <td>${safe(i.unit)}</td>
        <td>${safe(fmt.format(i.unitCost))}</td>
        <td>${safe(i.stockQty)}</td>
        <td>${safe(i.reorderLevel)}</td>
        <td>${safe(fmt.format(i.stockQty * i.unitCost))}</td>
      </tr>
    `).join("");

    // For resolving item names in movement table
    const byId: Record<string, Item> = {};
    allItems.forEach(i => (byId[i._id] = i));

    // Build movement rows
    const moveRows = allMoves.map(m => {
      const item = byId[m.itemId];
      const uc = m.type === "purchase" ? (m.unitCost || 0) : (item?.unitCost || 0);
      return `
        <tr>
          <td>${safe(m.date)}</td>
          <td>${safe(item?.name || m.itemId)}</td>
          <td>${safe(m.type)}</td>
          <td>${safe(m.qty)} ${safe(item?.unit || "")}</td>
          <td>${safe(fmt.format(uc))}</td>
          <td>${safe(fmt.format(uc * m.qty))}</td>
          <td>${safe(m.note || "-")}</td>
        </tr>
      `;
    }).join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Inventory Report</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111827; margin:24px; }
  .header { display:flex; align-items:center; gap:14px; }
  .logo { height:42px; width:auto; }
  .title { font-size:22px; font-weight:800; margin:0; }
  .sub { color:#6B7280; margin-top:4px; }
  .cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:12px; margin:18px 0 22px; }
  .card { border:1px solid #E5E7EB; border-radius:12px; padding:12px; }
  .label { font-size:12px; color:#6B7280; }
  .value { font-size:20px; font-weight:700; margin-top:2px; }
  h2 { font-size:16px; margin:12px 0 8px; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #E5E7EB; padding:8px 10px; font-size:12px; }
  thead th { background:#F9FAFB; text-align:left; color:#374151; }
  tfoot td { background:#F9FAFB; font-weight:600; }
  .mt-16 { margin-top:16px; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" class="logo" alt="Logo" />` : ""}
    <div>
      <h1 class="title">Inventory Report</h1>
      <div class="sub">Generated ${safe(stamp)} • Movements: ${safe(from)} → ${safe(to)}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Total Items</div><div class="value">${allItems.length}</div></div>
    <div class="card"><div class="label">Low Stock</div><div class="value">${lowStock.length}</div></div>
    <div class="card"><div class="label">Stock Value</div><div class="value">${safe(fmt.format(totalValue))}</div></div>
    <div class="card"><div class="label">Movements (range)</div><div class="value">${allMoves.length}</div></div>
  </div>

  <h2>Inventory Snapshot</h2>
  <table>
    <thead>
      <tr>
        <th style="width:180px">Item</th>
        <th style="width:140px">Category</th>
        <th style="width:70px">Unit</th>
        <th style="width:120px">Unit Cost</th>
        <th style="width:90px">Stock</th>
        <th style="width:90px">Reorder</th>
        <th style="width:130px">Value</th>
      </tr>
    </thead>
    <tbody>${itemRows || `<tr><td colspan="7">No items</td></tr>`}</tbody>
  </table>

  <h2 class="mt-16">Inventory Movements (${safe(from)} → ${safe(to)})</h2>
  <table>
    <thead>
      <tr>
        <th style="width:120px">Date</th>
        <th style="width:180px">Item</th>
        <th style="width:100px">Type</th>
        <th style="width:120px">Qty</th>
        <th style="width:120px">Unit Cost</th>
        <th style="width:120px">Total</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>${moveRows || `<tr><td colspan="7">No movements in range</td></tr>`}</tbody>
    <tfoot>
      <tr><td colspan="7">Report generated on ${safe(stamp)}</td></tr>
    </tfoot>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-report_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  // ===== end report code =====
  /* const categories = [
  "Fruits", "Vegetables", "Dairy", "Beverages", "Snacks",
  "Bakery", "Canned Goods", "Frozen Foods", "Spices", "Condiments",
  "Meat", "Poultry", "Seafood", "Grains", "Legumes",
  "Oils & Vinegars", "Sauces & Dressings", "Nuts & Seeds", "Cheese", "Eggs"
]; */

// Filters for Inventory Snapshot
const [itemFilter, setItemFilter] = useState<string>("");
const [categoryFilter, setCategoryFilter] = useState<string>("");

const filteredItems = useMemo(() => {
  return list.filter((item) => {
    const isItemMatch = itemFilter ? item.name.toLowerCase().includes(itemFilter.toLowerCase()) : true;
    const isCategoryMatch = categoryFilter ? item.category?.toLowerCase() === categoryFilter.toLowerCase() : true;
    return isItemMatch && isCategoryMatch;
  });
}, [itemFilter, categoryFilter, list]);


// Filters for Inventory Movements
const [movementFrom, setMovementFrom] = useState<string>(today());
const [movementTo, setMovementTo] = useState<string>(today());
const [movementItemFilter, setMovementItemFilter] = useState<string>("");
const [movementTypeFilter, setMovementTypeFilter] = useState<string>("");

const filteredMovements = useMemo(() => {
  return (moves || []).filter((movement) => {
    const item = list.find((i) => i._id === movement.itemId);
    const isItemMatch = movementItemFilter ? (item?.name || "").toLowerCase().includes(movementItemFilter.toLowerCase()) : true;
    const isTypeMatch = movementTypeFilter ? movement.type === movementTypeFilter : true;
    const isDateMatch =
      new Date(movement.date) >= new Date(movementFrom) && new Date(movement.date) <= new Date(movementTo);
    return isItemMatch && isTypeMatch && isDateMatch;
  });
}, [movementFrom, movementTo, movementItemFilter, movementTypeFilter, moves, list]);

const chartData = {
  labels: (items || []).map((item: any) => item.name), // Item names
  values: (items || []).map((item: any) => item.stockQty), // Stock quantities
  units: (items || []).map((item: any) => item.unit),
};


  return (
    <AdminGuard>
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-sm text-neutral-500">
            Manage raw materials, purchases & consumption
          </p>
        </div>
        <div className="flex gap-2">
          {/* NEW: Generate Report button */}
          <Button tone="ghost" onClick={generateReport}>
            Generate Report
          </Button>
          {/* <Button tone="ghost" onClick={seedDummy}>
            Seed Dummy DB
          </Button> */}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Items" value={list.length} />
        <StatCard title="Low Stock" value={lowStock.length} />
        <StatCard title="Stock Value" value={fmt.format(totalValue)} />
        <StatCard title="Movements" value={(moves || []).length} />
      </div>

      {/* Add Item */}
      
      <section className="mb-8">
        <div className="mb-3 text-lg font-semibold">Add Raw Material</div>
        <form
          onSubmit={addItem}
          className="grid gap-3 sm:grid-cols-6 bg-white shadow rounded-xl p-4"
        >
          <Input
            name="name"
            placeholder="Name (e.g., Rice)"
            className="sm:col-span-2"
            required
          />
          <Select name="unit">
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="L">L</option>
            <option value="pcs">pcs</option>
          </Select>
          <Input
            name="unitCost"
            placeholder="Unit Cost (LKR)"
            type="number"
            required
          />
          <Input
            name="stockQty"
            placeholder="Initial Stock Qty"
            type="number"
            required
          />
          <Input
            name="reorderLevel"
            placeholder="Reorder Level"
            type="number"
            required
          />
          <Select name="category" required>
      <option value="">Select Category</option>
      {categories.map((category, index) => (
        <option key={index} value={category}>
          {category}
        </option>
      ))}
    </Select>
          <Button className="sm:col-span-1">Add</Button>
        </form>
      </section>

      {/* Items Table */}
      <section className="mb-8">
  <div className="mb-3 text-lg font-semibold">Inventory Snapshot</div>

  {/* Filters for Inventory Snapshot */}
  <div className="flex gap-4 mb-6">
    <Input
      placeholder="Filter by Item"
      value={itemFilter}
      onChange={(e) => setItemFilter(e.target.value)}
    />
    <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
      <option value="">All Categories</option>
      {categories.map((category, index) => (
        <option key={index} value={category}>
          {category}
        </option>
      ))}
    </Select>
  </div>

  <div className="overflow-hidden rounded-xl border bg-white shadow">
    <table className="w-full text-sm">
      <thead className="bg-neutral-50">
        <tr className="text-left text-neutral-600">
          <th className="px-4 py-2">Item</th>
          <th>Category</th>
          <th>Unit</th>
          <th>Unit Cost</th>
          <th>Stock</th>
          <th>Reorder</th>
          <th>Value</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {filteredItems.map((i) => (
          <tr key={i._id} className="border-t">
            <td className="px-4 py-3">{i.name}</td>
            <td>{i.category || "-"}</td>
            <td>{i.unit}</td>
            <td>{fmt.format(i.unitCost)}</td>
            <td>{i.stockQty}</td>
            <td>{i.reorderLevel}</td>
            <td>{fmt.format(i.unitCost * i.stockQty)}</td>
            <td className="text-right">
                    <Button tone="primary" onClick={() => openEditForm(i)}>
                      Edit
                    </Button>
                    <Button tone="danger" onClick={() => deleteItem(i._id)}>
                      Delete
                    </Button>
                  </td>
          </tr>
        ))}
        {filteredItems.length === 0 && (
          <tr>
            <td colSpan={8} className="p-6 text-center text-neutral-500">
              No items match your filters
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>

<EditModal
        isOpen={isModalOpen}
        onClose={closeModal}
        item={editingItem}
        onSubmit={updateItem}
      />

        <BarChart data={chartData}/>

      {/* Low stock alerts */}
      <section className="mb-8">
        <div className="mb-3 text-lg font-semibold">Low Stock Alerts</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lowStock.length === 0 ? (
            <div className="col-span-full text-sm text-neutral-500 bg-white rounded-xl shadow p-4">
              No low-stock items 🎉
            </div>
          ) : (
            lowStock.map((i) => (
              <div
                key={i._id}
                className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm"
              >
                <div className="font-medium">{i.name}</div>
                <div className="text-sm text-neutral-600">
                  Stock: {i.stockQty} {i.unit} • Reorder ≤ {i.reorderLevel}
                </div>
                <div className="text-xs text-neutral-500">
                  Unit cost: {fmt.format(i.unitCost)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Add Movement */}
      <section className="mb-8">
        <div className="mb-3 text-lg font-semibold">
          Record Purchase / Consumption
        </div>
        <form
          onSubmit={addMovement}
          className="grid gap-3 sm:grid-cols-6 bg-white shadow rounded-xl p-4"
        >
          <Input type="date" name="date" defaultValue={today()} />
          <Select
  name="mItem"
  className="sm:col-span-2"
  value={selectedItem?._id || ""}
  onChange={(e) => {
    const item = list.find((i) => i._id === e.target.value);
    setSelectedItem(item || null);
    setUnitCost(item ? item.unitCost : null);  // Update unit cost dynamically when an item is selected
  }}
>
  <option value="">Select Item</option>
  {list.map((i) => (
    <option key={i._id} value={i._id}>
      {i.name}
    </option>
  ))}
</Select>
          <Select name="type">
            <option value="purchase">Purchase</option>
            <option value="consume">Consume</option>
          </Select>
          <Input name="qty" placeholder="Qty" type="number" required />
          <Input
              name="unitCost"
              placeholder="Unit Cost (if purchase)"
              type="number"
              value={unitCost || ""}
              onChange={(e) => setUnitCost(Number(e.target.value))}
            />
          <Input
            name="note"
            placeholder="Note (optional)"
            className="sm:col-span-3"
          />
          <Button className="sm:col-span-1">Add</Button>
        </form>
      </section>

      {/* Movements Table */}
      <section>
  <div className="mb-3 text-lg font-semibold">
    Inventory Movements ({from} → {to})
  </div>

  {/* Filters for Inventory Movements */}
  <div className="flex gap-4 mb-6">
    <Input
      type="date"
      value={movementFrom}
      onChange={(e) => setMovementFrom(e.target.value)}
    />
    <Input
      type="date"
      value={movementTo}
      onChange={(e) => setMovementTo(e.target.value)}
    />
    <Input
      placeholder="Filter by Item"
      value={movementItemFilter}
      onChange={(e) => setMovementItemFilter(e.target.value)}
    />
    <Select
      value={movementTypeFilter}
      onChange={(e) => setMovementTypeFilter(e.target.value)}
    >
      <option value="">All Types</option>
      <option value="purchase">Purchase</option>
      <option value="consume">Consume</option>
    </Select>
  </div>

  <div className="overflow-hidden rounded-xl border bg-white shadow">
    <table className="w-full text-sm">
      <thead className="bg-neutral-50">
        <tr className="text-left text-neutral-600">
          <th className="px-4 py-2">Date</th>
          <th>Item</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Unit Cost</th>
          <th>Total</th>
          <th>Note</th>
          <th>Actions</th> {/* Column for delete button */}
        </tr>
      </thead>
      <tbody>
        {filteredMovements.map((m) => {
          const item = list.find((i) => i._id === m.itemId);
          const uc =
            m.type === "purchase" ? m.unitCost || 0 : item?.unitCost || 0;
          return (
            <tr key={m._id} className="border-t">
              <td className="px-4 py-3">{m.date}</td>
              <td>{item?.name || m.itemId}</td>
              <td
                className={
                  m.type === "purchase" ? "text-blue-600" : "text-amber-700"
                }
              >
                {m.type}
              </td>
              <td>
                {m.qty} {item?.unit}
              </td>
              <td>{fmt.format(uc)}</td>
              <td>{fmt.format(uc * m.qty)}</td>
              <td>{m.note || "-"}</td>
              <td className="text-right">
                <Button
                  tone="danger"
                  onClick={() =>
                    deleteMovement(m._id, m.itemId, m.qty, m.type)
                  }
                >
                  Delete
                </Button>
              </td>
            </tr>
          );
        })}
        {filteredMovements.length === 0 && (
          <tr>
            <td colSpan={8} className="p-6 text-center text-neutral-500">
              No movements match your filters
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>


    </DashboardLayout>
    </AdminGuard>
  );

  // --- helpers ---
  async function seedDummy() {
    if (!confirm("This will reset & seed the Inventory DB. Continue?")) return;
    const r = await fetch("/api/inventory/seed", { method: "POST" });
    if (!r.ok) return alert(await r.text());
    mutateItems();
    mutateMoves();
    alert("Seeded!");
  }
}
