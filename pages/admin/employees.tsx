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
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

// ---------- types ----------
type Employee = { _id: string; name: string; role: string; baseSalary: number };
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
    const body = {
      name: fd.get("name")?.toString().trim(),
      role: fd.get("role")?.toString().trim(),
      baseSalary: Number(fd.get("baseSalary")),
    };
    const r = await fetch("/api/Employee/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    e.currentTarget.reset();
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
        <Button tone="ghost" onClick={seed}>
          Seed Dummy DB
        </Button>
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
        <StatCard title="Total Outflow" value={fmt.format(totals.outflow)} />
        <StatCard title="Salaries" value={fmt.format(totals.salaries)} />
        <StatCard title="Advances" value={fmt.format(totals.advances)} />
        <StatCard title="Bonuses" value={fmt.format(totals.bonuses)} />
        <StatCard title="Deductions" value={fmt.format(totals.deductions)} />
      </div>

      {/* Add Employee */}
      <section className="mb-8">
        <div className="mb-3 text-lg font-semibold">Add Employee</div>
        <form
          onSubmit={addEmployee}
          className="grid gap-3 sm:grid-cols-4 bg-white shadow rounded-xl p-4"
        >
          <Input name="name" placeholder="Full name" required />
          <Input name="role" placeholder="Role (e.g., Chef)" required />
          <Input
            name="baseSalary"
            placeholder="Base Salary (LKR)"
            type="number"
            required
          />
          <Button>Add</Button>
        </form>
      </section>

      {/* Employee list */}
      <section className="mb-8">
        <div className="mb-3 text-lg font-semibold">Employees</div>
        <div className="overflow-hidden rounded-xl border bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th>Role</th>
                <th>Base Salary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(employees || []).map((e) => (
                <tr key={e._id} className="border-t">
                  <td className="px-4 py-3">{e.name}</td>
                  <td>{e.role}</td>
                  <td>{fmt.format(e.baseSalary)}</td>
                  <td className="text-right">
                    <Button tone="danger" onClick={() => deleteEmployee(e._id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {(employees || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-neutral-500">
                    No employees yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
