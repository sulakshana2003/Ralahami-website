"use client";
import React from "react";
import { Item } from "../../types/inventory";

export default function LowStock({
  items,
  fmt,
}: {
  items: Item[];
  fmt: Intl.NumberFormat;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 text-lg font-semibold">Low Stock Alerts</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full text-sm text-neutral-500 bg-white rounded-xl shadow p-4">
            No low-stock items 🎉
          </div>
        ) : (
          items.map((i) => (
            <div key={i._id} className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
              <div className="font-medium">{i.name}</div>
              <div className="text-sm text-neutral-600">
                Stock: {i.stockQty} {i.unit} • Reorder ≤ {i.reorderLevel}
              </div>
              <div className="text-xs text-neutral-500">Unit cost: {fmt.format(i.unitCost)}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
