/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FiUsers, FiDollarSign, FiBox, FiCalendar, FiTag } from "react-icons/fi";

interface Stats {
  employeeCount: number;
  totalPayroll: number;
  totalInventoryValue: number;
  totalReservationsRevenue: number;
  activePromotions: number;
}

export default function FinanceStats() {
  const [stats, setStats] = useState<Stats>({
    employeeCount: 0,
    totalPayroll: 0,
    totalInventoryValue: 0,
    totalReservationsRevenue: 0,
    activePromotions: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [
          employeesRes,
          payrollRes,
          inventoryRes,
          reservationsRes,
          promotionsRes,
        ] = await Promise.all([
          axios.get("/api/Employee/employees"),
          axios.get("/api/Employee/payroll"),
          axios.get("/api/inventory/items"),
          axios.get("/api/reservations/reservations"),
          axios.get("/api/promotions"),
        ]);

        const employeeCount = employeesRes.data?.length || 0;
        const totalPayroll = payrollRes.data?.reduce(
          (acc: number, p: any) =>
            p.type === "deduction" ? acc - p.amount : acc + p.amount,
          0
        );

        const totalInventoryValue = inventoryRes.data?.reduce(
          (acc: number, item: any) => acc + item.stockQty * item.unitCost,
          0
        );

        const totalReservationsRevenue = reservationsRes.data?.reduce(
          (acc: number, r: any) =>
            r.paymentStatus === "paid" ? acc + (r.amount || 0) : acc,
          0
        );

        const activePromotions = promotionsRes.data?.filter(
          (p: any) => p.isActive
        ).length;

        setStats({
          employeeCount,
          totalPayroll,
          totalInventoryValue,
          totalReservationsRevenue,
          activePromotions,
        });
      } catch (err) {
        console.error("❌ Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 rounded-xl border border-gray-200"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <StatCard
        icon={<FiUsers className="text-blue-500" size={24} />}
        title="Employees"
        value={stats.employeeCount}
      />
      <StatCard
        icon={<FiDollarSign className="text-emerald-500" size={24} />}
        title="Total Payroll"
        value={`LKR ${stats.totalPayroll.toLocaleString()}`}
      />
      <StatCard
        icon={<FiBox className="text-amber-500" size={24} />}
        title="Inventory Value"
        value={`LKR ${stats.totalInventoryValue.toLocaleString()}`}
      />
      <StatCard
        icon={<FiCalendar className="text-purple-500" size={24} />}
        title="Reservations Revenue"
        value={`LKR ${stats.totalReservationsRevenue.toLocaleString()}`}
      />
      <StatCard
        icon={<FiTag className="text-rose-500" size={24} />}
        title="Active Promotions"
        value={stats.activePromotions}
      />
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 bg-white p-4 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3 rounded-full bg-gray-50">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-lg font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
