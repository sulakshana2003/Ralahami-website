/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { FiBarChart2, FiPieChart } from "react-icons/fi";

const COLORS = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"];

export default function FinanceCharts() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [reservationData, setReservationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [productRes, inventoryRes, employeeRes, payrollRes, reservationRes] =
          await Promise.all([
            axios.get("/api/products"),
            axios.get("/api/inventory/items"),
            axios.get("/api/Employee/employees"),
            axios.get("/api/Employee/payroll"),
            axios.get("/api/reservations/reservations"),
          ]);

        const products = productRes.data || [];
        const inventory = inventoryRes.data || [];
        const employees = employeeRes.data || [];
        const payroll = payrollRes.data || [];
        const reservations = reservationRes.data || [];

        // 1️⃣ Product revenue (sum of finalPrice)
        const totalProductRevenue = products.reduce(
          (acc: number, p: any) => acc + (p.finalPrice || p.price || 0),
          0
        );

        // 2️⃣ Inventory total cost (unitCost * stockQty)
        const totalInventoryValue = inventory.reduce(
          (acc: number, i: any) => acc + i.unitCost * i.stockQty,
          0
        );

        // 3️⃣ Payroll total payments
        const totalPayroll = payroll
          .filter((p: any) => p.type !== "deduction")
          .reduce((acc: number, p: any) => acc + p.amount, 0);

        // 4️⃣ Payroll deductions
        const totalDeductions = payroll
          .filter((p: any) => p.type === "deduction")
          .reduce((acc: number, p: any) => acc + p.amount, 0);

        // 5️⃣ Reservation paid revenue
        const totalReservationRevenue = reservations
          .filter((r: any) => r.paymentStatus === "paid")
          .reduce((acc: number, r: any) => acc + (r.amount || 0), 0);

        const pendingReservationRevenue = reservations
          .filter((r: any) => r.paymentStatus === "pending")
          .reduce((acc: number, r: any) => acc + (r.amount || 0), 0);

        // Summarized categories for bar chart
        const combined = [
          {
            category: "Product Sales",
            value: totalProductRevenue,
          },
          {
            category: "Inventory Stock Value",
            value: totalInventoryValue,
          },
          {
            category: "Payroll Payments",
            value: totalPayroll,
          },
          {
            category: "Payroll Deductions",
            value: totalDeductions,
          },
          {
            category: "Reservation Revenue",
            value: totalReservationRevenue,
          },
        ];

        // Data for pie chart — paid vs pending reservation
        const reservationBreakdown = [
          { name: "Paid", value: totalReservationRevenue },
          { name: "Pending", value: pendingReservationRevenue },
        ];

        setChartData(combined);
        setReservationData(reservationBreakdown);
      } catch (err) {
        console.error("❌ Failed to load chart data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-10 text-emerald-600">
        Loading finance charts...
      </div>
    );

  return (
    <section className="p-6 space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
        <FiBarChart2 /> Financial Analytics
      </h2>

      {/* ----------- BAR CHART ----------- */}
      <div className="bg-white border rounded-xl shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Overview by Category
        </h3>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10B981" name="LKR Value">
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ----------- PIE CHART ----------- */}
      <div className="bg-white border rounded-xl shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FiPieChart /> Reservation Payment Breakdown
        </h3>
        <div className="flex justify-center w-full h-80">
          <ResponsiveContainer width="60%" height="100%">
            <PieChart>
              <Pie
                data={reservationData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {reservationData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
