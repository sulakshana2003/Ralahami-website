/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";

// ---------- helpers ----------
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
});
const today = (shift = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + shift);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

// ---------- small UI ----------
function Button({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "danger" | "ghost";
}) {
  const map = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost:
      "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50",
    danger: "bg-white border border-rose-300 text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition active:scale-[.98] ${
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
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        {children}
      </div>
    </section>
  );
}

// ---------- types ----------
type Summary = {
  netProfit: number;
  online: { revenue: number; profit: number };
  reservations: { revenue: number };
  payroll: { outflow: number };
  inventory: { purchases: number };
};
type OnlineOrder = { _id: string; date: string; orderId: string; revenue: number; cost: number };
type Reservation = { _id: string; date: string; slot: string; name: string; partySize: number; amount: number; paymentStatus: string };
type Employee = { _id: string; name: string; role: string; baseSalary: number };
type Payroll = { _id: string; date: string; employeeId: string; type: string; amount: number };
type InventoryItem = { _id: string; name: string; unit: string; unitCost: number; stockQty: number };
type InventoryMove = { _id: string; date: string; itemId: string; type: string; qty: number; unitCost?: number; note?: string };
type Product = { _id: string; name: string; category?: string; price: number; stock: number; isAvailable: boolean };

// ---------- main ----------
export default function FinanceAdminPage() {
  const [tab, setTab] = useState<
    "dashboard" | "revenues" | "reservations" | "inventory" | "employees" | "products" | "reports"
  >("reports");
  const [from, setFrom] = useState(today(-7));
  const [to, setTo] = useState(today());

  // SWR
  const { data: summary } = useSWR<Summary>(`/api/finance/summary?from=${from}&to=${to}`, fetcher);
  const { data: orders } = useSWR<OnlineOrder[]>(`/api/orders?from=${from}&to=${to}`, fetcher);
  const { data: reservations } = useSWR<Reservation[]>(`/api/reservations/reservations?from=${from}&to=${to}`, fetcher);
  const { data: employees } = useSWR<Employee[]>("/api/Employee/employees", fetcher);
  const { data: payroll } = useSWR<Payroll[]>(`/api/Employee/payroll?from=${from}&to=${to}`, fetcher);
  const { data: items } = useSWR<InventoryItem[]>("/api/inventory/items", fetcher);
  const { data: moves } = useSWR<InventoryMove[]>(`/api/inventory/movements?from=${from}&to=${to}`, fetcher);
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);

  // Report refs (for charts only)
  const pieRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // ---------- PDF Export ----------
  async function downloadPDF() {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.text("📊 Financial Report", 15, 20);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 15, 28);

    // 1. Summary table
    autoTable(pdf, {
      startY: 40,
      head: [["Metric", "Value"]],
      body: [
        ["Online Revenue", fmt.format(summary?.online.revenue || 0)],
        ["Online Profit", fmt.format(summary?.online.profit || 0)],
        ["Reservation Revenue", fmt.format(summary?.reservations.revenue || 0)],
        ["Payroll Outflow", fmt.format(summary?.payroll.outflow || 0)],
        ["Inventory Purchases", fmt.format(summary?.inventory.purchases || 0)],
        ["Net Profit", fmt.format(summary?.netProfit || 0)],
      ],
    });

    // 2. Orders
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [["Date", "Order ID", "Revenue", "Cost", "Profit"]],
      body: (orders || []).map((o) => [
        o.date,
        o.orderId,
        fmt.format(o.revenue),
        fmt.format(o.cost),
        fmt.format(o.revenue - o.cost),
      ]),
    });

    // 3. Reservations
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [["Date", "Slot", "Name", "Party", "Amount", "Payment"]],
      body: (reservations || []).map((r) => [
        r.date,
        r.slot,
        r.name,
        r.partySize,
        fmt.format(r.amount),
        r.paymentStatus,
      ]),
    });

    // 4. Employees + Payroll
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [["Name", "Role", "Salary"]],
      body: (employees || []).map((e) => [e.name, e.role, fmt.format(e.baseSalary)]),
    });

    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [["Date", "Employee", "Type", "Amount"]],
      body: (payroll || []).map((p) => [
        p.date,
        employees?.find((e) => e._id === p.employeeId)?.name || p.employeeId,
        p.type,
        fmt.format(p.amount),
      ]),
    });

    // 5. Inventory
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [["Name", "Unit", "Cost", "Stock"]],
      body: (items || []).map((i) => [i.name, i.unit, fmt.format(i.unitCost), i.stockQty]),
    });

    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [["Date", "Item", "Type", "Qty", "Unit Cost", "Note"]],
      body: (moves || []).map((m) => [
        m.date,
        items?.find((i) => i._id === m.itemId)?.name || m.itemId,
        m.type,
        m.qty,
        m.unitCost ? fmt.format(m.unitCost) : "-",
        m.note || "-",
      ]),
    });

    // 6. Products
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY + 10,
      head: [["Name", "Category", "Price", "Stock", "Available"]],
      body: (products || []).map((p) => [
        p.name,
        p.category || "-",
        fmt.format(p.price),
        p.stock,
        p.isAvailable ? "Yes" : "No",
      ]),
    });

    // 7. Charts (capture separately with html2canvas)
    async function addChart(ref: React.RefObject<HTMLDivElement>, y: number) {
      if (ref.current) {
        const canvas = await html2canvas(ref.current, { scale: 2 });
        const img = canvas.toDataURL("image/png");
        const width = pdf.internal.pageSize.getWidth() - 30;
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(img, "PNG", 15, y, width, height);
      }
    }

    pdf.addPage();
    pdf.text("Charts", 15, 20);
    await addChart(pieRef, 30);
    await addChart(barRef, 120);

    pdf.save("finance_report.pdf");
  }

  // chart data
  const chartData = [
    { name: "Revenue", value: summary?.online.revenue || 0 },
    { name: "Reservations", value: summary?.reservations.revenue || 0 },
    { name: "Payroll", value: summary?.payroll.outflow || 0 },
    { name: "Inventory", value: summary?.inventory.purchases || 0 },
  ];
  const COLORS = ["#4f46e5", "#10b981", "#f43f5e", "#f59e0b"];

  return (
    <AdminGuard>
      <DashboardLayout>
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Financial Management</h1>
          <Button onClick={downloadPDF}>Download Full PDF</Button>
        </div>

        {/* Reports tab only */}
        <Section title="Reports Preview">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard
              title="Online Revenue"
              value={fmt.format(summary?.online.revenue || 0)}
            />
            <StatCard
              title="Net Profit"
              value={fmt.format(summary?.netProfit || 0)}
            />
            <StatCard
              title="Reservations"
              value={fmt.format(summary?.reservations.revenue || 0)}
            />
            <StatCard
              title="Payroll"
              value={fmt.format(summary?.payroll.outflow || 0)}
            />
          </div>

          {/* Charts to capture */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div ref={pieRef} className="bg-white p-4 rounded-lg shadow">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div ref={barRef} className="bg-white p-4 rounded-lg shadow">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>
      </DashboardLayout>
    </AdminGuard>
  );
}
