// pages/admin/orders.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";

/* ---------- Recharts ---------- */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

/* ---------- PDF ---------- */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * ℹ️ Add this page to your left admin menu:
 *   In `DashboardLayout`'s side menu, include: { href: "/admin/orders", label: "Orders" }
 */

/* ============================== Types ============================== */
type DbOrder = {
  _id: string;
  date: string; // YYYY-MM-DD
  orderId?: string;
  revenue: number;
  cost: number;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StripeOrder = {
  id: string;
  created: number; // epoch seconds
  amount_total: number;
  currency: string | null;
  payment_status: string;
  customer_email?: string | null;
  customer_name?: string | null;
};

type Summary = {
  range: { from: string; to: string };
  db: {
    cod: { revenue: number; count: number };
    card_on_delivery: { revenue: number; count: number };
    totalRevenue: number;
    totalCost: number;
    grossMargin: number;
  };
  stripe: { online_card: { revenue: number; count: number } };
  combined: { totalRevenue: number; orders: number };
};

type TabKey = "combined" | "db" | "stripe";

type CombinedRow = {
  source: "DB" | "Stripe";
  method: string;
  orderId: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // ms
  revenue: number;
  cost: number;
  customer?: string;
  details?: string;
};

/* ============================== Helpers ============================== */
function formatMoney(n: number, currency = "LKR") {
  try {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rs. ${Math.round(n).toLocaleString()}`;
  }
}

function formatDateTimeISO(dt: string | number) {
  const d = typeof dt === "number" ? new Date(dt) : new Date(dt);
  return d.toLocaleString();
}

function downloadCSV(filename: string, rows: any[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes("\n") || s.includes('"')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Convert a Recharts SVG into PNG (avoids html2canvas + "lab()" CSS errors) */
async function svgToPng(
  svgEl: SVGSVGElement,
  targetWidthPx: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const serializer = new XMLSerializer();
  let src = serializer.serializeToString(svgEl);

  if (!src.includes("http://www.w3.org/2000/svg")) {
    src = src.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const svg64 =
    typeof window.btoa === "function"
      ? window.btoa(unescape(encodeURIComponent(src)))
      : Buffer.from(src, "utf-8").toString("base64");

  const image64 = "data:image/svg+xml;base64," + svg64;
  const img = new Image();
  img.crossOrigin = "anonymous";

  const loaded: Promise<{ dataUrl: string; width: number; height: number }> = new Promise(
    (resolve, reject) => {
      img.onload = () => {
        const ratio = img.height / img.width || 1;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidthPx;
        canvas.height = Math.max(1, Math.round(targetWidthPx * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas 2D context not available"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height });
      };
      img.onerror = reject;
    }
  );

  img.src = image64;
  return loaded;
}

/* ============================== Page ============================== */
export default function AdminOrdersPage() {
  /* --------- date range (default: current month) --------- */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    setFrom(first.toISOString().slice(0, 10));
    setTo(last.toISOString().slice(0, 10));
  }, []);

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dbOrders, setDbOrders] = useState<DbOrder[]>([]);
  const [stripeOrders, setStripeOrders] = useState<StripeOrder[]>([]);
  const [tab, setTab] = useState<TabKey>("combined");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function fetchAll() {
    if (!from || !to) return;
    setLoading(true);
    try {
      const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const [sumRes, dbRes, stripeRes] = await Promise.all([
        fetch(`/api/analytics/summary${qs}`),
        fetch(`/api/analytics/db-orders${qs}`),
        fetch(`/api/analytics/stripe-orders${qs}`),
      ]);

      const sum: Summary = await sumRes.json();
      const dbJson: { orders: DbOrder[] } = await dbRes.json();
      const stJson: { orders: StripeOrder[] } = await stripeRes.json();

      setSummary(sum);
      setDbOrders(dbJson.orders || []);
      setStripeOrders(stJson.orders || []);
    } catch (e) {
      console.error("Failed to fetch orders:", e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  /* --------- normalize "combined" view --------- */
  const combinedRows: CombinedRow[] = useMemo(() => {
    const methodFromNote = (note?: string) => {
      if (!note) return "";
      try {
        const j = JSON.parse(note);
        if (j?.method) return String(j.method);
        if (j?.payment?.method) return String(j.payment.method);
      } catch {}
      const low = note.toLowerCase();
      if (low.includes("card_on_delivery") || low.includes("card on delivery")) return "card_on_delivery";
      if (low.includes("cod")) return "cod";
      return "";
    };

    const dbRows: CombinedRow[] = dbOrders.map((o) => ({
      source: "DB",
      method: methodFromNote(o.note),
      orderId: o.orderId || o._id,
      date: o.date,
      createdAt: o.createdAt ? new Date(o.createdAt).getTime() : new Date(`${o.date}T00:00:00Z`).getTime(),
      revenue: o.revenue,
      cost: o.cost,
      customer: "",
      details: o.note || "",
    }));

    const stripeRows: CombinedRow[] = stripeOrders.map((s) => ({
      source: "Stripe",
      method: "online_card",
      orderId: s.id,
      date: new Date(s.created * 1000).toISOString().slice(0, 10),
      createdAt: s.created * 1000,
      revenue: s.amount_total,
      cost: 0,
      customer: s.customer_name || s.customer_email || "",
      details: `status:${s.payment_status} currency:${s.currency ?? "lkr"}`,
    }));

    return [...dbRows, ...stripeRows];
  }, [dbOrders, stripeOrders]);

  /* --------- filter + sort for current tab --------- */
  const viewRows = useMemo(() => {
    const base =
      tab === "combined"
        ? combinedRows
        : tab === "db"
        ? combinedRows.filter((r) => r.source === "DB")
        : combinedRows.filter((r) => r.source === "Stripe");

    const needle = q.trim().toLowerCase();
    const filtered = !needle
      ? base
      : base.filter((r) =>
          [r.orderId, r.customer, r.method, r.details].some((x) =>
            String(x ?? "").toLowerCase().includes(needle)
          )
        );

    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      if (["revenue", "cost", "createdAt"].includes(sortKey)) {
        return (a as any)[sortKey] > (b as any)[sortKey] ? dir : -dir;
      }
      return String((a as any)[sortKey] ?? "").localeCompare(String((b as any)[sortKey] ?? "")) * dir;
    });

    return sorted;
  }, [tab, combinedRows, q, sortKey, sortDir]);

  const totalRevenueCurrentView = useMemo(
    () => viewRows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0),
    [viewRows]
  );
  const totalCostCurrentView = useMemo(
    () => viewRows.reduce((sum, r) => sum + (Number(r.cost) || 0), 0),
    [viewRows]
  );
  const ordersCount = viewRows.length;
  const avgOrderValue = ordersCount ? totalRevenueCurrentView / ordersCount : 0;
  const margin = totalRevenueCurrentView - totalCostCurrentView;
  const marginPct = totalRevenueCurrentView > 0 ? (margin / totalRevenueCurrentView) * 100 : 0;

  /* ====================== Advanced Analytics ====================== */
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; cost: number; orders: number }>();
    for (const r of viewRows) {
      const key = r.date;
      if (!map.has(key)) map.set(key, { date: key, revenue: 0, cost: 0, orders: 0 });
      const row = map.get(key)!;
      row.revenue += Number(r.revenue) || 0;
      row.cost += Number(r.cost) || 0;
      row.orders += 1;
    }
    const arr = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return arr;
  }, [viewRows]);

  const cumulativeRevenue = useMemo(() => {
    let acc = 0;
    return dailyTrend.map((d) => ({ date: d.date, cumulative: (acc += d.revenue) }));
  }, [dailyTrend]);

  const bySource = useMemo(() => {
    const src: Record<string, { name: string; revenue: number; orders: number }> = {};
    for (const r of viewRows) {
      const name = r.source || "Unknown";
      if (!src[name]) src[name] = { name, revenue: 0, orders: 0 };
      src[name].revenue += Number(r.revenue) || 0;
      src[name].orders += 1;
    }
    return Object.values(src);
  }, [viewRows]);

  const byMethod = useMemo(() => {
    const m: Record<string, { name: string; value: number; orders: number }> = {};
    for (const r of viewRows) {
      const name = (r.method || "unknown").toLowerCase();
      if (!m[name]) m[name] = { name, value: 0, orders: 0 };
      m[name].value += Number(r.revenue) || 0;
      m[name].orders += 1;
    }
    return Object.values(m);
  }, [viewRows]);

  const ordersByWeekday = useMemo(() => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Array(7).fill(0);
    const revenue = Array(7).fill(0);
    for (const r of viewRows) {
      const d = new Date(r.createdAt);
      const wd = d.getDay();
      counts[wd] += 1;
      revenue[wd] += Number(r.revenue) || 0;
    }
    return names.map((name, i) => ({ name, orders: counts[i], revenue: revenue[i] }));
  }, [viewRows]);

  const ordersByHour = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, orders: 0, revenue: 0 }));
    for (const r of viewRows) {
      const d = new Date(r.createdAt);
      const h = d.getHours();
      arr[h].orders += 1;
      arr[h].revenue += Number(r.revenue) || 0;
    }
    return arr;
  }, [viewRows]);

  const topOrders = useMemo(() => {
    return [...viewRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [viewRows]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, { customer: string; revenue: number; orders: number }>();
    for (const r of viewRows) {
      const c = (r.customer || "").trim();
      if (!c) continue;
      if (!map.has(c)) map.set(c, { customer: c, revenue: 0, orders: 0 });
      const row = map.get(c)!;
      row.revenue += Number(r.revenue) || 0;
      row.orders += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [viewRows]);

  const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6", "#14B8A6", "#22C55E"];

  /* Refs for PDF chart capture (SVG) */
  const chartsRef = useRef<HTMLDivElement>(null);

  /* ============================== PDF Report ============================== */
  async function generatePdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // Title + range
    doc.setFontSize(16);
    doc.text("Orders Report", margin, 18);
    doc.setFontSize(10);
    doc.text(`Range: ${from} → ${to} • Tab: ${tab.toUpperCase()}`, margin, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 31);

    // KPIs
    doc.setFontSize(11);
    doc.text(`Revenue: ${formatMoney(totalRevenueCurrentView)}`, margin, 40);
    doc.text(`Orders: ${ordersCount}`, margin + 70, 40);
    doc.text(`Cost: ${formatMoney(totalCostCurrentView)}`, margin, 46);
    doc.text(`Margin: ${formatMoney(margin)} (${marginPct.toFixed(1)}%)`, margin + 70, 46);
    doc.text(`Average Order Value: ${formatMoney(avgOrderValue)}`, margin, 52);

    // Export each chart SVG within chartsRef as PNG
    let y = 60;
    const svgs = (chartsRef.current?.querySelectorAll("svg") || []) as NodeListOf<SVGSVGElement>;
    for (const svg of Array.from(svgs)) {
      const { dataUrl, width, height } = await svgToPng(svg, 1400); // render hi-res
      const imgW = pageWidth - margin * 2;
      const imgH = (height * imgW) / width;

      if (y + imgH > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.addImage(dataUrl, "PNG", margin, y, imgW, imgH, undefined, "FAST");
      y += imgH + 8;
    }

    // Orders table (compact)
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Orders (compact view)", margin, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Created", "Source", "Method", "Order ID", "Revenue"]],
      body: viewRows.slice(0, 200).map((r) => [
        formatDateTimeISO(r.createdAt),
        r.source,
        r.method || "—",
        String(r.orderId),
        formatMoney(Number(r.revenue) || 0),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [67, 56, 202] }, // indigo-700
      theme: "grid",
    });
    if (viewRows.length > 200) {
      // @ts-ignore
      const lastY = (doc as any).lastAutoTable?.finalY ?? 280;
      doc.setFontSize(9);
      doc.text(`(+${viewRows.length - 200} more rows not shown)`, margin, Math.min(lastY + 6, pageHeight - 10));
    }

    doc.save(`orders-report-${from}_${to}.pdf`);
  }

  /* =============================== UI =============================== */
  const headers = [
    { key: "createdAt", label: "Created" },
    { key: "source", label: "Source" },
    { key: "method", label: "Method" },
    { key: "orderId", label: "Order ID" },
    { key: "revenue", label: "Revenue" },
    { key: "cost", label: "Cost" },
    { key: "date", label: "Date" },
    { key: "customer", label: "Customer" },
    { key: "details", label: "Details" },
  ];

  // date presets
  function applyPreset(preset: "this-month" | "last-7" | "last-30" | "all") {
    const today = new Date();
    const tz = today.getTimezoneOffset();
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const start = new Date(end);

    if (preset === "this-month") {
      const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      setFrom(first.toISOString().slice(0, 10));
      setTo(end.toISOString().slice(0, 10));
    } else if (preset === "last-7") {
      start.setUTCDate(end.getUTCDate() - 6);
      setFrom(start.toISOString().slice(0, 10));
      setTo(end.toISOString().slice(0, 10));
    } else if (preset === "last-30") {
      start.setUTCDate(end.getUTCDate() - 29);
      setFrom(start.toISOString().slice(0, 10));
      setTo(end.toISOString().slice(0, 10));
    } else {
      // all time (fallback to a very early date)
      setFrom("1970-01-01");
      setTo(end.toISOString().slice(0, 10));
    }
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 mb-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Admin</div>
              <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
              <p className="text-sm text-slate-500">
                Advanced analytics across DB (COD / Card-on-Delivery) and Stripe (Online Card).
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={generatePdf}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                title="Generate PDF report"
              >
                📄 Report (PDF)
              </button>
              <button
                onClick={() => downloadCSV(`${tab}-orders-${from}_${to}`, viewRows)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
              >
                ⇩ Export CSV
              </button>
              <button
                onClick={fetchAll}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI title="Revenue (current view)" value={formatMoney(totalRevenueCurrentView)} />
            <KPI title="Orders (current view)" value={ordersCount} tone="info" />
            <KPI title="Cost (current view)" value={formatMoney(totalCostCurrentView)} tone="warning" />
            <KPI title="Margin (current view)" value={`${formatMoney(margin)} (${marginPct.toFixed(1)}%)`} tone="success" />
          </div>

          {/* Secondary stats */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <MiniStat title="Average Order Value" value={formatMoney(avgOrderValue)} />
            <MiniStat
              title="DB vs Stripe (Revenue)"
              value={bySource.map((s) => `${s.name}: ${formatMoney(s.revenue)}`).join(" | ") || "—"}
            />
            <MiniStat title="Methods (Orders)" value={byMethod.map((m) => `${m.name}: ${m.orders}`).join(" | ") || "—"} />
          </div>
        </div>

        {/* Filters + Tabs */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-slate-600">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50"
                  onClick={() => applyPreset("this-month")}
                >
                  This Month
                </button>
                <button
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50"
                  onClick={() => applyPreset("last-7")}
                >
                  Last 7 days
                </button>
                <button
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50"
                  onClick={() => applyPreset("last-30")}
                >
                  Last 30 days
                </button>
                <button
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50"
                  onClick={() => applyPreset("all")}
                >
                  All
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-600">Search</label>
                <input
                  placeholder="Order ID, customer, method…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="mt-1 h-10 w-64 rounded-xl border border-slate-300 bg-white px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { k: "combined", label: "Combined" },
                { k: "db", label: "DB (COD & Card-OD)" },
                { k: "stripe", label: "Stripe (Online Card)" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k as TabKey)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    tab === t.k ? "border-black bg-black text-white" : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ====== Analytics Charts (SVG → PDF) ====== */}
        <div ref={chartsRef} className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Daily Revenue & Orders */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Daily Revenue & Orders</div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v: any, k: any) => (k === "orders" ? v : formatMoney(Number(v) || 0))}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#6366F1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="orders" name="Orders" stroke="#10B981" strokeWidth={2} dot={false} yAxisId={1} />
                  <YAxis yAxisId={1} orientation="right" stroke="#6B7280" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumulative Revenue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Cumulative Revenue</div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={cumulativeRevenue}>
                  <defs>
                    <linearGradient id="cumRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip formatter={(v: any) => formatMoney(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="cumulative" stroke="#10B981" fill="url(#cumRev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue vs Cost by Day */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Revenue vs Cost (Daily)</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip formatter={(v: any) => formatMoney(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366F1" />
                  <Bar dataKey="cost" name="Cost" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Method Mix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Payment Methods (Revenue Share)</div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip formatter={(v: any) => formatMoney(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                  <Legend />
                  <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                    {byMethod.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Source */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Revenue by Source</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={bySource}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip formatter={(v: any) => formatMoney(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue">
                    {bySource.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders by Weekday */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Orders by Weekday</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={ordersByWeekday}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="orders" name="Orders" fill="#06B6D4" />
                  <Bar dataKey="revenue" name="Revenue" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders by Hour */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Orders by Hour</div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={ordersByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="hour" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="orders" name="Orders" stroke="#F97316" strokeWidth={2} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={false}
                    yAxisId={1}
                  />
                  <YAxis yAxisId={1} orientation="right" stroke="#6B7280" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Lists */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Top 10 Orders (by Revenue)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Order ID</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-left">Revenue</th>
                    <th className="px-3 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {topOrders.map((r, i) => (
                    <tr key={`${r.orderId}-${i}`} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{r.orderId}</td>
                      <td className="px-3 py-2">{r.source}</td>
                      <td className="px-3 py-2">{r.method || "—"}</td>
                      <td className="px-3 py-2">{formatMoney(r.revenue)}</td>
                      <td className="px-3 py-2">{r.date}</td>
                    </tr>
                  ))}
                  {topOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm text-slate-700">Top 10 Customers</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Customer</th>
                    <th className="px-3 py-2 text-left">Orders</th>
                    <th className="px-3 py-2 text-left">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={`${c.customer}-${i}`} className="border-t">
                      <td className="px-3 py-2">{c.customer}</td>
                      <td className="px-3 py-2">{c.orders}</td>
                      <td className="px-3 py-2">{formatMoney(c.revenue)}</td>
                    </tr>
                  ))}
                  {topCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {headers.map((h) => (
                  <th key={h.key} className="px-3 py-3 text-left">
                    <button
                      onClick={() => {
                        if (sortKey === h.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                        else {
                          setSortKey(h.key);
                          setSortDir("desc");
                        }
                      }}
                      className="flex items-center gap-1"
                      title="Sort"
                    >
                      {h.label}
                      {sortKey === h.key ? (
                        <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {viewRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-slate-500" colSpan={headers.length}>
                    {loading ? "Loading…" : "No rows found for this filter."}
                  </td>
                </tr>
              ) : (
                viewRows.map((r, i) => (
                  <tr key={`${r.orderId}-${i}`} className="border-t">
                    <td className="px-3 py-2">{formatDateTimeISO(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.source}</td>
                    <td className="px-3 py-2 capitalize">{r.method || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.orderId}</td>
                    <td className="px-3 py-2">{formatMoney(Number(r.revenue) || 0)}</td>
                    <td className="px-3 py-2">{formatMoney(Number(r.cost) || 0)}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.customer || "—"}</td>
                    <td className="px-3 py-2 max-w-[320px] truncate" title={r.details}>
                      {r.details || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Data sources: DB (COD & Card-on-Delivery) → <code>/api/analytics/db-orders</code>, Stripe (paid sessions) →{" "}
          <code>/api/analytics/stripe-orders</code>, rollup → <code>/api/analytics/summary</code>.
        </p>
      </DashboardLayout>
    </AdminGuard>
  );
}

/* ============================ Tiny Components ============================ */
function KPI({
  title,
  value,
  tone = "muted",
}: {
  title: string;
  value: string | number;
  tone?: "muted" | "success" | "warning" | "info";
}) {
  const bar =
    tone === "success"
      ? "bg-emerald-500/70"
      : tone === "warning"
      ? "bg-amber-500/70"
      : tone === "info"
      ? "bg-indigo-500/70"
      : "bg-slate-400/70";
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`absolute left-0 top-0 h-full w-1.5 rounded-l-xl ${bar}`} />
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value || "—"}</div>
    </div>
  );
}
