"use client";
import React from "react";
import { StatCard } from "./ui";

export default function Stats({
  totalItems,
  lowStockCount,
  stockValue,
  movementCount,
  fmt,
}: {
  totalItems: number;
  lowStockCount: number;
  stockValue: number;
  movementCount: number;
  fmt: Intl.NumberFormat;
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <StatCard title="Total Items" value={totalItems} />
      <StatCard title="Low Stock" value={lowStockCount} />
      <StatCard title="Stock Value" value={fmt.format(stockValue)} />
      <StatCard title="Movements" value={movementCount} />
    </div>
  );
}
