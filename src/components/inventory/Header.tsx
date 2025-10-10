"use client";
import React from "react";
import { Button } from "./ui";

export default function Header({ onGenerateReport }: { onGenerateReport: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <p className="text-sm text-neutral-500">Manage raw materials, purchases & consumption</p>
      </div>
      <div className="flex gap-2">
        <Button tone="ghost" onClick={onGenerateReport}>Generate Report</Button>
      </div>
    </div>
  );
}
