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

// ----- NEW (helpers for report) -----
function fmtDateHuman(d: string | number | Date) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d ?? "");
  }
}
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
// ----- END NEW -----

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
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  
  // Form states
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

  const [payrollForm, setPayrollForm] = useState({
    employeeId: "",
    type: "salary" as PayrollType,
    amount: 0,
    date: today(),
    note: "",
  });

  const { data: payroll, mutate: mutatePayroll } = useSWR<Payroll[]>(
    () => `/api/Employee/payroll?from=${from}&to=${to}`,
    fetcher
  );

  const totals = useMemo(() => {
    const outflow = (payroll || []).reduce(
      (s: number, p: Payroll) => s + (p.type === "deduction" ? -1 : 1) * p.amount,
      0
    );
    const salaries = (payroll || [])
      .filter((p: Payroll) => p.type === "salary")
      .reduce((s: number, p: Payroll) => s + p.amount, 0);
    const advances = (payroll || [])
      .filter((p: Payroll) => p.type === "advance")
      .reduce((s: number, p: Payroll) => s + p.amount, 0);
    const bonuses = (payroll || [])
      .filter((p: Payroll) => p.type === "bonus")
      .reduce((s: number, p: Payroll) => s + p.amount, 0);
    const deductions = (payroll || [])
      .filter((p: Payroll) => p.type === "deduction")
      .reduce((s: number, p: Payroll) => s + p.amount, 0);
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

  // Add employee function
  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    try {
      const employeeData = {
        ...formData,
        employeeId: generateEmployeeId(),
        workingHours: {
          monday: { start: "09:00", end: "17:00", available: true },
          tuesday: { start: "09:00", end: "17:00", available: true },
          wednesday: { start: "09:00", end: "17:00", available: true },
          thursday: { start: "09:00", end: "17:00", available: true },
          friday: { start: "09:00", end: "17:00", available: true },
          saturday: { start: "09:00", end: "17:00", available: false },
          sunday: { start: "09:00", end: "17:00", available: false },
        },
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
      
      mutateEmp();
      setShowAddForm(false);
      setFormData({
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
        employmentStatus: "full-time",
        payType: "salary",
        baseSalary: 0,
      });
      alert("Employee added successfully!");
    } catch (error) {
      alert(`Error: ${error}`);
    }
  }

  // Add payroll entry function
  async function addPayrollEntry(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await fetch("/api/Employee/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payrollForm),
      });

      if (!r.ok) throw new Error(await r.text());
      
      mutatePayroll();
      setShowPayrollForm(false);
      setPayrollForm({
        employeeId: "",
        type: "salary",
        amount: 0,
        date: today(),
        note: "",
      });
      alert("Payroll entry added successfully!");
    } catch (error) {
      alert(`Error: ${error}`);
    }
  }

  // ----- NEW: Generate Report -----
  async function generateReport() {
    const emps = (employees || []) as Employee[];
    const pays = (payroll || []) as Payroll[];

    const logo = await toDataUrl("/images/RalahamiLogo.png");

    const now = new Date();
    const title = "Employee & Payroll Report";
    const subtitle = `Range: ${from} → ${to} • Generated ${now.toLocaleString()}`;

    const empRows = emps
      .map(
        (e) => `<tr>
          <td>${e.name}</td>
          <td>${e.role}</td>
          <td style="text-align:right">${fmt.format(e.baseSalary)}</td>
        </tr>`
      )
      .join("");

    const payRows = pays
      .map((p) => {
        const emp = emps.find((e) => e._id === p.employeeId);
        const sign = p.type === "deduction" ? "-" : "";
        return `<tr>
          <td>${p.date}</td>
          <td>${emp?.name || p.employeeId}</td>
          <td>${p.type}</td>
          <td style="text-align:right">${sign}${fmt.format(p.amount)}</td>
          <td>${p.note ? p.note.replace(/</g, "&lt;") : "-"}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111827; margin:24px; }
  .header { display:flex; align-items:center; gap:16px; }
  .logo { height:48px; width:auto; }
  .title { font-size:22px; font-weight:700; margin:0; }
  .subtitle { color:#6B7280; margin-top:4px; }
  .cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin:20px 0; }
  .card { border:1px solid #E5E7EB; border-radius:12px; padding:12px; }
  .label { font-size:12px; color:#6B7280; }
  .value { font-size:22px; font-weight:700; margin-top:4px; }
  h2 { font-size:16px; margin:24px 0 8px; }
  table { width:100%; border-collapse: collapse; }
  th, td { border:1px solid #E5E7EB; padding:8px 10px; font-size:12px; }
  thead th { background:#F9FAFB; text-align:left; color:#374151; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ""}
    <div>
      <h1 class="title">${title}</h1>
      <div class="subtitle">${subtitle}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Employees</div><div class="value">${emps.length}</div></div>
    <div class="card"><div class="label">Total Outflow</div><div class="value">${fmt.format(totals.outflow)}</div></div>
    <div class="card"><div class="label">Salaries</div><div class="value">${fmt.format(totals.salaries)}</div></div>
    <div class="card"><div class="label">Advances</div><div class="value">${fmt.format(totals.advances)}</div></div>
    <div class="card"><div class="label">Bonuses</div><div class="value">${fmt.format(totals.bonuses)}</div></div>
    <div class="card"><div class="label">Deductions</div><div class="value">${fmt.format(totals.deductions)}</div></div>
  </div>

  <h2>Employees</h2>
  <table>
    <thead><tr><th>Name</th><th>Role</th><th style="text-align:right">Base Salary</th></tr></thead>
    <tbody>${empRows || `<tr><td colspan="3">No employees</td></tr>`}</tbody>
  </table>

  <h2 style="margin-top:24px">Payroll (${from} → ${to})</h2>
  <table>
    <thead>
      <tr>
        <th style="width:120px">Date</th>
        <th>Employee</th>
        <th style="width:110px">Type</th>
        <th style="width:130px; text-align:right">Amount</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>${payRows || `<tr><td colspan="5">No transactions in range</td></tr>`}</tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    a.href = urlObj;
    a.download = `employee-payroll-report_${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(urlObj);
  }
  // ----- END NEW -----

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
            <Button tone="ghost" onClick={() => setShowPayrollForm(!showPayrollForm)}>
              {showPayrollForm ? 'Cancel' : 'Add Payroll'}
            </Button>
            <Button onClick={generateReport}>Generate Report</Button>
          </div>
        </div>
        {/* NEW: add Generate Report button next to Seed */}
        <div className="flex gap-2">
          <Button tone="ghost" onClick={generateReport}>Generate Report</Button>
          {/* <Button tone="ghost" onClick={seed}>Seed Dummy DB</Button> */}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <Input
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <Input
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                  <Select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label>
                  <Select
                    value={formData.payType}
                    onChange={(e) => setFormData({ ...formData, payType: e.target.value as any })}
                  >
                    <option value="salary">Salary</option>
                    <option value="hourly">Hourly</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
                  <Input
                    type="number"
                    required
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <Input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <Input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label>
                  <Input
                    required
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label>
                  <Input
                    required
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <Textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" tone="ghost" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Employee
                </Button>
              </div>
            </form>
          </section>
        )}

        {/* Add Payroll Form */}
        {showPayrollForm && (
          <section className="mb-8">
            <div className="mb-3 text-lg font-semibold">Add Payroll Entry</div>
            <form onSubmit={addPayrollEntry} className="bg-white shadow rounded-xl p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <Select
                    required
                    value={payrollForm.employeeId}
                    onChange={(e) => setPayrollForm({ ...payrollForm, employeeId: e.target.value })}
                  >
                    <option value="">Select Employee</option>
                    {(employees || []).map((emp) => (
                      <option key={emp._id} value={emp.employeeId}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <Select
                    value={payrollForm.type}
                    onChange={(e) => setPayrollForm({ ...payrollForm, type: e.target.value as PayrollType })}
                  >
                    <option value="salary">Salary</option>
                    <option value="bonus">Bonus</option>
                    <option value="advance">Advance</option>
                    <option value="deduction">Deduction</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <Input
                    type="number"
                    required
                    value={payrollForm.amount}
                    onChange={(e) => setPayrollForm({ ...payrollForm, amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <Input
                    type="date"
                    required
                    value={payrollForm.date}
                    onChange={(e) => setPayrollForm({ ...payrollForm, date: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <Input
                  value={payrollForm.note}
                  onChange={(e) => setPayrollForm({ ...payrollForm, note: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" tone="ghost" onClick={() => setShowPayrollForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Payroll Entry
                </Button>
              </div>
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
                  {(employees || []).map((emp: Employee) => (
                    <tr key={emp._id} className="border-t">
                      <td className="p-3">{emp.employeeId}</td>
                      <td className="p-3">{emp.name}</td>
                      <td className="p-3">{emp.role}</td>
                      <td className="p-3">{emp.department}</td>
                      <td className="p-3">{fmt.format(emp.baseSalary)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          emp.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {emp.isActive ? 'Active' : 'Inactive'}
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
                  {(employees || []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-neutral-500">
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
          <div className="mb-3 text-lg font-semibold">Payroll History</div>
          <div className="overflow-hidden rounded-xl border bg-white shadow">
            <div className="overflow-x-auto">
              <table id="payroll-table" className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="p-3 text-left font-medium">Date</th>
                    <th className="p-3 text-left font-medium">Employee ID</th>
                    <th className="p-3 text-left font-medium">Type</th>
                    <th className="p-3 text-left font-medium">Amount</th>
                    <th className="p-3 text-left font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(payroll || []).map((entry: Payroll) => (
                    <tr key={entry._id} className="border-t">
                      <td className="p-3">{entry.date}</td>
                      <td className="p-3">{entry.employeeId}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                          entry.type === 'salary' ? 'bg-blue-100 text-blue-800' :
                          entry.type === 'bonus' ? 'bg-green-100 text-green-800' :
                          entry.type === 'advance' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="p-3">{fmt.format(entry.amount)}</td>
                      <td className="p-3">{entry.note || '-'}</td>
                    </tr>
                  ))}
                  {(payroll || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-neutral-500">
                        No payroll entries for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </DashboardLayout>
    </AdminGuard>
  );
}