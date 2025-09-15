/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";

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

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const cls = {
  input:
    "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10",
  btn: "rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 active:scale-[.98]",
  btnGhost:
    "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50",
  card: "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
};

const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

const today = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function EmployeeAdminPage() {
  // ✅ updated API paths
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
    const formEl = e.currentTarget; 
    const fd = new FormData(formEl);
    const body = {
      name: (fd.get("name") || "").toString().trim(),
      role: (fd.get("role") || "").toString().trim(),
      baseSalary: Number(fd.get("baseSalary")),
    };
    if (!body.name || !body.role || isNaN(body.baseSalary))
      return alert("Fill all fields");
    if (body.baseSalary < 0) return alert("Base salary must be positive");
    const r = await fetch("/api/Employee/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    formEl.reset(); 
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
    const formEl = e.currentTarget; 
    const fd = new FormData(formEl);
    const body: any = {
      employeeId: fd.get("employeeId")?.toString(),
      type: fd.get("type")?.toString(),
      amount: Number(fd.get("amount")),
      date: fd.get("date")?.toString(),
      note: fd.get("note")?.toString() || "",
    };
    if (!body.employeeId || !body.type || !body.amount || !body.date)
      return alert("Fill all fields");
    if (body.amount <= 0) return alert("Amount must be positive");
    const r = await fetch("/api/Employee/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    formEl.reset();
    mutatePayroll();
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Admin</h1>
          <p className="text-sm text-neutral-600">
            Manage employees and record payroll transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={seed} className={cls.btnGhost}>
            Seed Dummy DB
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className={cls.card}>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={cls.input + " w-[160px]"}
          />
          <label className="ml-2 text-sm text-neutral-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={cls.input + " w-[160px]"}
          />
        </div>
      </div>

      {/* Summary */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">
          Payroll Summary (selected range)
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="Total Outflow" value={fmt.format(totals.outflow)} />
          <Stat title="Salaries" value={fmt.format(totals.salaries)} />
          <Stat title="Advances" value={fmt.format(totals.advances)} />
          <Stat title="Bonuses" value={fmt.format(totals.bonuses)} />
          <Stat title="Deductions" value={fmt.format(totals.deductions)} />
        </div>
      </section>

      {/* Add Employee */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">Add Employee</div>
        <form
          onSubmit={addEmployee}
          className={cls.card + " grid gap-2 sm:grid-cols-5"}
        >
          <input name="name" placeholder="Full name" className={cls.input} />
          <input
            name="role"
            placeholder="Role (e.g., Chef)"
            className={cls.input}
          />
          <input
            name="baseSalary"
            placeholder="Base Salary (LKR)"
            inputMode="numeric"
            className={cls.input}
          />
          <button className={cls.btn + " sm:col-span-1"}>Add</button>
        </form>
      </section>

      {/* Employee list */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">Employees</div>
        <div className={cls.card}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">Name</th>
                <th>Role</th>
                <th>Base Salary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(employees || []).map((e) => (
                <tr key={e._id} className="border-t">
                  <td className="py-2">{e.name}</td>
                  <td>{e.role}</td>
                  <td>{fmt.format(e.baseSalary)}</td>
                  <td className="text-right">
                    <button
                      onClick={() => deleteEmployee(e._id)}
                      className={cls.btnGhost}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {(employees || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-neutral-500">
                    No employees yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Record payroll */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">
          Record Payroll Transaction
        </div>
        <form
          onSubmit={recordPayroll}
          className={cls.card + " grid gap-2 sm:grid-cols-6"}
        >
          <input
            name="date"
            type="date"
            defaultValue={today()}
            className={cls.input}
          />
          <select name="employeeId" className={cls.input + " sm:col-span-2"}>
            <option value="">Select Employee</option>
            {(employees || []).map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} — {e.role}
              </option>
            ))}
          </select>
          <select name="type" className={cls.input}>
            <option value="salary">Salary</option>
            <option value="advance">Advance</option>
            <option value="bonus">Bonus</option>
            <option value="deduction">Deduction</option>
          </select>
          <input
            name="amount"
            placeholder="Amount (LKR)"
            inputMode="numeric"
            className={cls.input}
          />
          <input
            name="note"
            placeholder="Note (optional)"
            className={cls.input + " sm:col-span-2"}
          />
          <button className={cls.btn}>Add Payroll</button>
        </form>
      </section>

      {/* History */}
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">
          Payroll History (range)
        </div>
        <div className={cls.card}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">Date</th>
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
                    <td className="py-2">{p.date}</td>
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
                  <td className="py-2 text-neutral-500" colSpan={5}>
                    No transactions in range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
