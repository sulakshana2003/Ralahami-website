/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState, useEffect } from "react";
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
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};
const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
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
function Button({ children, tone = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" }) {
  const map = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost: "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  return <button {...props} className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-[.98] transition ${map[tone]} ${props.className || ""}`}>{children}</button>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`} />;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${props.className || ""}`} />;
}
function StatCard({ title, value }: { title: string; value: string | number }) {
  return <div className="bg-white rounded-xl shadow p-4"><div className="text-sm text-neutral-500">{title}</div><div className="text-2xl font-bold mt-1">{value}</div></div>;
}

// ---------- Modal Component ----------
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start pt-10" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
  isActive: boolean;
};
type Payroll = {
  _id: string;
  employeeId: string;
  type: "salary" | "advance" | "bonus" | "deduction";
  amount: number;
  date: string;
  note?: string;
};

// ---------- Form Components ----------
const formInitialState = { name: "", role: "", phone: "", email: "", address: "", emergencyContactName: "", emergencyContactPhone: "", dateOfBirth: "", department: "", hireDate: today(), employmentStatus: "full-time" as const, payType: "salary" as const, baseSalary: 0, };

function AddEmployeeForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void; }) {
  const [formData, setFormData] = useState(formInitialState);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const employeeData = { ...formData, employeeId: generateEmployeeId(), isActive: true };
      const r = await fetch("/api/Employee/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(employeeData) });
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
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><Input required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><Input required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label><Select value={formData.employmentStatus} onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option></Select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label><Select value={formData.payType} onChange={(e) => setFormData({ ...formData, payType: e.target.value as any })}><option value="salary">Salary</option><option value="hourly">Hourly</option></Select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label><Input type="number" required min="0" value={formData.baseSalary} onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><Input type="date" required value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label><Input type="date" required value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label><Input required value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label><Input required value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><Textarea required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
      <div className="flex justify-end gap-2 border-t pt-4 mt-6"><Button type="button" tone="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Add Employee</Button></div>
    </form>
  );
}

function EditEmployeeForm({ employee, onClose, onSuccess }: { employee: Employee; onClose: () => void; onSuccess: () => void; }) {
  const [formData, setFormData] = useState(employee);
  useEffect(() => {
    setFormData({
      ...employee,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split("T")[0] : '',
      hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split("T")[0] : '',
    });
  }, [employee]);
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/Employee/employees", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: employee._id, ...formData }), });
      if (!res.ok) throw new Error(await res.text());
      alert("Employee updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      alert(`Error updating employee: ${error}`);
    }
  }
  return (
     <form onSubmit={handleUpdate} className="space-y-6">
       <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><Input required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><Input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><Input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><Input required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label><Select value={formData.employmentStatus} onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option></Select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Pay Type</label><Select value={formData.payType} onChange={(e) => setFormData({ ...formData, payType: e.target.value as any })}><option value="salary">Salary</option><option value="hourly">Hourly</option></Select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label><Input type="number" required min="0" value={formData.baseSalary} onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><Input type="date" required value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label><Input type="date" required value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Name</label><Input required value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Phone</label><Input required value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><Textarea required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
      <div className="flex justify-end gap-2 border-t pt-4 mt-6"><Button type="button" tone="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save Changes</Button></div>
    </form>
  );
}

function AddPayrollForm({ employees, onClose, onSuccess }: { employees: Employee[]; onClose: () => void; onSuccess: () => void; }) {
  const [formData, setFormData] = useState({ employeeId: "", type: "salary" as Payroll['type'], amount: 0, date: today(), note: "" });
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.employeeId) { alert("Please select an employee."); return; }
    if (formData.amount <= 0) { alert("Amount must be greater than zero."); return; }
    try {
      const res = await fetch("/api/Employee/payroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error(await res.text());
      alert("Payroll entry recorded successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      alert(`Error recording payroll: ${error}`);
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label><Input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Employee</label><Select required value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}><option value="" disabled>-- Select an employee --</option>{employees.map((emp) => (<option key={emp._id} value={emp._id}>{emp.name} - {emp.role}</option>))}</Select></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Payroll['type'] })}><option value="salary">Salary</option><option value="bonus">Bonus</option><option value="advance">Advance</option><option value="deduction">Deduction</option></Select></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount</label><Input type="number" min="0" step="0.01" required placeholder="Enter amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label><Textarea placeholder="Add any remarks here..." value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} /></div>
      <div className="flex justify-end gap-2 border-t pt-4 mt-4"><Button type="button" tone="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Record</Button></div>
    </form>
  );
}

// ---------- MAIN PAGE COMPONENT ----------
export default function EmployeeAdminPage() {
  const { data: employees, mutate: mutateEmp } = useSWR<Employee[]>("/api/Employee/employees", fetcher);
  const [from, setFrom] = useState(shift(-30));
  const [to, setTo] = useState(today());
  const { data: payroll, mutate: mutatePayroll } = useSWR<Payroll[]>(() => `/api/Employee/payroll?from=${from}&to=${to}`, fetcher);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const totals = useMemo(() => {
    if (!payroll) return { outflow: 0, salaries: 0, advances: 0, bonuses: 0, deductions: 0 };
    const outflow = payroll.reduce((s, p) => s + (p.type === "deduction" ? -1 : 1) * p.amount, 0);
    const salaries = payroll.filter(p => p.type === "salary").reduce((s, p) => s + p.amount, 0);
    const advances = payroll.filter(p => p.type === "advance").reduce((s, p) => s + p.amount, 0);
    const bonuses = payroll.filter(p => p.type === "bonus").reduce((s, p) => s + p.amount, 0);
    const deductions = payroll.filter(p => p.type === "deduction").reduce((s, p) => s + p.amount, 0);
    return { outflow, salaries, advances, bonuses, deductions };
  }, [payroll]);

  async function generateReport() { /* ... generate report logic ... */ }
  async function deleteEmployee(id: string) {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch("/api/Employee/employees", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), });
      if (!res.ok) throw new Error(await res.text());
      mutateEmp();
      alert("Employee deleted successfully.");
    } catch (error) {
      alert(`Error deleting employee: ${error}`);
    }
  }
  async function seed() { /* ... seed logic ... */ }

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Employee Management</h1><p className="text-sm text-neutral-500">Manage employees & payroll</p></div>
          <div className="flex gap-2"><Button tone="ghost" onClick={seed}>Seed</Button><Button onClick={() => setShowAddForm(true)}>Add Employee</Button><Button tone="ghost" onClick={() => setShowPayrollForm(true)}>Add Payroll</Button><Button onClick={generateReport} disabled={isGeneratingReport}>{isGeneratingReport ? 'Generating...' : 'Report'}</Button></div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4 mb-8 flex flex-wrap gap-3 items-center"><label className="text-sm text-neutral-600">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" /><label className="text-sm text-neutral-600">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" /></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8"><StatCard title="Total Employees" value={(employees || []).length} /><StatCard title="Total Outflow" value={fmt.format(totals.outflow)} /><StatCard title="Salaries" value={fmt.format(totals.salaries)} /><StatCard title="Advances" value={fmt.format(totals.advances)} /><StatCard title="Bonuses" value={fmt.format(totals.bonuses)} /></div>

        <section className="mb-8">
          <div className="mb-3 text-lg font-semibold">Employees</div>
          <div className="overflow-hidden rounded-xl border bg-white shadow"><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Role</th>
                  <th className="p-3 text-left font-medium">Department</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(employees || []).map((emp) => (
                  <tr key={emp._id} className="border-t">
                    <td className="p-3 font-medium text-gray-900">{emp.name}</td>
                    <td className="p-3 text-gray-600">{emp.role}</td>
                    <td className="p-3 text-gray-600">{emp.department}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{emp.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="p-3 flex gap-2"><Button tone="ghost" onClick={() => setEditingEmployee(emp)} className="text-xs">Edit</Button><Button tone="danger" onClick={() => deleteEmployee(emp._id)} className="text-xs">Delete</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </section>

        {/* --- Modals --- */}
        <Modal isOpen={showAddForm} onClose={() => setShowAddForm(false)} title="Add New Employee"><AddEmployeeForm onClose={() => setShowAddForm(false)} onSuccess={() => mutateEmp()} /></Modal>
        {editingEmployee && <Modal isOpen={!!editingEmployee} onClose={() => setEditingEmployee(null)} title={`Edit ${editingEmployee.name}`}><EditEmployeeForm employee={editingEmployee} onClose={() => setEditingEmployee(null)} onSuccess={() => mutateEmp()} /></Modal>}
        <Modal isOpen={showPayrollForm} onClose={() => setShowPayrollForm(false)} title="Add Payroll Entry"><AddPayrollForm employees={employees || []} onClose={() => setShowPayrollForm(false)} onSuccess={() => mutatePayroll()} /></Modal>

      </DashboardLayout>
    </AdminGuard>
  );
}