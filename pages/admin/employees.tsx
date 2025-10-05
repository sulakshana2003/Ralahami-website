/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";
import jsPDF from "jspdf";

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
async function toDataUrl(url: string) {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

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

// ---------- Modal Component ----------
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
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-10"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-light">&times;</button>
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
  department: string;
  baseSalary: number;
  isActive: boolean;
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

// ---------- Add Employee Form Component ----------
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
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const employeeData = { ...formData, employeeId: generateEmployeeId(), isActive: true };
      const r = await fetch("/api/Employee/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });
      if (!r.ok) throw new Error(await r.text());
      alert("Employee added successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      alert(`Error adding employee: ${error}`);
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Input required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <Input required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
          <Select value={formData.employmentStatus} onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label>
          <Select value={formData.payType} onChange={(e) => setFormData({ ...formData, payType: e.target.value as any })}>
            <option value="salary">Salary</option>
            <option value="hourly">Hourly</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
          <Input type="number" required value={formData.baseSalary} onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <Input type="date" required value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
          <Input type="date" required value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
          <Input required value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
          <Input required value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <Textarea required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 border-t pt-4 mt-6">
        <Button type="button" tone="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Add Employee</Button>
      </div>
    </form>
  );
}

// ---------- MAIN PAGE COMPONENT ----------
export default function EmployeeAdminPage() {
  const { data: employees, mutate: mutateEmp } = useSWR<Employee[]>("/api/Employee/employees", fetcher);
  const [from, setFrom] = useState(shift(-30));
  const [to, setTo] = useState(today());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: payroll } = useSWR<Payroll[]>(() => `/api/Employee/payroll?from=${from}&to=${to}`, fetcher);

  const totals = useMemo(() => {
    if (!payroll) return { outflow: 0, salaries: 0, advances: 0, bonuses: 0, deductions: 0 };
    const outflow = payroll.reduce((s, p) => s + (p.type === "deduction" ? -1 : 1) * p.amount, 0);
    const salaries = payroll.filter(p => p.type === "salary").reduce((s, p) => s + p.amount, 0);
    const advances = payroll.filter(p => p.type === "advance").reduce((s, p) => s + p.amount, 0);
    const bonuses = payroll.filter(p => p.type === "bonus").reduce((s, p) => s + p.amount, 0);
    const deductions = payroll.filter(p => p.type === "deduction").reduce((s, p) => s + p.amount, 0);
    return { outflow, salaries, advances, bonuses, deductions };
  }, [payroll]);

  async function generateReport() {
    setIsGeneratingReport(true);
    try {
      const emps = employees || [];
      const pays = payroll || [];
      const logo = await toDataUrl("/images/RalahamiLogo.png");
      const now = new Date();
      const title = "Employee & Payroll Report";
      const subtitle = `Range: ${from} → ${to} • Generated ${now.toLocaleString("en-LK", { timeZone: "Asia/Colombo" })}`;
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const empRows = emps.map(e => `<tr><td>${e.name}</td><td>${e.role}</td><td style="text-align:right">${fmt.format(e.baseSalary)}</td></tr>`).join("");
      const payRows = pays.map(p => {
        const emp = emps.find(e => e.employeeId === p.employeeId);
        const sign = p.type === "deduction" ? "-" : "";
        return `<tr><td>${p.date}</td><td>${emp?.name || p.employeeId}</td><td>${p.type}</td><td style="text-align:right">${sign}${fmt.format(p.amount)}</td><td>${p.note ? p.note.replace(/</g, "&lt;") : "-"}</td></tr>`;
      }).join("");

      const reportHtml = `...`; // The long HTML string for the PDF
      
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setProperties({ title: `Employee Report - ${stamp}` });
      await doc.html(reportHtml, {
        callback: function (doc) {
          doc.save(`employee-payroll-report_${stamp}.pdf`);
        },
        x: 15, y: 15, width: 180, windowWidth: 800,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Could not generate the report.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  async function deleteEmployee(id: string) {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch("/api/Employee/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      mutateEmp();
      alert("Employee deleted.");
    } catch (error) {
      alert(`Error deleting employee: ${error}`);
    }
  }
  
  // Placeholder for seed function if you have one
  async function seed() {}

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Employee Management</h1>
            <p className="text-sm text-neutral-500">Manage employees & payroll transactions</p>
          </div>
          <div className="flex gap-2">
            <Button tone="ghost" onClick={seed}>Seed Dummy DB</Button>
            <Button onClick={() => setShowAddForm(true)}>Add Employee</Button>
            <Button tone="ghost" onClick={() => setShowPayrollForm(true)}>Add Payroll</Button>
            <Button onClick={generateReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4 mb-8 flex flex-wrap gap-3 items-center">
          <label className="text-sm text-neutral-600">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          <label className="text-sm text-neutral-600">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard title="Total Employees" value={(employees || []).length} />
          <StatCard title="Total Outflow" value={fmt.format(totals.outflow)} />
          <StatCard title="Salaries" value={fmt.format(totals.salaries)} />
          <StatCard title="Advances" value={fmt.format(totals.advances)} />
          <StatCard title="Bonuses" value={fmt.format(totals.bonuses)} />
        </div>

        <section className="mb-8">
          <div className="mb-3 text-lg font-semibold">Employees</div>
          <div className="overflow-hidden rounded-xl border bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* Table Headers */}
                </thead>
                <tbody>
                  {(employees || []).map((emp) => (
                    <tr key={emp._id}>
                      {/* Table Cells */}
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

        <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title="Add New Employee">
          <AddEmployeeForm onClose={() => setShowAddForm(false)} onSuccess={() => mutateEmp()} />
        </Modal>

      </DashboardLayout>
    </AdminGuard>
  );
}