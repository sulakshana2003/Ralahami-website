/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";

// ---------- utils ----------
const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};
const generateEmployeeId = () => {
  return `EMP${Date.now().toString().slice(-6)}`;
};

// ---------- UI atoms ----------
function Button({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "danger";
}) {
  const map = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost:
      "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-[.98] transition ${
        map[tone]
      } ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
  );
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
  );
}
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

// ---------- NEW MODAL COMPONENT ----------
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-2xl font-light">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ---------- types ----------
type Employee = {
  _id: string;
  name: string;
  role: string;
  employeeId: string;
  // ... other employee fields
  baseSalary: number;
  isActive: boolean;
  department: string;
};
type PayrollType = "salary" | "advance" | "bonus" | "deduction";
type Payroll = {
  _id: string;
  employeeId: string;
  type: PayrollType;
  amount: number;
  date: string;
  note?: string;
};

// ---------- NEW ADD EMPLOYEE FORM COMPONENT ----------
function AddEmployeeForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    dateOfBirth: "",
    department: "",
    hireDate: today(),
    employmentStatus: "full-time" as const,
    payType: "salary" as const,
    baseSalary: 0,
  });

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    try {
      const employeeData = {
        ...formData,
        employeeId: generateEmployeeId(),
        workingHours: { /* default working hours */ },
        shiftPreferences: [],
        documents: {},
        isActive: true,
      };

      const r = await fetch("/api/Employee/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });

      if (!r.ok) throw new Error(await r.text());

      alert("Employee added successfully!");
      onSuccess(); // Triggers data re-fetch in the parent
      onClose(); // Closes the modal
    } catch (error) {
      alert(`Error: ${error}`);
    }
  }

  return (
    <form onSubmit={addEmployee} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        </div>
        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Input required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
        </div>
        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <Input required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
        </div>
        {/* Employment Status */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
            <Select value={formData.employmentStatus} onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
            </Select>
        </div>
        {/* ... Other form fields follow the same pattern ... */}
      </div>

      {/* ... Other sections of the form (emergency contacts, address) ... */}
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" tone="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Add Employee</Button>
      </div>
    </form>
  );
}

// ---------- main page ----------
export default function EmployeeAdminPage() {
  const { data: employees, mutate: mutateEmp } = useSWR<Employee[]>("/api/Employee/employees", fetcher);
  const [from, setFrom] = useState(shift(-30));
  const [to, setTo] = useState(today());
  const [showAddForm, setShowAddForm] = useState(false); // This now controls the modal
  const [showPayrollForm, setShowPayrollForm] = useState(false);

  // ... (useSWR for payroll, useMemo for totals, and other functions like deleteEmployee, seed, etc. remain here)

  async function deleteEmployee(id: string) {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch("/api/Employee/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      mutateEmp();
      alert("Employee deleted successfully!");
    } catch (error) {
      alert(`Error deleting employee: ${error}`);
    }
  }
  
  // ... The rest of your functions (seed, addPayrollEntry, generateReport) would be here
  
  return (
    <AdminGuard>
      <DashboardLayout>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Employee Management</h1>
            <p className="text-sm text-neutral-500">Manage employees & payroll transactions</p>
          </div>
          <div className="flex gap-2">
            {/* The "Add Employee" button now just opens the modal */}
            <Button onClick={() => setShowAddForm(true)}>Add Employee</Button>
            {/* ... other header buttons */}
          </div>
        </div>

        {/* ... (Filters, Summary Cards, Employee List, and Payroll History sections remain here) */}
        
        {/* The Add Employee Form is now rendered inside the Modal */}
        <Modal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          title="Add New Employee"
        >
          <AddEmployeeForm
            onClose={() => setShowAddForm(false)}
            onSuccess={() => {
              mutateEmp(); // Re-fetches employee data after successful addition
            }}
          />
        </Modal>

        {/* Your other page content like employee table etc. goes here */}
        <section className="mb-8">
          <div className="mb-3 text-lg font-semibold">Employees</div>
          <div className="overflow-hidden rounded-xl border bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="p-3 text-left font-medium">Employee ID</th>
                    <th className="p-3 text-left font-medium">Name</th>
                    <th className="p-3 text-left font-medium">Role</th>
                    <th className="p-3 text-left font-medium">Department</th>
                    <th className="p-3 text-left font-medium">Base Salary</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(employees || []).map((emp) => (
                    <tr key={emp._id} className="border-t">
                      <td className="p-3">{emp.employeeId}</td>
                      <td className="p-3">{emp.name}</td>
                      <td className="p-3">{emp.role}</td>
                      <td className="p-3">{emp.department}</td>
                      <td className="p-3">{fmt.format(emp.baseSalary)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            emp.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {emp.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button
                          tone="danger"
                          onClick={() => deleteEmployee(emp._id)}
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </DashboardLayout>
    </AdminGuard>
  );
}