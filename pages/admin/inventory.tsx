/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";
import BarChart from "../components/BarChart";

import Header from "../components/inventory/Header";
import Stats from "../components/inventory/Stats";
import AddItemForm from "../components/inventory/AddItemForm";
import ItemsTable from "../components/inventory/ItemsTable";
import EditModal from "../components/inventory/EditModal";
import LowStock from "../components/inventory/LowStock";
import MovementForm from "../components/inventory/MovementForm";
import MovementsTable from "../components/inventory/MovementsTable";
import Chart from "chart.js/auto";


import { Item, Movement } from "../types/inventory";
import { generateInventoryReport } from "../components/inventory/report";

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function shift(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function buildStockChartImage(items: Array<{ name: string; stockQty: number; unit: string }>) {
  // create an off-screen canvas
  const canvas = document.createElement("canvas");
  canvas.width = 1200;  // fixed size so the image is crisp
  canvas.height = 500;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const labels = items.map(i => `${i.name} (${i.unit})`);
  const data = items.map(i => i.stockQty);

  // create chart
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Stock Level",
          data,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,         // important for off-screen canvas
      animation: false,          // faster
      plugins: {
        title: { display: true, text: "Inventory Stock Levels" },
        legend: { display: true },
        tooltip: { enabled: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });

  // snapshot as PNG
  const url = canvas.toDataURL("image/png");

  // cleanup
  chart.destroy();

  return url;
}


export default function InventoryAdminPage() {
  const { data: items, mutate: mutateItems } = useSWR<Item[]>("/api/inventory/items", fetcher);
  const [from] = useState(() => shift(-7));
  const [to] = useState(() => today());
  const { data: moves, mutate: mutateMoves } = useSWR<Movement[]>(
    () => `/api/inventory/movements?from=${from}&to=${to}`,
    fetcher
  );

  const list = Array.isArray(items) ? items : [];
  const lowStock = useMemo(() => list.filter((i) => i.stockQty <= i.reorderLevel), [list]);
  const totalValue = useMemo(() => list.reduce((s, i) => s + i.stockQty * i.unitCost, 0), [list]);

  // ----- Add Item -----
  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    const r = await fetch("/api/inventory/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    form.reset();
    mutateItems();
  }

  // ----- Edit Modal state & update -----
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  function openEditForm(item: Item) {
    setEditingItem(item);
    setModalOpen(true);
  }
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
    closeModal();
    mutateItems();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    const r = await fetch(`/api/inventory/items?id=${id}`, { method: "DELETE" });
    if (!r.ok) return alert(await r.text());
    mutateItems();
  }

  // ----- Movement create & delete -----
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [unitCost, setUnitCost] = useState<number | null>(null);

  function handleSelectItem(id: string | null) {
    setSelectedItemId(id);
    const item = list.find((i) => i._id === id);
    setUnitCost(item ? item.unitCost : null);
  }

  async function addMovement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const itemId = fd.get("mItem")?.toString();
    const qty = Number(fd.get("qty"));
    const selected = list.find((i) => i._id === itemId);

    if (!selected) {
      alert("Item not found.");
      return;
    }
    if (fd.get("type") === "consume" && selected.stockQty < qty) {
      alert(`Not enough stock to consume. Available: ${selected.stockQty} ${selected.unit}`);
      return;
    }

    const body: any = {
      date: fd.get("date")?.toString(),
      itemId,
      type: fd.get("type")?.toString(),
      qty,
      unitCost: unitCost,
      note: fd.get("note")?.toString() || "",
    };

    const r = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());

    // update stock
    const updatedStock = fd.get("type") === "purchase" ? selected.stockQty + qty : selected.stockQty - qty;
    const stockUpdate = await fetch(`/api/inventory/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockQty: updatedStock }),
    });
    if (!stockUpdate.ok) return alert(await stockUpdate.text());

    form.reset();
    setSelectedItemId(null);
    setUnitCost(null);
    mutateMoves();
    mutateItems();
  }

  async function deleteMovement(movementId: string, itemId: string, qty: number, type: "purchase" | "consume") {
    const r = await fetch(`/api/inventory/movements/${movementId}`, { method: "DELETE" });
    if (!r.ok) return alert(await r.text());

    const item = list.find((i) => i._id === itemId);
    if (item) {
      let updatedStock = item.stockQty;
      if (type === "purchase") updatedStock -= qty;
      if (type === "consume") updatedStock += qty;

      const stockUpdate = await fetch(`/api/inventory/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQty: updatedStock }),
      });
      if (!stockUpdate.ok) return alert(await stockUpdate.text());
    }

    mutateMoves();
    mutateItems();
  }

  // ----- Movement filters state -----
  const [movementFrom, setMovementFrom] = useState<string>(today());
  const [movementTo, setMovementTo] = useState<string>(today());
  const [movementItemFilter, setMovementItemFilter] = useState<string>("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("");

  // ----- Items table filters (local state) -----
  const [itemFilter, setItemFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const chartData = {
  labels: (items || []).map((item: any) => item.name), // Item names
  values: (items || []).map((item: any) => item.stockQty), // Stock quantities
  units: (items || []).map((item: any) => item.unit),
};



  // ----- Report -----
  async function generateReport() {
  const allItems: Item[] = list;
  const allMoves: Movement[] = Array.isArray(moves) ? moves : [];

  // make the chart image for the report
  const chartDataUrl = await buildStockChartImage(
    list.map(i => ({ name: i.name, stockQty: i.stockQty, unit: i.unit }))
  );

  await generateInventoryReport({
    items: allItems,
    movements: allMoves,
    from,
    to,
    lowStockCount: lowStock.length,
    totalValue,
    fmt,
    chartDataUrl,         // ✅ pass it in
  });
}

  return (
    <AdminGuard>
      <DashboardLayout>
        {/* Header + Stats */}
        <Header onGenerateReport={generateReport} />
        <Stats
          totalItems={list.length}
          lowStockCount={lowStock.length}
          stockValue={totalValue}
          movementCount={(moves || []).length}
          fmt={fmt}
        />

        {/* Add Item form */}
        <AddItemForm onSubmit={addItem} />

        {/* Items table */}
        <ItemsTable
  items={list}
  fmt={fmt}
  itemFilter={itemFilter}
  setItemFilter={setItemFilter}
  categoryFilter={categoryFilter}
  setCategoryFilter={setCategoryFilter}
  onEdit={openEditForm}
  onDelete={(id) => { void deleteItem(id); }}   // ensures type () => void
/>


        {/* 🔽 PASTE YOUR BLOCK RIGHT HERE 🔽 */}
        <EditModal
          isOpen={isModalOpen}
          onClose={closeModal}
          item={editingItem}
          onSubmit={updateItem}
        />

        <BarChart data={chartData}/>


        <LowStock items={lowStock} fmt={fmt} />

        <MovementForm
          today={today()}
          items={list}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
          unitCost={unitCost}
          setUnitCost={setUnitCost}
          onSubmit={addMovement}
        />

        <MovementsTable
          from={from}
          to={to}
          items={list}
          movements={moves || []}
          fmt={fmt}
          movementFrom={movementFrom}
          setMovementFrom={setMovementFrom}
          movementTo={movementTo}
          setMovementTo={setMovementTo}
          movementItemFilter={movementItemFilter}
          setMovementItemFilter={setMovementItemFilter}
          movementTypeFilter={movementTypeFilter}
          setMovementTypeFilter={setMovementTypeFilter}
          onDeleteMovement={deleteMovement}
        />
        {/* 🔼 END OF YOUR BLOCK 🔼 */}
      </DashboardLayout>
    </AdminGuard>
  );
}

/* ===== helper local hook for ItemsTable filters (keeps props tidy) ===== */
const useItemFilterState = (() => {
  let _itemFilter = "";
  let _setItemFilter: (v: string) => void = () => {};
  let _categoryFilter = "";
  let _setCategoryFilter: (v: string) => void = () => {};

  function Hook() {
    const [itemFilter, setItemFilter] = useState<string>("");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    _itemFilter = itemFilter;
    _setItemFilter = setItemFilter;
    _categoryFilter = categoryFilter;
    _setCategoryFilter = setCategoryFilter;
    return null;
  }

  // tiny component that runs the hook
  (Hook as any).displayName = "ItemsTableFilterState";

  // getters for current values (used above)
  return {
    Hook,
    get useItemFilter() { return _itemFilter; },
    get setItemFilter() { return _setItemFilter; },
    get categoryFilter() { return _categoryFilter; },
    get setCategoryFilter() { return _setCategoryFilter; },
  };
})();

/* Mount the hook component once inside the page tree */
function ItemsTableFilterStateMount() {
  return (useItemFilterState as any).Hook();
}
