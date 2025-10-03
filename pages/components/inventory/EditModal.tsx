"use client";
import React from "react";
import { Button, Input, Select } from "./ui";
import { Item } from "../../types/inventory";

const categories = [
  "Fruits","Vegetables","Dairy","Beverages","Snacks",
  "Bakery","Canned Goods","Frozen Foods","Spices","Condiments",
  "Meat","Poultry","Seafood","Grains","Legumes",
  "Oils & Vinegars","Sauces & Dressings","Nuts & Seeds","Cheese","Eggs",
];

export default function EditModal({
  isOpen,
  onClose,
  item,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Edit Raw Material</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name (e.g., Rice)</label>
            <Input id="name" name="name" placeholder="Name (e.g., Rice)" defaultValue={item?.name} required />
          </div>

          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit</label>
            <Select name="unit" id="unit" defaultValue={item?.unit}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="pcs">pcs</option>
            </Select>
          </div>

          <div>
            <label htmlFor="unitCost" className="block text-sm font-medium text-gray-700">Unit Cost (LKR)</label>
            <Input id="unitCost" name="unitCost" placeholder="Unit Cost (LKR)" type="number" defaultValue={item?.unitCost} required />
          </div>

          <div>
            <label htmlFor="stockQty" className="block text-sm font-medium text-gray-700">Initial Stock Qty</label>
            <Input id="stockQty" name="stockQty" placeholder="Initial Stock Qty" type="number" defaultValue={item?.stockQty} required />
          </div>

          <div>
            <label htmlFor="reorderLevel" className="block text-sm font-medium text-gray-700">Reorder Level</label>
            <Input id="reorderLevel" name="reorderLevel" placeholder="Reorder Level" type="number" defaultValue={item?.reorderLevel} required />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <Select name="category" id="category" defaultValue={item?.category}>
              <option value="">Select Category</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </Select>
          </div>

          <div className="flex justify-between mt-4">
            <Button type="button" tone="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Update</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
