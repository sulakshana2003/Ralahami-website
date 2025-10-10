"use client";
import React from "react";
import { Button, Input, Select } from "./ui";
import { Item, Movement } from "../../types/inventory";

export default function MovementsTable({
  from,
  to,
  items,
  movements,
  fmt,
  movementFrom,
  setMovementFrom,
  movementTo,
  setMovementTo,
  movementItemFilter,
  setMovementItemFilter,
  movementTypeFilter,
  setMovementTypeFilter,
  onDeleteMovement,
}: {
  from: string;
  to: string;
  items: Item[];
  movements: Movement[];
  fmt: Intl.NumberFormat;
  movementFrom: string;
  setMovementFrom: (v: string) => void;
  movementTo: string;
  setMovementTo: (v: string) => void;
  movementItemFilter: string;
  setMovementItemFilter: (v: string) => void;
  movementTypeFilter: string;
  setMovementTypeFilter: (v: string) => void;
  onDeleteMovement: (mId: string, itemId: string, qty: number, type: "purchase" | "consume") => void;
}) {
  const filtered = React.useMemo(() => {
    return (movements || []).filter((m) => {
      const item = items.find((i) => i._id === m.itemId);
      const isItemMatch = movementItemFilter
        ? (item?.name || "").toLowerCase().includes(movementItemFilter.toLowerCase())
        : true;
      const isTypeMatch = movementTypeFilter ? m.type === movementTypeFilter : true;
      const isDateMatch =
        new Date(m.date) >= new Date(movementFrom) && new Date(m.date) <= new Date(movementTo);
      return isItemMatch && isTypeMatch && isDateMatch;
    });
  }, [movements, items, movementItemFilter, movementTypeFilter, movementFrom, movementTo]);

  return (
    <section>
      <div className="mb-3 text-lg font-semibold">Inventory Movements ({from} → {to})</div>

      <div className="flex gap-4 mb-6">
        <Input type="date" value={movementFrom} onChange={(e) => setMovementFrom(e.target.value)} />
        <Input type="date" value={movementTo} onChange={(e) => setMovementTo(e.target.value)} />
        <Input placeholder="Filter by Item" value={movementItemFilter} onChange={(e) => setMovementItemFilter(e.target.value)} />
        <Select value={movementTypeFilter} onChange={(e) => setMovementTypeFilter(e.target.value)}>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const item = items.find((i) => i._id === m.itemId);
              const uc = m.type === "purchase" ? m.unitCost || 0 : item?.unitCost || 0;
              return (
                <tr key={m._id} className="border-t">
                  <td className="px-4 py-3">{m.date}</td>
                  <td>{item?.name || m.itemId}</td>
                  <td className={m.type === "purchase" ? "text-blue-600" : "text-amber-700"}>{m.type}</td>
                  <td>{m.qty} {item?.unit}</td>
                  <td>{fmt.format(uc)}</td>
                  <td>{fmt.format(uc * m.qty)}</td>
                  <td>{m.note || "-"}</td>
                  <td className="text-right">
                    <Button tone="danger" onClick={() => onDeleteMovement(m._id, m.itemId, m.qty, m.type)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
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
  );
}
