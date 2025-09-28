/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useSession, signIn } from "next-auth/react";
import AdminGuard from "../components/AdminGuard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

// ---------- types ----------
type Employee = {
  _id: string;
  name: string;
  role: string;
  employeeId: string;
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  dateOfBirth: string;
  department: string;
  hireDate: string;
  employmentStatus: "full-time" | "part-time" | "contract";
  payType: "salary" | "hourly";
  baseSalary: number;
  workingHours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  shiftPreferences: string[];
  documents: {
    idCopy?: string;
    certifications?: string[];
    contract?: string;
  };
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

// ---------- main ----------
export default function EmployeeAdminPage() {
  const { data: employees, mutate: mutateEmp } = useSWR<Employee[]>(
    "/api/Employee/employees",
    fetcher
  );
  const [from, setFrom] = useState(shift(-30));
  const [to, setTo] = useState(today());
  const [showAddForm, setShowAddForm] = useState(false);
  const { data: payroll, mutate: mutatePayroll } = useSWR<Payroll[]>(
    () => `/api/Employee/payroll?from=${from}&to=${to}`,
    fetcher
  );

  const totals = useMemo(() => {
    const outflow = (payroll || []).reduce(
      (s, p) => s + (p.type === "deduction" ? -1 : 1) * p.amount,
      0
    );
    const salaries = (payroll || [])
      .filter((p) => p.type === "salary")
      .reduce((s, p) => s + p.amount, 0);
    const advances = (payroll || [])
      .filter((p) => p.type === "advance")
      .reduce((s, p) => s + p.amount, 0);
    const bonuses = (payroll || [])
      .filter((p) => p.type === "bonus")
      .reduce((s, p) => s + p.amount, 0);
    const deductions = (payroll || [])
      .filter((p) => p.type === "deduction")
      .reduce((s, p) => s + p.amount, 0);
    return { outflow, salaries, advances, bonuses, deductions };
  }, [payroll]);

  // --- actions ---
  async function seed() {
    if (!confirm("Reset & seed employees + payroll?")) return;
    const r = await fetch("/api/Employee/employees/seed", { method: "POST" });
    if (!r.ok) return alert(await r.text());
    mutateEmp();
    mutatePayroll();
    alert("Seeded!");
  }

  // New function to generate the report as a PDF
  const generateReport = async () => {
    // Fetch employee and payroll data
    const responseEmp = await fetch("/api/Employee/employees");
    const employees = await responseEmp.json();

    const responsePayroll = await fetch(`/api/Employee/payroll?from=${from}&to=${to}`);
    const payroll = await responsePayroll.json();

    // Calculate total payroll for the report
    const totalSalary = payroll.filter((p) => p.type === "salary").reduce((sum, p) => sum + p.amount, 0);
    const totalBonus = payroll.filter((p) => p.type === "bonus").reduce((sum, p) => sum + p.amount, 0);
    const totalAdvances = payroll.filter((p) => p.type === "advance").reduce((sum, p) => sum + p.amount, 0);
    const totalDeductions = payroll.filter((p) => p.type === "deduction").reduce((sum, p) => sum + p.amount, 0);

    // Create PDF document
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Employee Management Summary Report", 20, 20);

    // Add Summary Information
    doc.setFontSize(12);
    doc.text(`Total Employees: ${employees.length}`, 20, 30);
    doc.text(`Total Salary: LKR ${totalSalary.toLocaleString()}`, 20, 40);
    doc.text(`Total Bonus: LKR ${totalBonus.toLocaleString()}`, 20, 50);
    doc.text(`Total Advances: LKR ${totalAdvances.toLocaleString()}`, 20, 60);
    doc.text(`Total Deductions: LKR ${totalDeductions.toLocaleString()}`, 20, 70);

    // Add Employee List to the Report (If needed)
    doc.text("Employee List:", 20, 90);
    employees.forEach((emp, index) => {
      doc.text(`${index + 1}. ${emp.name} - ${emp.role} - ${emp.salary}`, 20, 100 + index * 10);
    });

    // Use html2canvas to add payroll data (can be a table or charts)
    const payrollTable = document.getElementById("payroll-table");
    if (payrollTable) {
      const canvas = await html2canvas(payrollTable);
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 20, 120, 180, 160);
    }

    // Save the generated PDF
    doc.save("employee_report.pdf");
  };

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
            <Button tone="ghost" onClick={seed}>
              Seed Dummy DB
            </Button>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Employee'}
            </Button>
            <Button onClick={generateReport}>Generate Report</Button> {/* New Button */}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-8 flex flex-wrap gap-3 items-center">
          <label className="text-sm text-neutral-600">From</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-[160px]"
          />
          <label className="text-sm text-neutral-600">To</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-[160px]"
          />
        </div>

        {/* Summary */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <StatCard title="Total Employees" value={(employees || []).filter(e => e.isActive).length} />
          <StatCard title="Total Outflow" value={fmt.format(totals.outflow)} />
          <StatCard title="Salaries" value={fmt.format(totals.salaries)} />
          <StatCard title="Advances" value={fmt.format(totals.advances)} />
          <StatCard title="Bonuses" value={fmt.format(totals.bonuses)} />
        </div>

        {/* Add Employee Form */}
        {showAddForm && (
          <section className="mb-8">
            <div className="mb-3 text-lg font-semibold">Add Employee</div>
            <form onSubmit={addEmployee} className="bg-white shadow rounded-xl p-6 space-y-6">
              {/* Existing Form Content */}
            </form>
          </section>
        )}

        {/* Employee list */}
        <section className="mb-8">
          <div className="mb-3 text-lg font-semibold">Employees</div>
          <div className="overflow-hidden rounded-xl border bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    {/* Table Headers */}
                  </tr>
                </thead>
                <tbody>
                  {(employees || []).map((e) => (
                    <tr key={e._id} className="border-t">
                      {/* Employee Table Rows */}
                    </tr>
                  ))}
                  {(employees || []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-neutral-500">
                        No employees yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Payroll history */}
        <section>
          {/* Payroll History Table */}
        </section>
      </DashboardLayout>
    </AdminGuard>
  );
}
