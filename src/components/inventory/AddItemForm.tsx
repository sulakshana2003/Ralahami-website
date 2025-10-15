"use client";
import React from "react";
import { Button, Input, Select } from "./ui";

const categories = [
  "Fruits","Vegetables","Dairy","Beverages","Snacks",
  "Bakery","Canned Goods","Frozen Foods","Spices","Condiments",
  "Meat","Poultry","Seafood","Grains","Legumes",
  "Oils & Vinegars","Sauces & Dressings","Nuts & Seeds","Cheese","Eggs",
];

export default function AddItemForm({ onSubmit }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <section className="mb-8">
      <div className="mb-3 text-lg font-semibold">Add Raw Material</div>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-6 bg-white shadow rounded-xl p-4">
        <Input name="name" placeholder="Name (e.g., Rice)" className="sm:col-span-2" required />
        <Select name="unit">
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="L">L</option>
          <option value="pcs">pcs</option>
        </Select>
        <Input name="unitCost" placeholder="Unit Cost (LKR)" type="number" required />
        <Input name="stockQty" placeholder="Initial Stock Qty" type="number" required />
        <Input name="reorderLevel" placeholder="Reorder Level" type="number" required />
        <Select name="category" required>
          <option value="">Select Category</option>
          {categories.map((c, i) => (
            <option key={i} value={c}>{c}</option>
          ))}
        </Select>
        <Button className="sm:col-span-1">Add</Button>
      </form>
    </section>
  );
}
