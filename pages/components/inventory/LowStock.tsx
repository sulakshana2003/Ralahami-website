"use client";
import React, { useEffect, useMemo, useRef } from "react";
import { Item } from "../../types/inventory";

export default function LowStock({
  items,
  fmt,
}: {
  items: Item[];
  fmt: Intl.NumberFormat;
}) {
  // derive low-stock items (stockQty <= reorderLevel)
  const lowStock = useMemo(
    () => items.filter((i) => typeof i.stockQty === "number" && typeof i.reorderLevel === "number" && i.stockQty <= i.reorderLevel),
    [items]
  );

  // create a stable signature for deduping (ids + quantities + reorder levels)
  const signature = useMemo(
    () =>
      JSON.stringify(
        lowStock
          .map((i) => ({ _id: i._id, q: i.stockQty, r: i.reorderLevel }))
          .sort((a, b) => (a._id > b._id ? 1 : -1))
      ),
    [lowStock]
  );

  const lastSentSig = useRef<string>("");

  useEffect(() => {
    // only send if there are low-stock items and the signature changed
    if (lowStock.length === 0) return;
    if (signature === lastSentSig.current) return;

    // Fire-and-forget; you could add toasts if you like
    (async () => {
      try {
        const res = await fetch("/api/alerts/low-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ items: lowStock }),
        });
        if (res.ok) {
          lastSentSig.current = signature;
          // Optionally: show a toast "Low-stock email sent"
        } else {
          // Optionally: show a toast "Failed to send low-stock email"
          console.error("Low-stock email failed:", await res.text());
        }
      } catch (e) {
        console.error("Low-stock email error:", e);
      }
    })();
  }, [lowStock, signature]);

  return (
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
  );
}
