/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useMemo, useState, useRef } from "react";
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

  // --- form ref ---
  const formRef = useRef<HTMLFormElement>(null);

  async function addEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Build working hours object
    const workingHours = {
      monday: {
        start: fd.get("monday-start")?.toString() || "09:00",
        end: fd.get("monday-end")?.toString() || "17:00",
        available: fd.get("monday-available") === "on",
      },
      tuesday: {
        start: fd.get("tuesday-start")?.toString() || "09:00",
        end: fd.get("tuesday-end")?.toString() || "17:00",
        available: fd.get("tuesday-available") === "on",
      },
      wednesday: {
        start: fd.get("wednesday-start")?.toString() || "09:00",
        end: fd.get("wednesday-end")?.toString() || "17:00",
        available: fd.get("wednesday-available") === "on",
      },
      thursday: {
        start: fd.get("thursday-start")?.toString() || "09:00",
        end: fd.get("thursday-end")?.toString() || "17:00",
        available: fd.get("thursday-available") === "on",
      },
      friday: {
        start: fd.get("friday-start")?.toString() || "09:00",
        end: fd.get("friday-end")?.toString() || "17:00",
        available: fd.get("friday-available") === "on",
      },
      saturday: {
        start: fd.get("saturday-start")?.toString() || "09:00",
        end: fd.get("saturday-end")?.toString() || "17:00",
        available: fd.get("saturday-available") === "on",
      },
      sunday: {
        start: fd.get("sunday-start")?.toString() || "09:00",
        end: fd.get("sunday-end")?.toString() || "17:00",
        available: fd.get("sunday-available") === "on",
      },
    };

    const shiftPreferences =
      fd.get("shiftPreferences")
        ?.toString()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) || [];

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
        idCopy: fd.get("idCopy")?.toString().trim() || "",
        certifications:
          fd
            .get("certifications")
            ?.toString()
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean) || [],
        contract: fd.get("contract")?.toString().trim() || "",
      },
      isActive: true,
    };

    const r = await fetch("/api/Employee/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());

    // ✅ Use the form ref to reset safely
    if (formRef.current) {
      formRef.current.reset();
    }

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
              {showAddForm ? "Cancel" : "Add Employee"}
            </Button>
          </div>
        </div>

        {/* Add Employee Form */}
        {showAddForm && (
          <section className="mb-8">
            <div className="mb-3 text-lg font-semibold">Add Employee</div>
            <form
              ref={formRef}
              onSubmit={addEmployee}
              className="bg-white shadow rounded-xl p-6 space-y-6"
            >
              {/* Form fields go here */}
            </form>
          </section>
        )}

        {/* Employee list */}
        <section className="mb-8">
          <div className="mb-3 text-lg font-semibold">Employees</div>
          {/* Employee table goes here */}
        </section>
      </DashboardLayout>
    </AdminGuard>
  );
}
