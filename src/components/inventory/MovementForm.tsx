"use client";
import React from "react";
import { Button, Input, Select } from "./ui";
import { Item } from "../../../pages/types/inventory";

export default function MovementForm({
  today,
  items,
  selectedItemId,
  onSelectItem,
  unitCost,
  setUnitCost,
  onSubmit,
}: {
  today: string;
  items: Item[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  unitCost: number | null;
  setUnitCost: (n: number | null) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 text-lg font-semibold">Record Purchase / Consumption</div>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-6 bg-white shadow rounded-xl p-4">
        <Input type="date" name="date" defaultValue={today} />
        <Select
          name="mItem"
          className="sm:col-span-2"
          value={selectedItemId || ""}
          onChange={(e) => onSelectItem(e.target.value || null)}
        >
          <option value="">Select Item</option>
          {items.map((i) => (
            <option key={i._id} value={i._id}>{i.name}</option>
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
          value={unitCost ?? ""}
          onChange={(e) => setUnitCost(Number(e.target.value))}
        />
        <Input name="note" placeholder="Note (optional)" className="sm:col-span-3" />
        <Button className="sm:col-span-1">Add</Button>
      </form>
    </section>
  );
}
