/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Chart,
} from "chart.js";
import { Bar, Pie, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// ---- Types ----
export type Reservation = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  date: string; // YYYY-MM-DD
  slot: string; // HH:mm
  partySize: number;
  notes?: string;
  status: "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid" | "unpaid";
  paymentMethod?: "cash" | "card" | "online";
  amount: number;
};

// ---- Helpers ----
const LKR = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

function groupCount<T extends string | undefined>(arr: T[]) {
  const map = new Map<string, number>();
  for (const v of arr) {
    const k = String(v ?? "-");
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function groupSum<K extends string>(pairs: { key: K; value: number }[]) {
  const map = new Map<K, number>();
  for (const { key, value } of pairs) {
    map.set(key, (map.get(key) ?? 0) + value);
  }
  return map;
}

// Export the PNG data URL from any chart instance (used for your HTML report)
export function getChartPng(chart: Chart | null, background = "#ffffff") {
  if (!chart) return "";
  // Set a solid background so PNG isn’t transparent when placed on white report
  const prev = chart.options.plugins?.legend?.labels?.color;
  const canvas = chart.canvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return chart.toBase64Image();
  // Draw a white rect under existing content
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/png");
  // (optional) restore state; not strictly needed
  ctx.restore();
  ctx.putImageData(image, 0, 0);
  return dataUrl;
}

/* ================================
 * 1) Reservations by Date (Bar)
 *    mode = "count" | "revenue"
 * ================================ */
export const ReservationsByDateBar = forwardRef(function ReservationsByDateBar(
  {
    reservations,
    mode = "count",
    title = mode === "revenue" ? "Revenue by Date" : "Reservations by Date",
  }: {
    reservations: Reservation[];
    mode?: "count" | "revenue";
    title?: string;
  },
  ref: React.Ref<{ toPNG: () => string }>
) {
  const chartRef = useRef<ChartJS<"bar"> | null>(null);

  useImperativeHandle(ref, () => ({
    toPNG: () => getChartPng(chartRef.current),
  }));

  // aggregate
  const labels = Array.from(new Set(reservations.map((r) => r.date))).sort(
    (a, b) => a.localeCompare(b)
  );

  let values: number[] = [];
  if (mode === "count") {
    const byDate = groupCount(reservations.map((r) => r.date));
    values = labels.map((d) => byDate.get(d) ?? 0);
  } else {
    const byDate = groupSum(
      reservations.map((r) => ({
        key: r.date,
        value: r.paymentStatus === "paid" ? r.amount || 0 : 0,
      }))
    );
    values = labels.map((d) => byDate.get(d) ?? 0);
  }

  const data = {
    labels,
    datasets: [
      {
        label: mode === "revenue" ? "Paid Revenue (LKR)" : "Reservations",
        data: values,
        backgroundColor: "rgba(79, 70, 229, 0.2)", // indigo-600 @ 20%
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1,
        borderRadius: 6,
        hoverBorderWidth: 2,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: title },
      legend: { display: true, position: "top" as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const v = ctx.raw as number;
            if (mode === "revenue")
              return `${ctx.dataset.label}: ${LKR.format(v)}`;
            return `${ctx.dataset.label}: ${v}`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { autoSkip: true, maxRotation: 0 } },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val: any) =>
            mode === "revenue" ? LKR.format(Number(val)) : String(val),
        },
      },
    },
  };

  return (
    <div className="w-full h-72">
      <Bar ref={chartRef as any} data={data} options={options} />
    </div>
  );
});

/* ==================================
 * 2) Payment Status (Pie)
 *    pending / paid / unpaid
 * ================================== */
export const PaymentStatusPie = forwardRef(function PaymentStatusPie(
  {
    reservations,
    title = "Reservations by Payment Status",
  }: {
    reservations: Reservation[];
    title?: string;
  },
  ref: React.Ref<{ toPNG: () => string }>
) {
  const chartRef = useRef<ChartJS<"pie"> | null>(null);
  useImperativeHandle(ref, () => ({
    toPNG: () => getChartPng(chartRef.current),
  }));

  const counts = groupCount(reservations.map((r) => r.paymentStatus));
  const labels = ["paid", "pending", "unpaid"];
  const values = labels.map((k) => counts.get(k) ?? 0);

  const data = {
    labels: labels.map((s) => s[0]!.toUpperCase() + s.slice(1)),
    datasets: [
      {
        data: values,
        backgroundColor: [
          "rgba(16, 185, 129, 0.25)", // emerald
          "rgba(234, 179, 8, 0.25)", // amber
          "rgba(239, 68, 68, 0.25)", // red
        ],
        borderColor: [
          "rgba(16, 185, 129, 1)",
          "rgba(234, 179, 8, 1)",
          "rgba(239, 68, 68, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: any = {
    responsive: true,
    plugins: {
      title: { display: true, text: title },
      legend: { position: "right" as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.raw}`,
        },
      },
    },
  };

  return (
    <div className="w-full h-72">
      <Pie ref={chartRef as any} data={data} options={options} />
    </div>
  );
});

/* ==================================
 * 3) Payment Method (Doughnut)
 *    cash / card / online / -
 * ================================== */
export const PaymentMethodDoughnut = forwardRef(function PaymentMethodDoughnut(
  {
    reservations,
    title = "Reservations by Payment Method",
  }: {
    reservations: Reservation[];
    title?: string;
  },
  ref: React.Ref<{ toPNG: () => string }>
) {
  const chartRef = useRef<ChartJS<"doughnut"> | null>(null);
  useImperativeHandle(ref, () => ({
    toPNG: () => getChartPng(chartRef.current),
  }));

  const counts = groupCount(reservations.map((r) => r.paymentMethod || "-"));
  const labels = Array.from(counts.keys());
  const values = labels.map((k) => counts.get(k) ?? 0);

  const palette = [
    "rgba(59, 130, 246, 0.25)", // blue
    "rgba(99, 102, 241, 0.25)", // indigo
    "rgba(236, 72, 153, 0.25)", // pink
    "rgba(20, 184, 166, 0.25)", // teal
    "rgba(245, 158, 11, 0.25)", // amber
  ];
  const paletteStroke = [
    "rgba(59, 130, 246, 1)",
    "rgba(99, 102, 241, 1)",
    "rgba(236, 72, 153, 1)",
    "rgba(20, 184, 166, 1)",
    "rgba(245, 158, 11, 1)",
  ];

  const data = {
    labels: labels.map((l) =>
      l === "-" ? "Unknown" : l[0]!.toUpperCase() + l.slice(1)
    ),
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderColor: labels.map(
          (_, i) => paletteStroke[i % paletteStroke.length]
        ),
        borderWidth: 1,
      },
    ],
  };

  const options: any = {
    cutout: "55%",
    responsive: true,
    plugins: {
      title: { display: true, text: title },
      legend: { position: "right" as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.raw}`,
        },
      },
    },
  };

  return (
    <div className="w-full h-72">
      <Doughnut ref={chartRef as any} data={data} options={options} />
    </div>
  );
});
