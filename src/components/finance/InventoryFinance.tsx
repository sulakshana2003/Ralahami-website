/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiBox,
  FiArrowDown,
  FiArrowUp,
  FiDollarSign,
  FiClipboard,
} from "react-icons/fi";

interface InventoryItem {
  _id: string;
  name: string;
  unit: string;
  category?: string;
  unitCost: number;
  stockQty: number;
  reorderLevel: number;
}

interface InventoryMovement {
  _id: string;
  itemId: string;
  type: "purchase" | "consume";
  qty: number;
  unitCost?: number;
  date: string;
  note?: string;
}

export default function InventoryFinance() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalStockValue, setTotalStockValue] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalConsumption, setTotalConsumption] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [itemRes, moveRes] = await Promise.all([
          axios.get("/api/inventory/items"),
          axios.get("/api/inventory/movements"),
        ]);

        const itemsData = itemRes.data || [];
        const movesData = moveRes.data || [];

        setItems(itemsData);
        setMovements(movesData);

        // Stock value = sum of (unitCost * stockQty)
        const stockValue = itemsData.reduce(
          (acc: number, i: InventoryItem) => acc + i.unitCost * i.stockQty,
          0
        );

        // Separate totals by type
        const totalPurchase = movesData
          .filter((m: InventoryMovement) => m.type === "purchase")
          .reduce(
            (acc: number, m: InventoryMovement) =>
              acc + (m.qty * (m.unitCost || 0)),
            0
          );

        const totalConsume = movesData
          .filter((m: InventoryMovement) => m.type === "consume")
          .reduce((acc: number, m: InventoryMovement) => acc + m.qty, 0);

        setTotalStockValue(stockValue);
        setTotalPurchases(totalPurchase);
        setTotalConsumption(totalConsume);
      } catch (err) {
        console.error("❌ Failed to fetch inventory data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-emerald-600">
        Loading inventory finance data...
      </div>
    );
  }

  return (
    <section className="p-6 space-y-10">
      <h2 className="text-2xl font-semibold text-gray-800">
        Inventory Finance Overview
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 bg-white border rounded-xl shadow-sm flex flex-col items-start">
          <FiBox className="text-2xl text-blue-500 mb-2" />
          <p className="text-sm text-gray-500">Total Stock Value</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalStockValue.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm flex flex-col items-start">
          <FiArrowDown className="text-2xl text-emerald-600 mb-2" />
          <p className="text-sm text-gray-500">Total Purchases</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalPurchases.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm flex flex-col items-start">
          <FiArrowUp className="text-2xl text-rose-500 mb-2" />
          <p className="text-sm text-gray-500">Total Consumption (Qty)</p>
          <p className="text-2xl font-bold text-gray-800">
            {totalConsumption.toLocaleString()} units
          </p>
        </div>
      </div>

      {/* Table — Current Stock */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Current Stock Levels
        </h3>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-emerald-50 text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Stock Qty</th>
                <th className="px-4 py-3">Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.category || "—"}</td>
                  <td className="px-4 py-3">{item.unit}</td>
                  <td className="px-4 py-3">
                    LKR {item.unitCost.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{item.stockQty.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    LKR {(item.unitCost * item.stockQty).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table — Movement History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FiClipboard className="text-gray-600" /> Inventory Movements
        </h3>

        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-emerald-50 text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Unit Cost</th>
                <th className="px-4 py-3">Total Value</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-5 text-center text-gray-500">
                    No movement records found.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const item = items.find((i) => i._id === m.itemId);
                  const color =
                    m.type === "purchase"
                      ? "text-emerald-600 bg-emerald-100"
                      : "text-rose-600 bg-rose-100";
                  return (
                    <tr key={m._id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{m.date}</td>
                      <td className="px-4 py-3 font-medium">
                        {item?.name || "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${color}`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{m.qty}</td>
                      <td className="px-4 py-3">
                        {m.unitCost ? `LKR ${m.unitCost.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {m.unitCost
                          ? `LKR ${(m.qty * m.unitCost).toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{m.note || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
