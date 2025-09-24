/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useSession, signIn } from "next-auth/react";
import AdminGuard from "../components/AdminGuard"

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
  employmentStatus: 'full-time' | 'part-time' | 'contract';
  payType: 'salary' | 'hourly';
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
  
  async function addEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    // Build working hours object
    const workingHours = {
      monday: { 
        start: fd.get("monday-start")?.toString() || "09:00", 
        end: fd.get("monday-end")?.toString() || "17:00", 
        available: fd.get("monday-available") === "on" 
      },
      tuesday: { 
        start: fd.get("tuesday-start")?.toString() || "09:00", 
        end: fd.get("tuesday-end")?.toString() || "17:00", 
        available: fd.get("tuesday-available") === "on" 
      },
      wednesday: { 
        start: fd.get("wednesday-start")?.toString() || "09:00", 
        end: fd.get("wednesday-end")?.toString() || "17:00", 
        available: fd.get("wednesday-available") === "on" 
      },
      thursday: { 
        start: fd.get("thursday-start")?.toString() || "09:00", 
        end: fd.get("thursday-end")?.toString() || "17:00", 
        available: fd.get("thursday-available") === "on" 
      },
      friday: { 
        start: fd.get("friday-start")?.toString() || "09:00", 
        end: fd.get("friday-end")?.toString() || "17:00", 
        available: fd.get("friday-available") === "on" 
      },
      saturday: { 
        start: fd.get("saturday-start")?.toString() || "09:00", 
        end: fd.get("saturday-end")?.toString() || "17:00", 
        available: fd.get("saturday-available") === "on" 
      },
      sunday: { 
        start: fd.get("sunday-start")?.toString() || "09:00", 
        end: fd.get("sunday-end")?.toString() || "17:00", 
        available: fd.get("sunday-available") === "on" 
      }
    };

    const shiftPreferences = fd.get("shiftPreferences")?.toString().split(',').map(s => s.trim()).filter(Boolean) || [];
    
    const body = {
      name: fd.get("name")?.toString().trim(),
      role: fd.get("role")?.toString().trim(),
      employeeId: fd.get("employeeId")?.toString().trim(),
      phone: fd.get("phone")?.toString().trim(),
      email: fd.get("email")?.toString().trim(),
      address: fd.get("address")?.toString().trim(),
      emergencyContactName: fd.get("emergencyContactName")?.toString().trim(),
      emergencyContactPhone: fd.get("emergencyContactPhone")?.toString().trim(),
      dateOfBirth: fd.get("dateOfBirth")?.toString(),
      department: fd.get("department")?.toString().trim(),
      hireDate: fd.get("hireDate")?.toString(),
      employmentStatus: fd.get("employmentStatus")?.toString(),
      payType: fd.get("payType")?.toString(),
      baseSalary: Number(fd.get("baseSalary")),
      workingHours,
      shiftPreferences,
      documents: {
        idCopy: fd.get("idCopy")?.toString().trim() || '',
        certifications: fd.get("certifications")?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
        contract: fd.get("contract")?.toString().trim() || ''
      },
      isActive: true
    };
    
    const r = await fetch("/api/Employee/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    e.currentTarget.reset();
    setShowAddForm(false);
    mutateEmp();
  }
  
  async function deleteEmployee(id: string) {
    if (!confirm("Delete this employee?")) return;
    const r = await fetch(`/api/Employee/employees?id=${id}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert(await r.text());
    mutateEmp();
  }
  async function recordPayroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: any = {
      employeeId: fd.get("employeeId")?.toString(),
      type: fd.get("type")?.toString(),
      amount: Number(fd.get("amount")),
      date: fd.get("date")?.toString(),
      note: fd.get("note")?.toString() || "",
    };
    const r = await fetch("/api/Employee/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    e.currentTarget.reset();
    mutatePayroll();
  }

  return (
    <AdminGuard>
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-sm text-neutral-500">
            Manage employees & payroll transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button tone="ghost" onClick={seed}>
            Seed Dummy DB
          </Button>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add Employee'}
          </Button>
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
          <form
            onSubmit={addEmployee}
            className="bg-white shadow rounded-xl p-6 space-y-6"
          >
            {/* Basic Information */}
            <div className="border-b pb-4">
              <h3 className="text-md font-semibold mb-4 text-indigo-600">Basic Information</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input name="name" placeholder="Full name" required />
                <Input name="role" placeholder="Role (e.g., Chef)" required />
                <Input name="employeeId" placeholder="Employee ID" defaultValue={generateEmployeeId()} required />
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-b pb-4">
              <h3 className="text-md font-semibold mb-4 text-indigo-600">Contact Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="phone" type="tel" placeholder="Phone number" required />
                <Input name="email" type="email" placeholder="Email address" required />
                <div className="sm:col-span-2">
                  <Textarea name="address" placeholder="Address" rows={2} required />
                </div>
                <Input name="emergencyContactName" placeholder="Emergency contact name" required />
                <Input name="emergencyContactPhone" type="tel" placeholder="Emergency contact phone" required />
              </div>
            </div>

            {/* Personal Details */}
            <div className="border-b pb-4">
              <h3 className="text-md font-semibold mb-4 text-indigo-600">Personal Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="dateOfBirth" type="date" required />
                <Input name="department" placeholder="Department" required />
              </div>
            </div>

            {/* Employment Details */}
            <div className="border-b pb-4">
              <h3 className="text-md font-semibold mb-4 text-indigo-600">Employment Details</h3>
              <div className="grid gap-4 sm:grid-cols-4">
                <Input name="hireDate" type="date" defaultValue={today()} required />
                <Select name="employmentStatus" required>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                </Select>
                <Select name="payType" required>
                  <option value="salary">Monthly Salary</option>
                  <option value="hourly">Hourly Rate</option>
                </Select>
                <Input name="baseSalary" type="number" placeholder="Base Salary/Rate (LKR)" required />
              </div>
            </div>

            {/* Working Hours & Availability */}
            <div className="border-b pb-4">
              <h3 className="text-md font-semibold mb-4 text-indigo-600">Working Hours & Availability</h3>
              <div className="space-y-3">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                  <div key={day} className="grid grid-cols-5 gap-2 items-center">
                    <label className="text-sm capitalize font-medium">{day}</label>
                    <label className="flex items-center gap-2 text-sm">
                      <input 
                        type="checkbox" 
                        name={`${day}-available`}
                        defaultChecked={!['saturday', 'sunday'].includes(day)}
                        className="rounded"
                      />
                      Available
                    </label>
                    <div className="flex items-center gap-1">
                      <Input 
                        name={`${day}-start`} 
                        type="time" 
                        defaultValue="09:00"
                        className="text-xs"
                      />
                    </div>
                    <span className="text-center text-sm">to</span>
                    <div className="flex items-center gap-1">
                      <Input 
                        name={`${day}-end`} 
                        type="time" 
                        defaultValue="17:00"
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Input 
                  name="shiftPreferences" 
                  placeholder="Shift preferences (comma-separated: morning, evening, night)" 
                />
              </div>
            </div>

            {/* Documents */}
            <div>
              <h3 className="text-md font-semibold mb-4 text-indigo-600">Documents</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input name="idCopy" placeholder="ID copy (file path/URL)" />
                <Input name="certifications" placeholder="Certifications (comma-separated)" />
                <Input name="contract" placeholder="Contract (file path/URL)" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" tone="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Employee</Button>
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
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Salary</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(employees || []).map((e) => (
                  <tr key={e._id} className="border-t">
                    <td className="px-4 py-3 text-xs font-mono">{e.employeeId}</td>
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3">{e.role}</td>
                    <td className="px-4 py-3">{e.department}</td>
                    <td className="px-4 py-3">{e.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        e.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {e.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fmt.format(e.baseSalary)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button tone="danger" onClick={() => deleteEmployee(e._id)}>
                        Delete
                      </Button>
                    </td>
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

      {/* Record payroll */}
      <section className="mb-8">
        <div className="mb-3 text-lg font-semibold">
          Record Payroll Transaction
        </div>
        <form
          onSubmit={recordPayroll}
          className="grid gap-3 sm:grid-cols-6 bg-white shadow rounded-xl p-4"
        >
          <Input type="date" name="date" defaultValue={today()} />
          <Select name="employeeId" className="sm:col-span-2">
            <option value="">Select Employee</option>
            {(employees || []).map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} — {e.role}
              </option>
            ))}
          </Select>
          <Select name="type">
            <option value="salary">Salary</option>
            <option value="advance">Advance</option>
            <option value="bonus">Bonus</option>
            <option value="deduction">Deduction</option>
          </Select>
          <Input
            name="amount"
            placeholder="Amount (LKR)"
            type="number"
            required
          />
          <Input
            name="note"
            placeholder="Note (optional)"
            className="sm:col-span-2"
          />
          <Button>Record</Button>
        </form>
      </section>

      {/* Payroll history */}
      <section>
        <div className="mb-3 text-lg font-semibold">Payroll History</div>
        <div className="overflow-hidden rounded-xl border bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(payroll || []).map((p) => {
                const emp = (employees || []).find(
                  (e) => e._id === p.employeeId
                );
                const sign = p.type === "deduction" ? "-" : "";
                return (
                  <tr key={p._id} className="border-t">
                    <td className="px-4 py-3">{p.date}</td>
                    <td>{emp?.name || p.employeeId}</td>
                    <td>{p.type}</td>
                    <td
                      className={
                        p.type === "deduction"
                          ? "text-green-700"
                          : "text-red-700"
                      }
                    >
                      {sign}
                      {fmt.format(p.amount)}
                    </td>
                    <td>{p.note || "-"}</td>
                  </tr>
                );
              })}
              {(payroll || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-neutral-500">
                    No transactions in range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
    </AdminGuard>
  );
}