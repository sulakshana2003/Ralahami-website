/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

type Reservation = {
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

function safe(s: any) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]!)
  );
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

function computeRange(reservations: Reservation[], from?: string, to?: string) {
  if (from && to) return { from, to };
  if (!reservations.length) return { from: "-", to: "-" };
  const dates = reservations.map((r) => r.date).sort();
  return { from: dates[0]!, to: dates[dates.length - 1]! };
}

function countBy<T extends string | undefined>(arr: T[]) {
  const map = new Map<string, number>();
  for (const v of arr) {
    const k = String(v ?? "-");
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export async function generateReservationReport({
  reservations,
  fmt,
  from,
  to,
  chartDataUrl, // optional PNG data URL of any chart you render elsewhere
}: {
  reservations: Reservation[];
  fmt: Intl.NumberFormat;
  from?: string;
  to?: string;
  chartDataUrl?: string;
}) {
  const logo = await toDataUrl("/images/RalahamiLogo.png");

  // ---- Stats ----
  const total = reservations.length;
  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const cancelled = reservations.filter((r) => r.status === "cancelled").length;

  const paid = reservations.filter((r) => r.paymentStatus === "paid");
  const pending = reservations.filter((r) => r.paymentStatus === "pending");
  const unpaid = reservations.filter((r) => r.paymentStatus === "unpaid");

  const revenue = paid.reduce((s, r) => s + (r.amount || 0), 0);
  const avgParty = total
    ? reservations.reduce((s, r) => s + (r.partySize || 0), 0) / total
    : 0;

  const byMethod = countBy(reservations.map((r) => r.paymentMethod || "-"));
  const byDate = countBy(reservations.map((r) => r.date));
  const { from: rangeFrom, to: rangeTo } = computeRange(reservations, from, to);

  // Top customers by spend
  const spendByCustomer = new Map<string, number>();
  for (const r of paid) {
    const k = `${r.name} <${r.email}>`;
    spendByCustomer.set(k, (spendByCustomer.get(k) ?? 0) + (r.amount || 0));
  }
  const topCustomers = [...spendByCustomer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Upcoming (today or future)
  const todayISO = new Date();
  const todayStr = `${todayISO.getFullYear()}-${String(
    todayISO.getMonth() + 1
  ).padStart(2, "0")}-${String(todayISO.getDate()).padStart(2, "0")}`;
  const upcoming = reservations
    .filter((r) => r.date >= todayStr && r.status === "confirmed")
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
    .slice(0, 10);

  // ---- Tables ----
  const resRows = reservations
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot))
    .map(
      (r) => `
      <tr>
        <td>${safe(r.date)}</td>
        <td>${safe(r.slot)}</td>
        <td>${safe(r.name)}</td>
        <td>${safe(r.partySize)}</td>
        <td>${safe(r.status)}</td>
        <td>${safe(r.paymentStatus)}</td>
        <td>${safe(r.paymentMethod || "-")}</td>
        <td style="text-align:right">${safe(fmt.format(r.amount || 0))}</td>
        <td>${safe(r.notes || "-")}</td>
      </tr>
    `
    )
    .join("");

  const byMethodRows = [...byMethod.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([m, n]) =>
        `<tr><td>${safe(m)}</td><td style="text-align:right">${safe(
          n
        )}</td></tr>`
    )
    .join("");

  const byDateRows = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([d, n]) =>
        `<tr><td>${safe(d)}</td><td style="text-align:right">${safe(
          n
        )}</td></tr>`
    )
    .join("");

  const topCustomerRows = topCustomers
    .map(
      ([cust, amt]) =>
        `<tr><td>${safe(cust)}</td><td style="text-align:right">${safe(
          fmt.format(amt)
        )}</td></tr>`
    )
    .join("");

  const upcomingRows = upcoming
    .map(
      (r) => `
      <tr>
        <td>${safe(r.date)}</td>
        <td>${safe(r.slot)}</td>
        <td>${safe(r.name)}</td>
        <td style="text-align:right">${safe(r.partySize)}</td>
      </tr>
    `
    )
    .join("");

  // ---- Shell ----
  const now = new Date();
  const stamp =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")} ` +
    `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Reservation Report</title>
<style>
  :root { color-scheme: light only; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111827; margin:24px; }
  .header { display:flex; align-items:center; gap:14px; }
  .logo { height:42px; width:auto; }
  .title { font-size:22px; font-weight:800; margin:0; }
  .sub { color:#6B7280; margin-top:4px; }
  .cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:12px; margin:18px 0 22px; }
  .card { border:1px solid #E5E7EB; border-radius:12px; padding:12px; }
  .label { font-size:12px; color:#6B7280; }
  .value { font-size:20px; font-weight:700; margin-top:2px; }
  h2 { font-size:16px; margin:16px 0 8px; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #E5E7EB; padding:8px 10px; font-size:12px; }
  thead th { background:#F9FAFB; text-align:left; color:#374151; }
  tfoot td { background:#F9FAFB; font-weight:600; }
  .mt-16 { margin-top:16px; }
  .grid-2 { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)); gap:12px; }
  .chart-wrap { margin: 16px 0 22px; border:1px solid #E5E7EB; border-radius:12px; padding:12px; }
  .chart-title { font-weight:700; margin-bottom:8px; }
  .chart-img { width:100%; height:auto; display:block; }
  .right { text-align:right; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" class="logo" alt="Logo" />` : ""}
    <div>
      <h1 class="title">Reservation Report</h1>
      <div class="sub">Generated ${safe(stamp)} • Range: ${safe(
    rangeFrom
  )} → ${safe(rangeTo)}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Total Reservations</div><div class="value">${safe(
      total
    )}</div></div>
    <div class="card"><div class="label">Confirmed</div><div class="value">${safe(
      confirmed
    )}</div></div>
    <div class="card"><div class="label">Cancelled</div><div class="value">${safe(
      cancelled
    )}</div></div>
    <div class="card"><div class="label">Paid</div><div class="value">${safe(
      paid.length
    )}</div></div>
    <div class="card"><div class="label">Pending</div><div class="value">${safe(
      pending.length
    )}</div></div>
    <div class="card"><div class="label">Unpaid</div><div class="value">${safe(
      unpaid.length
    )}</div></div>
    <div class="card"><div class="label">Revenue (Paid)</div><div class="value">${safe(
      fmt.format(revenue)
    )}</div></div>
    <div class="card"><div class="label">Avg. Party Size</div><div class="value">${avgParty.toFixed(
      1
    )}</div></div>
  </div>

  ${
    chartDataUrl
      ? `
  <div class="chart-wrap">
    <div class="chart-title">Reservations by Date</div>
    <img class="chart-img" src="${chartDataUrl}" alt="Reservations by Date Chart" />
  </div>`
      : ""
  }

  <h2>Reservation Details</h2>
  <table>
    <thead>
      <tr>
        <th style="width:110px">Date</th>
        <th style="width:80px">Slot</th>
        <th style="width:200px">Name</th>
        <th style="width:70px">Party</th>
        <th style="width:100px">Status</th>
        <th style="width:100px">Payment</th>
        <th style="width:90px">Method</th>
        <th style="width:120px" class="right">Amount</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>${resRows || `<tr><td colspan="9">No reservations</td></tr>`}</tbody>
    <tfoot>
      <tr><td colspan="9">Report generated on ${safe(stamp)}</td></tr>
    </tfoot>
  </table>

  <div class="grid-2 mt-16">
    <div>
      <h2>By Payment Method</h2>
      <table>
        <thead><tr><th>Method</th><th class="right">Count</th></tr></thead>
        <tbody>${
          byMethodRows || `<tr><td colspan="2">No data</td></tr>`
        }</tbody>
      </table>
    </div>
    <div>
      <h2>By Date (Count)</h2>
      <table>
        <thead><tr><th>Date</th><th class="right">Count</th></tr></thead>
        <tbody>${byDateRows || `<tr><td colspan="2">No data</td></tr>`}</tbody>
      </table>
    </div>
  </div>

  <div class="grid-2 mt-16">
    <div>
      <h2>Top Customers (by Spend)</h2>
      <table>
        <thead><tr><th>Customer</th><th class="right">Amount</th></tr></thead>
        <tbody>${
          topCustomerRows || `<tr><td colspan="2">No payments</td></tr>`
        }</tbody>
      </table>
    </div>
    <div>
      <h2>Upcoming Confirmed</h2>
      <table>
        <thead><tr><th>Date</th><th>Slot</th><th>Customer</th><th class="right">Party</th></tr></thead>
        <tbody>${
          upcomingRows ||
          `<tr><td colspan="4">No upcoming reservations</td></tr>`
        }</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservation-report_${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
