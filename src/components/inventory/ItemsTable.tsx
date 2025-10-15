"use client";
import React from "react";
import { Input, Select, Button } from "./ui";
import { Item } from "../../../pages/types/inventory";

const categories = [
  "Fruits","Vegetables","Dairy","Beverages","Snacks",
  "Bakery","Canned Goods","Frozen Foods","Spices","Condiments",
  "Meat","Poultry","Seafood","Grains","Legumes",
  "Oils & Vinegars","Sauces & Dressings","Nuts & Seeds","Cheese","Eggs",
];

export default function ItemsTable({
  items,
  fmt,
  itemFilter,
  setItemFilter,
  categoryFilter,
  setCategoryFilter,
  onEdit,
  onDelete,
}: {
  items: Item[];
  fmt: Intl.NumberFormat;
  itemFilter: string;
  setItemFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
}) {
  const filtered = React.useMemo(() => {
    return items.filter((item) => {
      const isItemMatch = itemFilter ? item.name.toLowerCase().includes(itemFilter.toLowerCase()) : true;
      const isCategoryMatch = categoryFilter ? item.category?.toLowerCase() === categoryFilter.toLowerCase() : true;
      return isItemMatch && isCategoryMatch;
    });
  }, [items, itemFilter, categoryFilter]);

  return (
    <section className="mb-8">
      <div className="mb-3 text-lg font-semibold">Inventory Snapshot</div>

      <div className="flex gap-4 mb-6">
        <Input placeholder="Filter by Item" value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c, i) => (
            <option key={i} value={c}>{c}</option>
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
            {filtered.map((i) => (
              <tr key={i._id} className="border-t">
                <td className="px-4 py-3">{i.name}</td>
                <td>{i.category || "-"}</td>
                <td>{i.unit}</td>
                <td>{fmt.format(i.unitCost)}</td>
                <td>{i.stockQty}</td>
                <td>{i.reorderLevel}</td>
                <td>{fmt.format(i.unitCost * i.stockQty)}</td>
                <td className="text-right space-x-2">
                  <Button tone="primary" onClick={() => onEdit(i)}>Edit</Button>
                  <Button tone="danger" onClick={() => onDelete(i._id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-neutral-500">No items match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
