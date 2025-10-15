// pages/admin/orders.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../../src/components/AdminGuard";

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

type StatusType =
  | "pending"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "confirmed";

type CombinedRow = {
  source: "DB" | "Stripe";
  method: string;
  orderId: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // ms epoch
  revenue: number;
  cost: number;
  customer?: string;
  details?: string;
  status?: StatusType;
};

/* ============================== Helpers ============================== */
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

/** Convert a single chart's main <svg> to PNG. */
async function chartCardToPng(cardEl: HTMLElement, targetW = 1400) {
  const svgs = Array.from(cardEl.querySelectorAll("svg")) as SVGSVGElement[];
  const svg = svgs.find((s) => {
    const bb = s.getBoundingClientRect();
    return bb.width > 220 && bb.height > 160;
  });
  if (!svg) return null;

  const serializer = new XMLSerializer();
  let src = serializer.serializeToString(svg);
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

  const loaded: Promise<{ dataUrl: string; w: number; h: number }> = new Promise(
    (resolve, reject) => {
      img.onload = () => {
        const ratio = img.height / img.width || 1;
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = Math.max(1, Math.round(targetW * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas 2D context not available"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          w: canvas.width,
          h: canvas.height,
        });
      };
      img.onerror = reject;
    }
  );
  img.src = image64;
  return loaded;
}

/** Read a local asset to dataURL (for logo) */
async function toDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function fetchAll() {
    if (!from || !to) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const [sumRes, dbRes, stripeRes] = await Promise.all([
        fetch(`/api/analytics/summary${qs}`),
        fetch(`/api/analytics/db-orders${qs}`),
        fetch(`/api/analytics/stripe-orders${qs}`),
      ]);

      if (!sumRes.ok || !dbRes.ok || !stripeRes.ok) {
        const body = await Promise.allSettled([sumRes.text(), dbRes.text(), stripeRes.text()]);
        throw new Error(
          "One or more API calls failed.\n" +
            body.map((b) => (b.status === "fulfilled" ? b.value : "")).join("\n")
        );
      }

      const sum: Summary = await sumRes.json();
      const dbJson: { orders: DbOrder[] } = await dbRes.json();
      const stJson: { orders: StripeOrder[] } = await stripeRes.json();

      setSummary(sum);
      setDbOrders(dbJson.orders || []);
      setStripeOrders(stJson.orders || []);
    } catch (e: any) {
      console.error("Failed to fetch orders:", e);
      setErrorMsg(e?.message || "Failed to fetch orders");
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

    const dbRows: CombinedRow[] = dbOrders.map((o) => {
      let status: CombinedRow["status"] = "confirmed";
      try {
        if (o.note) {
          const j = JSON.parse(o.note);
          if (j?.status) status = j.status;
        }
      } catch {}
      return {
        source: "DB",
        method: methodFromNote(o.note),
        orderId: o.orderId || o._id,
        date: o.date,
        createdAt: o.createdAt ? new Date(o.createdAt).getTime() : new Date(`${o.date}T00:00:00Z`).getTime(),
        revenue: Number(o.revenue) || 0,
        cost: Number(o.cost) || 0,
        customer: "",
        details: o.note || "",
        status,
      };
    });

    const stripeRows: CombinedRow[] = stripeOrders.map((s) => ({
      source: "Stripe",
      method: "online_card",
      orderId: s.id,
      date: new Date(s.created * 1000).toISOString().slice(0, 10),
      createdAt: s.created * 1000,
      revenue: Number(s.amount_total) || 0,
      cost: 0,
      customer: s.customer_name || s.customer_email || "",
      details: `status:${s.payment_status} currency:${s.currency ?? "lkr"}`,
      status: "confirmed",
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
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
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

  const topOrders = useMemo(
    () => [...viewRows].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    [viewRows]
  );

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

  /* Refs to each chart card (we export only these, not every svg) */
  const chartRefs = {
    daily: useRef<HTMLDivElement>(null),
    cumulative: useRef<HTMLDivElement>(null),
    revCost: useRef<HTMLDivElement>(null),
    method: useRef<HTMLDivElement>(null),
    source: useRef<HTMLDivElement>(null),
    weekday: useRef<HTMLDivElement>(null),
    hour: useRef<HTMLDivElement>(null),
  };

  /* ============================== PDF Report ============================== */
  async function generatePdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;

    // 1) Header with logo & business info
    const logoData = await toDataURL("/images/RalahamiLogo.png");
    let cursorY = margin;

    if (logoData) {
      const img = new Image();
      img.src = logoData;
      await img.decode?.().catch(() => {});
      const logoH = 18;
      const ratio = (img.width || 1) / (img.height || 1);
      const logoW = Math.min(40, logoH * ratio);
      doc.addImage(logoData, "PNG", margin, cursorY, logoW, logoH, undefined, "FAST");
      doc.setFontSize(16);
      doc.text("Ralahami Restaurant", margin + logoW + 4, cursorY + 6);
      doc.setFontSize(10);
      doc.text("No. 123, Colombo Road, Sri Lanka", margin + logoW + 4, cursorY + 12);
      doc.text("Phone: +94 77 123 4567 • https://ralahami.lk", margin + logoW + 4, cursorY + 17);
      cursorY += logoH + 4;
    } else {
      doc.setFontSize(16);
      doc.text("Ralahami Restaurant", margin, cursorY + 6);
      doc.setFontSize(10);
      doc.text("No. 123, Colombo Road, Sri Lanka • +94 77 123 4567 • https://ralahami.lk", margin, cursorY + 12);
      cursorY += 18;
    }

    doc.setDrawColor(210);
    doc.line(margin, cursorY, pageW - margin, cursorY);
    cursorY += 6;

    doc.setFontSize(14);
    doc.text("Orders Analytics Report", margin, cursorY);
    doc.setFontSize(9);
    doc.text(`Range: ${from} → ${to} • View: ${tab.toUpperCase()} • Generated: ${new Date().toLocaleString()}`, margin, cursorY + 5);
    cursorY += 12;

    autoTable(doc, {
      startY: cursorY,
      head: [["Metric", "Value"]],
      body: [
        ["Total Revenue", formatMoney(totalRevenueCurrentView)],
        ["Total Orders", String(ordersCount)],
        ["Total Cost", formatMoney(totalCostCurrentView)],
        ["Margin", `${formatMoney(margin)} (${marginPct.toFixed(1)}%)`],
        ["Average Order Value", formatMoney(avgOrderValue)],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [67, 56, 202] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: pageW - margin * 2 - 60 },
      },
    });
    // @ts-ignore
    cursorY = (doc as any).lastAutoTable.finalY + 6;

    autoTable(doc, {
      startY: cursorY,
      head: [["Source", "Orders", "Revenue"]],
      body: bySource.map((s) => [s.name, String(s.orders), formatMoney(s.revenue)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241] },
      theme: "grid",
      tableWidth: (pageW - margin * 2) / 2 - 2,
      margin: { left: margin, right: undefined },
    });
    // @ts-ignore
    let leftTableBottom = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
      startY: cursorY,
      head: [["Method", "Orders", "Revenue"]],
      body: byMethod.map((m) => [m.name, String(m.orders), formatMoney(m.value)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94] },
      theme: "grid",
      tableWidth: (pageW - margin * 2) / 2 - 2,
      margin: { left: margin + (pageW - margin * 2) / 2 + 2 },
    });
    // @ts-ignore
    let rightTableBottom = (doc as any).lastAutoTable.finalY;
    cursorY = Math.max(leftTableBottom, rightTableBottom) + 8;

    const chartBlocks: { ref: React.RefObject<HTMLDivElement>; title: string }[] = [
      { ref: chartRefs.daily,      title: "Daily Revenue & Orders" },
      { ref: chartRefs.cumulative, title: "Cumulative Revenue" },
      { ref: chartRefs.revCost,    title: "Revenue vs Cost (Daily)" },
      { ref: chartRefs.method,     title: "Payment Methods (Revenue Share)" },
      { ref: chartRefs.source,     title: "Revenue by Source" },
      { ref: chartRefs.weekday,    title: "Orders by Weekday" },
      { ref: chartRefs.hour,       title: "Orders by Hour" },
    ];

    let cursorAfterCharts = cursorY;
    for (const block of chartBlocks) {
      const el = block.ref.current as HTMLElement | null;
      if (!el) continue;

      const png = await chartCardToPng(el, 1500).catch(() => null);
      if (!png) continue;

      const imgW = pageW - margin * 2;
      const imgH = (png.h * imgW) / png.w;
      const needed = 8 + 4 + imgH;

      if (cursorAfterCharts + needed > pageH - 14) {
        addFooterPageNumber(doc);
        doc.addPage();
        cursorAfterCharts = margin;
      }

      doc.setFontSize(11);
      doc.text(block.title, margin, cursorAfterCharts);
      cursorAfterCharts += 4;
      doc.addImage(png.dataUrl, "PNG", margin, cursorAfterCharts, imgW, imgH, undefined, "FAST");
      cursorAfterCharts += imgH + 8;
    }

    if (cursorAfterCharts > pageH - 80) { addFooterPageNumber(doc); doc.addPage(); cursorAfterCharts = margin; }

    doc.setFontSize(12);
    doc.text("Top 10 Orders (Revenue)", margin, cursorAfterCharts);
    autoTable(doc, {
      startY: cursorAfterCharts + 3,
      head: [["Order ID", "Source", "Method", "Revenue", "Date"]],
      body: topOrders.map((r) => [r.orderId, r.source, r.method || "—", formatMoney(r.revenue), r.date]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [14, 165, 233] },
      theme: "grid",
      tableWidth: (pageW - margin * 2) / 2 - 2,
      margin: { left: margin },
    });
    // @ts-ignore
    let topOrdersBottom = (doc as any).lastAutoTable.finalY;

    doc.setFontSize(12);
    doc.text("Top 10 Customers", margin + (pageW - margin * 2) / 2 + 2, cursorAfterCharts);
    autoTable(doc, {
      startY: cursorAfterCharts + 3,
      head: [["Customer", "Orders", "Revenue"]],
      body: topCustomers.map((c) => [c.customer, String(c.orders), formatMoney(c.revenue)]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [234, 88, 12] },
      theme: "grid",
      tableWidth: (pageW - margin * 2) / 2 - 2,
      margin: { left: margin + (pageW - margin * 2) / 2 + 2 },
    });
    // @ts-ignore
    let topCustomersBottom = (doc as any).lastAutoTable.finalY;

    // FIXED: continue with cursorAfterCharts (no re-declare of cursorY)
    cursorAfterCharts = Math.max(topOrdersBottom, topCustomersBottom) + 6;

    if (cursorAfterCharts > pageH - 40) { addFooterPageNumber(doc); doc.addPage(); cursorAfterCharts = margin; }
    doc.setFontSize(12);
    doc.text("Orders (compact)", margin, cursorAfterCharts);
    autoTable(doc, {
      startY: cursorAfterCharts + 4,
      head: [["Created", "Source", "Method", "Order ID", "Revenue"]],
      body: viewRows.map((r) => [
        formatDateTimeISO(r.createdAt),
        r.source,
        r.method || "—",
        r.orderId,
        formatMoney(Number(r.revenue) || 0),
      ]),
      styles: { fontSize: 8, cellPadding: 1.5 },
      headStyles: { fillColor: [67, 56, 202] },
      theme: "grid",
    });

    addFooterPageNumber(doc);
    doc.save(`orders-report-${from}_${to}.pdf`);
  }

  function addFooterPageNumber(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Page ${pageCount}`, pageW - 20, pageH - 8, { align: "right" });
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
    { key: "status", label: "Status" }, // read-only pill here
    { key: "details", label: "Details" },
  ];

  function applyPreset(preset: "this-month" | "last-7" | "last-30" | "all") {
    const today = new Date();
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
      setFrom("1970-01-01");
      setTo(end.toISOString().slice(0, 10));
    }
  }

  /* ====== Header ====== */
  const PageHeader = (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-6 py-6 mb-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Admin / Analytics</div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 ring-1 ring-indigo-200">
              {tab === "combined" ? "Combined" : tab === "db" ? "DB (COD & Card-OD)" : "Stripe (Online Card)"}
            </span>
          </div>
          <p className="text-sm text-slate-500">Deep-dive analytics across DB & Stripe with exportable charts.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={generatePdf}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            📄 Export PDF
          </button>
          <button
            onClick={() => downloadCSV(`${tab}-orders-${from}_${to}`, viewRows)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            ⇩ Export CSV
          </button>
          <button
            onClick={fetchAll}
            className={cx(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm",
              loading ? "bg-slate-300 text-slate-700 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
            disabled={loading}
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
        <MiniStat title="DB vs Stripe (Revenue)" value={bySource.map((s) => `${s.name}: ${formatMoney(s.revenue)}`).join(" | ") || "—"} />
        <MiniStat title="Methods (Orders)" value={byMethod.map((m) => `${m.name}: ${m.orders}`).join(" | ") || "—"} />
      </div>
    </div>
  );

  /* ====== DB Status Board data ====== */
  const statusRows = useMemo(
    () => combinedRows.filter((r) => r.source === "DB"),
    [combinedRows]
  );

  return (
    <AdminGuard>
      <DashboardLayout>
        {PageHeader}

        {/* Filters + Tabs (sticky) */}
        <div className="mb-4 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/95 rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
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
                <button className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50" onClick={() => applyPreset("this-month")}>This Month</button>
                <button className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50" onClick={() => applyPreset("last-7")}>Last 7 days</button>
                <button className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50" onClick={() => applyPreset("last-30")}>Last 30 days</button>
                <button className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50" onClick={() => applyPreset("all")}>All</button>
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

            {/* Segmented tabs */}
            <div className="rounded-xl border border-slate-300 p-1 flex w-full xl:w-auto">
              {[
                { k: "combined", label: "Combined" },
                { k: "db", label: "DB (COD & Card-OD)" },
                { k: "stripe", label: "Stripe (Online Card)" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k as TabKey)}
                  className={cx(
                    "flex-1 rounded-lg px-3 py-2 text-sm transition",
                    tab === (t.k as TabKey) ? "bg-slate-900 text-white" : "bg-transparent text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMsg}
            </div>
          )}
        </div>

        {/* ====== Chart Cards ====== */}
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <ChartCard refEl={chartRefs.daily} title="Daily Revenue & Orders">
            <ResponsiveContainer>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any, k: any) => (k === "orders" ? v : formatMoney(Number(v) || 0))} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#6366F1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#10B981" strokeWidth={2} dot={false} yAxisId={1} />
                <YAxis yAxisId={1} orientation="right" stroke="#6B7280" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard refEl={chartRefs.cumulative} title="Cumulative Revenue">
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
          </ChartCard>

          <ChartCard refEl={chartRefs.revCost} title="Revenue vs Cost (Daily)">
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
          </ChartCard>

          <ChartCard refEl={chartRefs.method} title="Payment Methods (Revenue Share)">
            <ResponsiveContainer>
              <PieChart>
                <Tooltip formatter={(v: any) => formatMoney(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                <Legend />
                <Pie data={byMethod} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                  {byMethod.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard refEl={chartRefs.source} title="Revenue by Source">
            <ResponsiveContainer>
              <BarChart data={bySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip formatter={(v: any) => formatMoney(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue">
                  {bySource.map((entry, i) => <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard refEl={chartRefs.weekday} title="Orders by Weekday">
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
          </ChartCard>

          <ChartCard refEl={chartRefs.hour} title="Orders by Hour">
            <ResponsiveContainer>
              <LineChart data={ordersByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#F97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22C55E" strokeWidth={2} dot={false} yAxisId={1} />
                <YAxis yAxisId={1} orientation="right" stroke="#6B7280" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ====== DB Order Status Board (separate table for updates) ====== */}
        <StatusBoard
          rows={statusRows}
          onSave={async (orderId, newStatus) => {
            const res = await fetch("/api/orders/update-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, status: newStatus }),
            });
            if (!res.ok) {
              const j = await res.json().catch(() => ({}));
              throw new Error(j?.error || "Failed to update status");
            }
            // refresh charts / numbers
            await fetchAll();
          }}
        />

        {/* ====== Top Lists ====== */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-slate-700">Top 10 Orders (by Revenue)</div>
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
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-slate-700">Top 10 Customers</div>
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
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-500">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ====== Orders Table (read-only status) ====== */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div className="sticky top-[68px] z-[5] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {headers.map((h) => (
                    <th key={h.key} className="px-3 py-3 text-left">
                      <button
                        onClick={() => {
                          if (sortKey === h.key) setSortDir(sortDir === "asc" ? "desc" : "asc");
                          else { setSortKey(h.key); setSortDir("desc"); }
                        }}
                        className="flex items-center gap-1" title="Sort"
                      >
                        {h.label}
                        {sortKey === h.key ? <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span> : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          <table className="min-w-[1100px] w-full text-sm">
            <tbody>
              {viewRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-slate-500" colSpan={headers.length}>
                    {loading ? "Loading…" : "No rows found for this filter."}
                  </td>
                </tr>
              ) : (
                viewRows.map((r, i) => (
                  <tr key={`${r.orderId}-${i}`} className={cx("border-t", i % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                    <td className="px-3 py-2">{formatDateTimeISO(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.source}</td>
                    <td className="px-3 py-2 capitalize">{r.method || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.orderId}</td>
                    <td className="px-3 py-2">{formatMoney(Number(r.revenue) || 0)}</td>
                    <td className="px-3 py-2">{formatMoney(Number(r.cost) || 0)}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.customer || "—"}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={r.status || "confirmed"} />
                    </td>
                    <td className="px-3 py-2 max-w-[320px] truncate" title={r.details}>{r.details || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Data sources: DB (COD & Card-on-Delivery) → <code>/api/analytics/db-orders</code>,
          Stripe (paid sessions) → <code>/api/analytics/stripe-orders</code>, rollup → <code>/api/analytics/summary</code>.
          Update order statuses from the separate <strong>Status Board</strong> above.
        </p>
      </DashboardLayout>
    </AdminGuard>
  );
}

/* ============================ Components ============================ */
function KPI({
  title,
  value,
  tone = "muted",
}: { title: string; value: string | number; tone?: "muted" | "success" | "warning" | "info"; }) {
  const bar =
    tone === "success" ? "bg-emerald-500/70"
    : tone === "warning" ? "bg-amber-500/70"
    : tone === "info" ? "bg-indigo-500/70"
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

function ChartCard({
  refEl,
  title,
  children,
}: {
  refEl: React.RefObject<HTMLDivElement>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div ref={refEl} className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-2 text-sm text-slate-800">{title}</div>
      <div className="h-64">{children}</div>
    </div>
  );
}

/* ---------------- Status UI ---------------- */
const STATUS_STYLES: Record<
  StatusType,
  { bg: string; text: string; ring: string }
> = {
  confirmed: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200" },
  pending: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  preparing: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200" },
  ready: { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  cancelled: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
};

function StatusPill({ status }: { status: StatusType }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1", s.bg, s.text, s.ring)}>
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          status === "completed" ? "bg-emerald-500"
          : status === "cancelled" ? "bg-rose-500"
          : status === "ready" ? "bg-cyan-500"
          : status === "preparing" ? "bg-sky-500"
          : status === "pending" ? "bg-amber-500"
          : "bg-indigo-500"
        )}
      />
      {status}
    </span>
  );
}

/* ---------------- Status Board (separate table for updates) ---------------- */
function StatusBoard({
  rows,
  onSave,
}: {
  rows: CombinedRow[];
  onSave: (orderId: string, status: StatusType) => Promise<void>;
}) {
  const [filterQ, setFilterQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = filterQ.trim().toLowerCase();
    return rows
      .filter((r) => (statusFilter === "all" ? true : (r.status || "confirmed") === statusFilter))
      .filter((r) =>
        !needle
          ? true
          : [r.orderId, r.method, r.details].some((x) => String(x ?? "").toLowerCase().includes(needle))
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [rows, filterQ, statusFilter]);

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-800">Order Status Board (DB Orders)</div>
          <p className="text-xs text-slate-500">Update customer-facing status without touching the main orders table.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Search by Order ID, method…"
            className="h-9 w-64 rounded-lg border border-slate-300 bg-white px-3 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="all">All statuses</option>
            {["confirmed","pending","preparing","ready","completed","cancelled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Order ID</th>
              <th className="px-3 py-2 text-left">Method</th>
              <th className="px-3 py-2 text-left">Current</th>
              <th className="px-3 py-2 text-left">New Status</th>
              <th className="px-3 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">No DB orders in this range.</td>
              </tr>
            ) : (
              filtered.map((r) => <StatusRow key={r.orderId} row={r} onSave={onSave} busyId={busyId} setBusyId={setBusyId} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusRow({
  row,
  onSave,
  busyId,
  setBusyId,
}: {
  row: CombinedRow;
  onSave: (orderId: string, status: StatusType) => Promise<void>;
  busyId: string | null;
  setBusyId: (id: string | null) => void;
}) {
  const [nextStatus, setNextStatus] = useState<StatusType>(row.status || "confirmed");
  const saving = busyId === row.orderId;

  return (
    <tr className="border-t">
      <td className="px-3 py-2">{formatDateTimeISO(row.createdAt)}</td>
      <td className="px-3 py-2 font-mono text-xs">{row.orderId}</td>
      <td className="px-3 py-2 capitalize">{row.method || "—"}</td>
      <td className="px-3 py-2"><StatusPill status={row.status || "confirmed"} /></td>
      <td className="px-3 py-2">
        <select
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value as StatusType)}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs"
        >
          {(["confirmed","pending","preparing","ready","completed","cancelled"] as StatusType[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <button
          onClick={async () => {
            try {
              setBusyId(row.orderId);
              await onSave(row.orderId, nextStatus);
            } catch (e: any) {
              alert(e?.message || "Failed to update");
            } finally {
              setBusyId(null);
            }
          }}
          disabled={saving}
          className={cx(
            "h-8 rounded-lg px-3 text-xs transition",
            saving ? "bg-slate-300 text-slate-600 cursor-not-allowed" : "bg-black text-white hover:opacity-90"
          )}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
