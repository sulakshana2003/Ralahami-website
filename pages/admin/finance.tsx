"use client";

import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";
import { generateFinanceReport } from "../components/finance/FinanceReportGenerator";
import { fetchFinanceData } from "../components/finance/fetchFinanceData";
import FinanceOverview from "../components/finance/FinanceOverview";
import InventoryFinance from "../components/finance/InventoryFinance";
import EmployeeFinance from "../components/finance/EmployeeFinance";
import PayrollRecords from "../components/finance/PayrollRecords";
import ReservationFinance from "../components/finance/ReservationFinance";
import FinanceCharts from "../components/finance/FinanceCharts";
import PromotionManager from "../components/finance/PromotionManager";
import FinanceStats from "../components/finance/FinanceStats";

export default function FinancePage() {
  const [filter, setFilter] = useState("All");

  async function handleGenerateReport() {
    const fmt = new Intl.NumberFormat("en-LK", { minimumFractionDigits: 2 });

    try {
      const allStats = await fetchFinanceData();
      await generateFinanceReport({
        ...allStats,
        fmt,
      });
    } catch (err) {
      console.error("❌ Error generating report:", err);
      alert("Failed to fetch finance data. Please check your API endpoints.");
    }
  }

  const categories = [
    "All",
    "Overview",
    "Inventory",
    "Employees",
    "Payroll",
    "Reservations",
    "Promotions",
    "Charts",
  ];

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto py-10 px-6 space-y-10">
            {/* ===== Header ===== */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <h1 className="text-3xl font-bold text-gray-800">
                Finance Dashboard
              </h1>

              <div className="flex flex-wrap gap-3 items-center">
                {/* Filter Dropdown */}
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateReport}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  Generate Finance Report
                </button>
              </div>
            </div>

            {/* ===== Stats Section ===== */}
            <FinanceStats />

            {/* ===== Conditional Rendering by Filter ===== */}
            {(filter === "All" || filter === "Overview") && <FinanceOverview />}
            {(filter === "All" || filter === "Inventory") && <InventoryFinance />}
            {(filter === "All" || filter === "Employees") && <EmployeeFinance />}
            {(filter === "All" || filter === "Payroll") && <PayrollRecords />}
            {(filter === "All" || filter === "Reservations") && (
              <ReservationFinance />
            )}
            {(filter === "All" || filter === "Promotions") && <PromotionManager />}
            {(filter === "All" || filter === "Charts") && <FinanceCharts />}
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
