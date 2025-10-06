/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiUsers,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";

interface Employee {
  _id: string;
  name: string;
  role: string;
  department: string;
  baseSalary: number;
  employmentStatus: string;
  payType: string;
  isActive: boolean;
}

export default function EmployeeFinance() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState(0);
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(0);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await axios.get("/api/Employee/employees");
        const data = res.data || [];
        setEmployees(data);

        const total = data.length;
        const active = data.filter((e: Employee) => e.isActive).length;
        const totalSalary = data.reduce(
          (acc: number, e: Employee) =>
            acc + (e.isActive ? e.baseSalary : 0),
          0
        );

        setTotalEmployees(total);
        setActiveEmployees(active);
        setTotalMonthlyCost(totalSalary);
      } catch (err) {
        console.error("❌ Failed to fetch employees", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-emerald-600">
        Loading employee data...
      </div>
    );
  }

  return (
    <section className="p-6 space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800">
        Employee Payroll Overview
      </h2>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiUsers className="text-2xl text-blue-500 mb-2" />
          <p className="text-sm text-gray-500">Total Employees</p>
          <p className="text-2xl font-bold text-gray-800">{totalEmployees}</p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiCheckCircle className="text-2xl text-emerald-600 mb-2" />
          <p className="text-sm text-gray-500">Active Employees</p>
          <p className="text-2xl font-bold text-gray-800">{activeEmployees}</p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiDollarSign className="text-2xl text-rose-500 mb-2" />
          <p className="text-sm text-gray-500">Monthly Salary Cost</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalMonthlyCost.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Employee Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Employee List
        </h3>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-emerald-50 text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Pay Type</th>
                <th className="px-4 py-3">Base Salary</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3">{e.role}</td>
                  <td className="px-4 py-3">{e.department}</td>
                  <td className="px-4 py-3 capitalize">{e.payType}</td>
                  <td className="px-4 py-3">
                    LKR {e.baseSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        e.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {e.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
