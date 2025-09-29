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

  // Delete employee function
  async function deleteEmployee(employeeId: string) {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const r = await fetch(`/api/Employee/employees/${employeeId}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error(await r.text());
      mutateEmp();
      alert("Employee deleted successfully!");
    } catch (error) {
      alert(`Error: ${error}`);
    }
  }

  // New function to generate the report as a PDF
  const generateReport = async () => {
    try {
      // Fetch employee and payroll data
      const responseEmp = await fetch("/api/Employee/employees");
      const employeesData = await responseEmp.json();

      const responsePayroll = await fetch(`/api/Employee/payroll?from=${from}&to=${to}`);
      const payrollData = await responsePayroll.json();

      // Calculate total payroll for the report with proper typing
      const totalSalary = payrollData.filter((p: Payroll) => p.type === "salary").reduce((sum: number, p: Payroll) => sum + p.amount, 0);
      const totalBonus = payrollData.filter((p: Payroll) => p.type === "bonus").reduce((sum: number, p: Payroll) => sum + p.amount, 0);
      const totalAdvances = payrollData.filter((p: Payroll) => p.type === "advance").reduce((sum: number, p: Payroll) => sum + p.amount, 0);
      const totalDeductions = payrollData.filter((p: Payroll) => p.type === "deduction").reduce((sum: number, p: Payroll) => sum + p.amount, 0);

      // Create PDF document
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Employee Management Summary Report", 20, 20);

      // Add Summary Information
      doc.setFontSize(12);
      doc.text(`Report Period: ${from} to ${to}`, 20, 35);
      doc.text(`Total Employees: ${employeesData.length}`, 20, 45);
      doc.text(`Total Salary: LKR ${totalSalary.toLocaleString()}`, 20, 55);
      doc.text(`Total Bonus: LKR ${totalBonus.toLocaleString()}`, 20, 65);
      doc.text(`Total Advances: LKR ${totalAdvances.toLocaleString()}`, 20, 75);
      doc.text(`Total Deductions: LKR ${totalDeductions.toLocaleString()}`, 20, 85);

      // Add Employee List to the Report
      doc.text("Employee List:", 20, 105);
      employeesData.forEach((emp: Employee, index: number) => {
        if (index < 15) { // Limit to prevent overflow
          doc.text(`${index + 1}. ${emp.name} - ${emp.role} - LKR ${emp.baseSalary.toLocaleString()}`, 20, 115 + index * 8);
        }
      });

      // Use html2canvas to add payroll data if table exists
      const payrollTable = document.getElementById("payroll-table");
      if (payrollTable) {
        try {
          const canvas = await html2canvas(payrollTable);
          const imgData = canvas.toDataURL("image/png");
          doc.addPage();
          doc.text("Payroll Details:", 20, 20);
          doc.addImage(imgData, "PNG", 20, 30, 170, 100);
        } catch (error) {
          console.log("Could not capture payroll table:", error);
        }
      }

      // Save the generated PDF
      doc.save(`employee_report_${from}_to_${to}.pdf`);
    } catch (error) {
      alert(`Error generating report: ${error}`);
    }
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
            <Button tone="ghost" onClick={() => setShowPayrollForm(!showPayrollForm)}>
              {showPayrollForm ? 'Cancel' : 'Add Payroll'}
            </Button>
            <Button onClick={generateReport}>Generate Report</Button>
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