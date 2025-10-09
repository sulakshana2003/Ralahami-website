// pages/admin/dashboard.tsx--Rukshan Perera
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
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

/* ============================== Types ============================== */
type DbOrder = {
  _id: string;
  date: string; // YYYY-MM-DD
  orderId?: string;
  revenue: number;
  cost: number;
  note?: string;
  createdAt?: string;
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

type Item = {
  _id: string;
  name: string;
  unit: string;
  category?: string;
  unitCost: number;
  stockQty: number;
  reorderLevel: number;
};

type Reservation = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  slot: string;
  partySize: number;
  status: "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid" | "unpaid";
  amount: number;
};

type Product = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  promotion: number; // percentage discount (0-100)
  isAvailable: boolean;
  category?: string;
  createdAt?: string;
};

type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: string;
};

/* ============================== Utils ============================== */
const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#0EA5E9", "#8B5CF6", "#14B8A6", "#22C55E"];

function safeCurrency() {
  return "LKR";
}
function moneyFmt(currency: string) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}
function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Grab just the *main* (largest) svg within a chart card and rasterize to PNG for PDF */
async function chartCardToPng(cardEl: HTMLElement, targetW = 1500) {
  const svgs = Array.from(cardEl.querySelectorAll("svg")) as SVGSVGElement[];
  const main = svgs.find((s) => {
    const bb = s.getBoundingClientRect();
    return bb.width > 220 && bb.height > 160;
  });
  if (!main) return null;

  const serializer = new XMLSerializer();
  let src = serializer.serializeToString(main);
  if (!src.includes("http://www.w3.org/2000/svg")) {
    src = src.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const svg64 =
    typeof window.btoa === "function"
      ? window.btoa(unescape(encodeURIComponent(src)))
      : (globalThis as any).Buffer.from(src, "utf-8").toString("base64");
  const image64 = "data:image/svg+xml;base64," + svg64;

  const img = new Image();
  img.crossOrigin = "anonymous";

  const loaded: Promise<{ dataUrl: string; w: number; h: number }> = new Promise((resolve, reject) => {
    img.onload = () => {
      const ratio = img.height / img.width || 1;
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = Math.max(1, Math.round(targetW * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D context not available"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
    };
    img.onerror = () => reject(new Error("Failed to load chart image"));
  });

  img.src = image64;
  return loaded;
}

async function loadImageAsDataURL(path: string): Promise<string | null> {
  try {
    const res = await fetch(path, { credentials: "same-origin" });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addFooterPageNumber(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Page ${pageCount}`, pageW - 20, pageH - 8, { align: "right" });
}

/* ============================== Page ============================== */
export default function AdminDashboard() {
  /* Date range */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  useEffect(() => {
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    setFrom(first.toISOString().slice(0, 10));
    setTo(last.toISOString().slice(0, 10));
  }, []);
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

  const C = safeCurrency();
  const fmt = moneyFmt(C);
  const swrOpts = { revalidateOnFocus: true, dedupingInterval: 12_000 } as const;
  const qs = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";

  /* Fetch datasets per domain */
  // Orders (DB + Stripe) + summary for revenue/orders
  const { data: summary } = useSWR<Summary>(`/api/analytics/summary${qs}`, fetcher, swrOpts);
  const { data: dbJson } = useSWR<{ orders: DbOrder[] }>(`/api/analytics/db-orders${qs}`, fetcher, swrOpts);
  const { data: stripeJson } = useSWR<{ orders: StripeOrder[] }>(`/api/analytics/stripe-orders${qs}`, fetcher, swrOpts);

  // Inventory
  const { data: items } = useSWR<Item[]>("/api/inventory/items", fetcher, swrOpts);

  // Reservations
  const { data: reservations } = useSWR<Reservation[]>("/api/reservations/reservations", fetcher, swrOpts);

  // Products
  const { data: products } = useSWR<Product[]>("/api/products?limit=10000", fetcher, swrOpts);

  // Employees (users)
  const { data: usersBox } = useSWR<{ items: UserItem[] }>(`/api/users?limit=100000&page=1`, fetcher, swrOpts);

  const dbOrders = dbJson?.orders ?? [];
  const stOrders = stripeJson?.orders ?? [];
  const inv = items ?? [];
  const resv = reservations ?? [];
  const prods = products ?? [];
  const users = usersBox?.items ?? [];

  /* -------------------- ORDERS ANALYTICS (compact) -------------------- */
  const orderRows = useMemo(() => {
    const rows: { date: string; revenue: number; source: "DB" | "Stripe" }[] = [];
    for (const o of dbOrders) rows.push({ date: o.date, revenue: Number(o.revenue) || 0, source: "DB" });
    for (const s of stOrders)
      rows.push({ date: new Date(s.created * 1000).toISOString().slice(0, 10), revenue: Number(s.amount_total) || 0, source: "Stripe" });
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [dbOrders, stOrders]);

  const dailyRevenue = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; orders: number }>();
    for (const r of orderRows) {
      if (!map.has(r.date)) map.set(r.date, { date: r.date, revenue: 0, orders: 0 });
      const row = map.get(r.date)!;
      row.revenue += r.revenue;
      row.orders += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [orderRows]);

  const byOrderSource = useMemo(() => {
    const acc = { DB: 0, Stripe: 0 } as Record<"DB" | "Stripe", number>;
    for (const r of orderRows) acc[r.source] += r.revenue;
    return [
      { name: "DB (COD/Card-OD)", value: acc.DB },
      { name: "Stripe (Online Card)", value: acc.Stripe },
    ];
  }, [orderRows]);

  const ordersKPI = useMemo(() => {
    const totalRevenue = Number(summary?.combined.totalRevenue || 0);
    const ordersCount = Number(summary?.combined.orders || 0);
    const avg = ordersCount ? totalRevenue / ordersCount : 0;
    return { totalRevenue, ordersCount, avg };
  }, [summary]);

  /* -------------------- INVENTORY ANALYTICS -------------------- */
  const inventoryKPI = useMemo(() => {
    const value = inv.reduce((s, i) => s + i.stockQty * i.unitCost, 0);
    const low = inv.filter((i) => i.stockQty <= i.reorderLevel).length;
    const categories = new Map<string, number>();
    inv.forEach((i) => categories.set(i.category || "Uncategorized", (categories.get(i.category || "Uncategorized") || 0) + i.stockQty * i.unitCost));
    return {
      value,
      low,
      byCategory: Array.from(categories.entries()).map(([name, value]) => ({ name, value })),
      topLow: [...inv].filter((i) => i.stockQty <= i.reorderLevel).sort((a, b) => a.stockQty - b.stockQty).slice(8),
      lowPreview: [...inv].filter((i) => i.stockQty <= i.reorderLevel).sort((a, b) => a.stockQty - b.stockQty).slice(0, 8),
    };
  }, [inv]);

  /* -------------------- RESERVATIONS ANALYTICS -------------------- */
  const reservationKPI = useMemo(() => {
    const total = resv.length;
    const confirmed = resv.filter((r) => r.status === "confirmed").length;
    const cancelled = resv.filter((r) => r.status === "cancelled").length;
    const paidRevenue = resv.filter((r) => r.paymentStatus === "paid").reduce((s, r) => s + (r.amount || 0), 0);
    const byStatus = [
      { name: "Confirmed", value: confirmed },
      { name: "Cancelled", value: cancelled },
      { name: "Other", value: Math.max(0, total - confirmed - cancelled) },
    ];
    return { total, confirmed, cancelled, paidRevenue, byStatus };
  }, [resv]);

  const resByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resv) m.set(r.date, (m.get(r.date) || 0) + 1);
    return Array.from(m.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [resv]);

  /* -------------------- PRODUCTS ANALYTICS -------------------- */
  const productsKPI = useMemo(() => {
    const total = prods.length;
    const available = prods.filter((p) => p.isAvailable).length;
    const promotions = prods.filter((p) => (p.promotion || 0) > 0).length;
    const byCategory = new Map<string, number>();
    prods.forEach((p) => byCategory.set(p.category || "Uncategorized", (byCategory.get(p.category || "Uncategorized") || 0) + 1));
    return {
      total,
      available,
      promotions,
      byCategory: Array.from(byCategory.entries()).map(([name, count]) => ({ name, count })),
      recent: [...prods]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 8),
    };
  }, [prods]);

  /* -------------------- EMPLOYEES (USERS) ANALYTICS -------------------- */
  const employeesKPI = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const admins = users.filter((u) => u.role === "admin").length;
    const signupsByDayMap = new Map<string, number>();
    users.forEach((u) => {
      const d = new Date(u.createdAt);
      if (!isNaN(d.getTime())) {
        const k = d.toISOString().slice(0, 10);
        signupsByDayMap.set(k, (signupsByDayMap.get(k) || 0) + 1);
      }
    });
    const signupsByDay = Array.from(signupsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { total, active, admins, signupsByDay, latest: [...users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8) };
  }, [users]);

  /* -------------------- PDF Export -------------------- */
  const refOrders = {
    daily: useRef<HTMLDivElement>(null),
    source: useRef<HTMLDivElement>(null),
  };
  const refInventory = { byCat: useRef<HTMLDivElement>(null) };
  const refReservations = { byStatus: useRef<HTMLDivElement>(null), count: useRef<HTMLDivElement>(null) };
  const refProducts = { byCat: useRef<HTMLDivElement>(null) };
  const refEmployees = { signup: useRef<HTMLDivElement>(null) };

  async function exportPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 12;
    let y = M;

    // Header with logo
    const logoData = await loadImageAsDataURL("/images/RalahamiLogo.png");
    if (logoData) {
      const logoH = 18;
      doc.addImage(logoData, "PNG", M, y, 36, logoH, undefined, "FAST");
      doc.setFontSize(16);
      doc.text("Ralahami — Executive Dashboard", M + 40, y + 7);
      doc.setFontSize(10);
      doc.setTextColor(70);
      doc.text("Analytics Snapshot • " + new Date().toLocaleString(), M + 40, y + 13.5);
      doc.setTextColor(0);
      y += logoH + 6;
    } else {
      doc.setFontSize(16);
      doc.text("Ralahami — Executive Dashboard", M, y + 6);
      y += 16;
    }

    // Date range
    doc.setDrawColor(210);
    doc.line(M, y, pageW - M, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Range: ${from} → ${to}`, M, y);
    y += 4;

    /* ORDERS */
    doc.setFontSize(12);
    doc.text("Orders", M, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9, cellPadding: 2 },
      head: [["Metric", "Value"]],
      body: [
        ["Revenue", fmt.format(ordersKPI.totalRevenue)],
        ["Orders", String(ordersKPI.ordersCount)],
        ["Average Order Value", fmt.format(ordersKPI.avg)],
      ],
      tableWidth: (pageW - M * 2) / 2 - 2,
      margin: { left: M },
    });
    // @ts-ignore
    const ordersTableBottom = (doc as any).lastAutoTable.finalY;

    // Orders source pie on right
    const ordersPieHost = refOrders.source.current;
    if (ordersPieHost) {
      const png = await chartCardToPng(ordersPieHost, 1400).catch(() => null);
      if (png) {
        const w = (pageW - M * 2) / 2 - 2;
        const h = (png.h * w) / png.w;
        doc.addImage(png.dataUrl, "PNG", M + (pageW - M * 2) / 2 + 2, y, w, h, undefined, "FAST");
        y = Math.max(ordersTableBottom, y + h) + 8;
      } else {
        y = ordersTableBottom + 8;
      }
    } else {
      y = ordersTableBottom + 8;
    }

    // Orders daily chart full width
    const ordersDailyHost = refOrders.daily.current;
    if (ordersDailyHost) {
      const png = await chartCardToPng(ordersDailyHost, 1600).catch(() => null);
      if (png) {
        const imgW = pageW - M * 2;
        const imgH = (png.h * imgW) / png.w;
        if (y + imgH > pageH - 16) {
          addFooterPageNumber(doc);
          doc.addPage();
          y = M;
        }
        doc.setFontSize(11);
        doc.text("Daily Revenue & Orders", M, y);
        y += 4;
        doc.addImage(png.dataUrl, "PNG", M, y, imgW, imgH, undefined, "FAST");
        y += imgH + 8;
      }
    }

    /* INVENTORY */
    if (y > pageH - 60) {
      addFooterPageNumber(doc);
      doc.addPage();
      y = M;
    }
    doc.setFontSize(12);
    doc.text("Inventory", M, y);
    autoTable(doc, {
      startY: y + 2,
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9, cellPadding: 2 },
      head: [["Metric", "Value"]],
      body: [
        ["Total Inventory Value", fmt.format(inventoryKPI.value)],
        ["Low-Stock Items", String(inventoryKPI.low)],
      ],
      tableWidth: (pageW - M * 2) / 2 - 2,
      margin: { left: M },
    });
    // @ts-ignore
    const invLeftBottom = (doc as any).lastAutoTable.finalY;

    const invCatHost = refInventory.byCat.current;
    if (invCatHost) {
      const png = await chartCardToPng(invCatHost, 1400).catch(() => null);
      if (png) {
        const w = (pageW - M * 2) / 2 - 2;
        const h = (png.h * w) / png.w;
        doc.addImage(png.dataUrl, "PNG", M + (pageW - M * 2) / 2 + 2, y, w, h, undefined, "FAST");
        y = Math.max(invLeftBottom, y + h) + 8;
      } else {
        y = invLeftBottom + 8;
      }
    } else {
      y = invLeftBottom + 8;
    }

    /* RESERVATIONS */
    if (y > pageH - 60) {
      addFooterPageNumber(doc);
      doc.addPage();
      y = M;
    }
    doc.setFontSize(12);
    doc.text("Reservations", M, y);
    autoTable(doc, {
      startY: y + 2,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9, cellPadding: 2 },
      head: [["Metric", "Value"]],
      body: [
        ["Reservations (total)", String(reservationKPI.total)],
        ["Confirmed / Cancelled", `${reservationKPI.confirmed} / ${reservationKPI.cancelled}`],
        ["Paid Revenue", fmt.format(reservationKPI.paidRevenue)],
      ],
      tableWidth: (pageW - M * 2) / 2 - 2,
      margin: { left: M },
    });
    // @ts-ignore
    const resLeftBottom = (doc as any).lastAutoTable.finalY;

    const resStatusHost = refReservations.byStatus.current;
    if (resStatusHost) {
      const png = await chartCardToPng(resStatusHost, 1400).catch(() => null);
      if (png) {
        const w = (pageW - M * 2) / 2 - 2;
        const h = (png.h * w) / png.w;
        doc.addImage(png.dataUrl, "PNG", M + (pageW - M * 2) / 2 + 2, y, w, h, undefined, "FAST");
        y = Math.max(resLeftBottom, y + h) + 8;
      } else {
        y = resLeftBottom + 8;
      }
    } else {
      y = resLeftBottom + 8;
    }

    // Reservations trend
    const resTrendHost = refReservations.count.current;
    if (resTrendHost) {
      const png = await chartCardToPng(resTrendHost, 1600).catch(() => null);
      if (png) {
        const imgW = pageW - M * 2;
        const imgH = (png.h * imgW) / png.w;
        if (y + imgH > pageH - 16) {
          addFooterPageNumber(doc);
          doc.addPage();
          y = M;
        }
        doc.setFontSize(11);
        doc.text("Reservations by Date", M, y);
        y += 4;
        doc.addImage(png.dataUrl, "PNG", M, y, imgW, imgH, undefined, "FAST");
        y += imgH + 8;
      }
    }

    /* PRODUCTS */
    if (y > pageH - 60) {
      addFooterPageNumber(doc);
      doc.addPage();
      y = M;
    }
    doc.setFontSize(12);
    doc.text("Products", M, y);
    autoTable(doc, {
      startY: y + 2,
      theme: "grid",
      headStyles: { fillColor: [234, 88, 12] },
      styles: { fontSize: 9, cellPadding: 2 },
      head: [["Metric", "Value"]],
      body: [
        ["Total", String(productsKPI.total)],
        ["Available", String(productsKPI.available)],
        ["Promotions Active", String(productsKPI.promotions)],
      ],
      tableWidth: (pageW - M * 2) / 2 - 2,
      margin: { left: M },
    });
    // @ts-ignore
    const prodLeftBottom = (doc as any).lastAutoTable.finalY;

    const prodCatHost = refProducts.byCat.current;
    if (prodCatHost) {
      const png = await chartCardToPng(prodCatHost, 1400).catch(() => null);
      if (png) {
        const w = (pageW - M * 2) / 2 - 2;
        const h = (png.h * w) / png.w;
        doc.addImage(png.dataUrl, "PNG", M + (pageW - M * 2) / 2 + 2, y, w, h, undefined, "FAST");
        y = Math.max(prodLeftBottom, y + h) + 8;
      } else {
        y = prodLeftBottom + 8;
      }
    } else {
      y = prodLeftBottom + 8;
    }

    /* EMPLOYEES */
    if (y > pageH - 60) {
      addFooterPageNumber(doc);
      doc.addPage();
      y = M;
    }
    doc.setFontSize(12);
    doc.text("Employees", M, y);
    autoTable(doc, {
      startY: y + 2,
      theme: "grid",
      headStyles: { fillColor: [107, 114, 128] },
      styles: { fontSize: 9, cellPadding: 2 },
      head: [["Metric", "Value"]],
      body: [
        ["Total", String(employeesKPI.total)],
        ["Active", String(employeesKPI.active)],
        ["Admins", String(employeesKPI.admins)],
      ],
      tableWidth: (pageW - M * 2) / 2 - 2,
      margin: { left: M },
    });
    // @ts-ignore
    const empLeftBottom = (doc as any).lastAutoTable.finalY;

    const empSignupHost = refEmployees.signup.current;
    if (empSignupHost) {
      const png = await chartCardToPng(empSignupHost, 1400).catch(() => null);
      if (png) {
        const w = (pageW - M * 2) / 2 - 2;
        const h = (png.h * w) / png.w;
        doc.addImage(png.dataUrl, "PNG", M + (pageW - M * 2) / 2 + 2, y, w, h, undefined, "FAST");
        y = Math.max(empLeftBottom, y + h) + 8;
      } else {
        y = empLeftBottom + 8;
      }
    } else {
      y = empLeftBottom + 8;
    }

    addFooterPageNumber(doc);
    doc.save(`dashboard-${from}_${to}.pdf`);
  }

  /* =============================== UI =============================== */
  return (
    <AdminGuard>
      <DashboardLayout>
        {/* Header / Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 mb-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Admin</div>
              <h1 className="text-2xl font-semibold text-slate-900">Dashboard Overview</h1>
              <p className="text-sm text-slate-500">Multi-domain snapshot: Orders, Inventory, Reservations, Products & Employees.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-600" htmlFor="from">From</label>
              <input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
              <label className="text-xs text-slate-600" htmlFor="to">To</label>
              <input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
              <div className="flex gap-2">
                <ToolbarBtn onClick={() => applyPreset("this-month")}>This Month</ToolbarBtn>
                <ToolbarBtn onClick={() => applyPreset("last-7")}>Last 7</ToolbarBtn>
                <ToolbarBtn onClick={() => applyPreset("last-30")}>Last 30</ToolbarBtn>
                <ToolbarBtn onClick={() => applyPreset("all")}>All</ToolbarBtn>
              </div>
              <button
                onClick={exportPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                aria-label="Export dashboard as PDF"
              >
                📄 Export PDF
              </button>
            </div>
          </div>
        </section>

        {/* ===== ORDERS ===== */}
        <section className="mb-6">
          <SectionHeader title="Orders" subtitle="Quick revenue snapshot from DB & Stripe." />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <KPI title="Revenue" value={fmt.format(ordersKPI.totalRevenue)} tone="info" />
            <KPI title="Orders" value={ordersKPI.ordersCount} />
            <KPI title="Avg. Order Value" value={fmt.format(ordersKPI.avg)} tone="warning" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card ref={refOrders.daily} title="Daily Revenue & Orders">
              <ChartOrEmpty isEmpty={!dailyRevenue.length}>
                <ResponsiveContainer>
                  <LineChart data={dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => fmt.format(Number(v) || 0)} />
                    <Line type={prefersReducedMotion() ? "linear" : "monotone"} dataKey="revenue" name="Revenue" stroke="#6366F1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartOrEmpty>
            </Card>

            <Card ref={refOrders.source} title="Revenue by Source">
              <ChartOrEmpty isEmpty={!byOrderSource.length}>
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip formatter={(v: any) => fmt.format(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                    <Legend />
                    <Pie data={byOrderSource} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                      {byOrderSource.map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartOrEmpty>
            </Card>
          </div>
        </section>

        {/* ===== INVENTORY ===== */}
        <section className="mb-6">
          <SectionHeader title="Inventory" subtitle="Stock value, risk and category mix." />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <KPI title="Inventory Value" value={fmt.format(inventoryKPI.value)} />
            <KPI title="Low-Stock Items" value={inventoryKPI.low} tone="danger" />
            <KPI title="Categories" value={inventoryKPI.byCategory.length} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card ref={refInventory.byCat} title="Inventory Value by Category">
              <ChartOrEmpty isEmpty={!inventoryKPI.byCategory.length}>
                <ResponsiveContainer>
                  <BarChart data={inventoryKPI.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip formatter={(v: any) => fmt.format(Number(v) || 0)} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="value" name="Value">
                      {inventoryKPI.byCategory.map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartOrEmpty>
            </Card>

            <TableCard title="Low-Stock (Preview)" caption="Items at or below reorder level.">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Reorder</th>
                  <th className="px-3 py-2">Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {inventoryKPI.lowPreview.length ? inventoryKPI.lowPreview.map((i) => (
                  <tr key={i._id} className="border-t">
                    <td className="px-3 py-2">{i.name}</td>
                    <td className="px-3 py-2">{i.stockQty} {i.unit}</td>
                    <td className="px-3 py-2">{i.reorderLevel}</td>
                    <td className="px-3 py-2">{fmt.format(i.unitCost)}</td>
                  </tr>
                )) : <EmptyRow colSpan={4} />}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right">
                    <a href="/admin/inventory" className="text-sm text-indigo-600 hover:underline">Open inventory →</a>
                  </td>
                </tr>
              </tfoot>
            </TableCard>
          </div>
        </section>

        {/* ===== RESERVATIONS ===== */}
        <section className="mb-6">
          <SectionHeader title="Reservations" subtitle="Flow & revenue from bookings." />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <KPI title="Total" value={reservationKPI.total} />
            <KPI title="Confirmed / Cancelled" value={`${reservationKPI.confirmed} / ${reservationKPI.cancelled}`} />
            <KPI title="Paid Revenue" value={fmt.format(reservationKPI.paidRevenue)} tone="success" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card ref={refReservations.byStatus} title="Reservations by Status">
              <ChartOrEmpty isEmpty={!reservationKPI.byStatus.length}>
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend />
                    <Pie data={reservationKPI.byStatus} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} paddingAngle={2}>
                      {reservationKPI.byStatus.map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartOrEmpty>
            </Card>

            <Card ref={refReservations.count} title="Reservations by Date">
              <ChartOrEmpty isEmpty={!resByDate.length}>
                <ResponsiveContainer>
                  <AreaChart data={resByDate}>
                    <defs>
                      <linearGradient id="resCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Area type={prefersReducedMotion() ? "linear" : "monotone"} dataKey="count" name="Reservations" stroke="#0EA5E9" fill="url(#resCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartOrEmpty>
            </Card>
          </div>
        </section>

        {/* ===== PRODUCTS ===== */}
        <section className="mb-6">
          <SectionHeader title="Products" subtitle="Catalog coverage and promotions." />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <KPI title="Total" value={productsKPI.total} />
            <KPI title="Available" value={productsKPI.available} tone="success" />
            <KPI title="Promotions Active" value={productsKPI.promotions} tone="warning" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card ref={refProducts.byCat} title="Products by Category">
              <ChartOrEmpty isEmpty={!productsKPI.byCategory.length}>
                <ResponsiveContainer>
                  <BarChart data={productsKPI.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" name="Products">
                      {productsKPI.byCategory.map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartOrEmpty>
            </Card>

            <TableCard title="Newly Added (Recent)" caption="Latest products in catalog.">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Promo</th>
                  <th className="px-3 py-2">Available</th>
                </tr>
              </thead>
              <tbody>
                {productsKPI.recent.length ? productsKPI.recent.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">{fmt.format(p.price)}</td>
                    <td className="px-3 py-2">{p.promotion ? `${p.promotion}%` : "—"}</td>
                    <td className="px-3 py-2">{p.isAvailable ? "Yes" : "No"}</td>
                  </tr>
                )) : <EmptyRow colSpan={4} />}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right">
                    <a href="/admin/products" className="text-sm text-indigo-600 hover:underline">Open products →</a>
                  </td>
                </tr>
              </tfoot>
            </TableCard>
          </div>
        </section>

        {/* ===== EMPLOYEES ===== */}
        <section className="mb-6">
          <SectionHeader title="Employees" subtitle="Team composition and hiring trend." />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <KPI title="Total" value={employeesKPI.total} />
            <KPI title="Active" value={employeesKPI.active} tone="success" />
            <KPI title="Admins" value={employeesKPI.admins} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card ref={refEmployees.signup} title="Sign-ups by Day">
              <ChartOrEmpty isEmpty={!employeesKPI.signupsByDay.length}>
                <ResponsiveContainer>
                  <LineChart data={employeesKPI.signupsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line type={prefersReducedMotion() ? "linear" : "monotone"} dataKey="count" name="Sign-ups" stroke="#06B6D4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartOrEmpty>
            </Card>

            <TableCard title="Latest Employees" caption="Recently added user accounts.">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {employeesKPI.latest.length ? employeesKPI.latest.map((u) => (
                  <tr key={u._id} className="border-t">
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2 capitalize">{u.role}</td>
                    <td className="px-3 py-2">{u.isActive ? "Active" : "Blocked"}</td>
                  </tr>
                )) : <EmptyRow colSpan={4} />}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right">
                    <a href="/admin/users" className="text-sm text-indigo-600 hover:underline">Manage users →</a>
                  </td>
                </tr>
              </tfoot>
            </TableCard>
          </div>
        </section>

        <p className="mt-4 text-xs text-slate-500">
          Data: Orders → <code>/api/analytics/*</code> • Inventory → <code>/api/inventory/*</code> • Reservations → <code>/api/reservations/*</code> • Products → <code>/api/products</code> • Users → <code>/api/users</code>.
        </p>
      </DashboardLayout>
    </AdminGuard>
  );
}

/* ============================ UI Components ============================ */
function ToolbarBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm hover:bg-slate-50" />;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Section</div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function KPI({
  title,
  value,
  tone = "muted",
}: { title: string; value: string | number; tone?: "muted" | "success" | "warning" | "info" | "danger"; }) {
  const bar =
    tone === "success" ? "bg-emerald-500/70"
      : tone === "warning" ? "bg-amber-500/70"
      : tone === "info" ? "bg-indigo-500/70"
      : tone === "danger" ? "bg-rose-500/70"
      : "bg-slate-400/70";
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`absolute left-0 top-0 h-full w-1.5 rounded-l-xl ${bar}`} />
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

const Card = React.forwardRef<HTMLDivElement, { title: string; children: React.ReactNode }>(function Card({ title, children }, ref) {
  return (
    <div ref={ref} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm text-slate-700">{title}</div>
      <div className="h-64">{children}</div>
    </div>
  );
});

function ChartOrEmpty({ isEmpty, children }: { isEmpty: boolean; children: React.ReactNode }) {
  if (isEmpty) {
    return <div className="flex h-full items-center justify-center text-slate-400 text-sm">No data in this range</div>;
  }
  return <>{children}</>;
}

function TableCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm font-medium text-slate-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-slate-500">—</td>
    </tr>
  );
}
