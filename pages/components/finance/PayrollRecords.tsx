/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { FiClipboard, FiDollarSign, FiCalendar } from "react-icons/fi";

interface Payroll {
  _id: string;
  employeeId: string;
  type: "salary" | "advance" | "bonus" | "deduction";
  amount: number;
  date: string;
  note?: string;
}

interface Employee {
  _id: string;
  name: string;
}

export default function PayrollRecords() {
  const [records, setRecords] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);

  useEffect(() => {
    async function fetchPayroll() {
      try {
        const [payrollRes, empRes] = await Promise.all([
          axios.get("/api/Employee/payroll"),
          axios.get("/api/Employee/employees"),
        ]);

        const payData = payrollRes.data || [];
        const empData = empRes.data || [];

        setRecords(payData);
        setEmployees(empData);

        const total = payData
          .filter((p: Payroll) => p.type !== "deduction")
          .reduce((acc: number, p: Payroll) => acc + p.amount, 0);

        const deductions = payData
          .filter((p: Payroll) => p.type === "deduction")
          .reduce((acc: number, p: Payroll) => acc + p.amount, 0);

        setTotalPaid(total);
        setTotalDeductions(deductions);
      } catch (err) {
        console.error("❌ Failed to fetch payroll data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPayroll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-emerald-600">
        Loading payroll data...
      </div>
    );
  }

  const findEmployeeName = (id: string) =>
    employees.find((e) => e._id === id)?.name || "Unknown";

  return (
    <section className="p-6 space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800">Payroll Records</h2>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiDollarSign className="text-2xl text-emerald-600 mb-2" />
          <p className="text-sm text-gray-500">Total Payments</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalPaid.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiDollarSign className="text-2xl text-rose-500 mb-2" />
          <p className="text-sm text-gray-500">Total Deductions</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalDeductions.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Payroll Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FiClipboard className="text-gray-600" /> All Payroll Transactions
        </h3>

        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-emerald-50 text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-5 text-center text-gray-500"
                  >
                    No payroll records available.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{r.date}</td>
                    <td className="px-4 py-3">{findEmployeeName(r.employeeId)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          r.type === "deduction"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      LKR {r.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{r.note || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
