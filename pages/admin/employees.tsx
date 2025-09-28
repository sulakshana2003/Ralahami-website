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
          <p className="text-sm text-neutral-500">
            Manage employees & payroll transactions
          </p>
        </div>
        {/* NEW: add Generate Report button next to Seed */}
        <div className="flex gap-2">
          <Button tone="ghost" onClick={generateReport}>Generate Report</Button>
          {/* <Button tone="ghost" onClick={seed}>Seed Dummy DB</Button> */}
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
