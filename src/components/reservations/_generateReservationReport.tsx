/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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

export async function generateReservationReport({
  reservations,
  fmt,
}: {
  reservations: {
    date: string;
    slot: string;
    name: string;
    email: string;
    partySize: number;
    status: string;
    paymentStatus: string;
    paymentMethod?: string;
    amount: number;
  }[];
  fmt: Intl.NumberFormat;
}) {
  const logo = await toDataUrl("/images/RalahamiLogo.png");
  const now = new Date();
  const stamp =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")} ` +
    `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

  // --- stats ---
  const total = reservations.length;
  const confirmed = reservations.filter((r) => r.status === "confirmed").length;
  const cancelled = reservations.filter((r) => r.status === "cancelled").length;
  const paid = reservations.filter((r) => r.paymentStatus === "paid");
  const pending = reservations.filter((r) => r.paymentStatus === "pending");
  const unpaid = reservations.filter((r) => r.paymentStatus === "unpaid");

  const revenue = paid.reduce((sum, r) => sum + (r.amount || 0), 0);
  const pendingAmt = pending.reduce((sum, r) => sum + (r.amount || 0), 0);

  // --- html ---
  const rows = reservations
    .map(
      (r) => `
    <tr>
      <td>${safe(r.date)}</td>
      <td>${safe(r.slot)}</td>
      <td>${safe(r.name)}</td>
      <td>${safe(r.email)}</td>
      <td>${safe(r.partySize)}</td>
      <td>${safe(r.status)}</td>
      <td>${safe(r.paymentStatus)}</td>
      <td>${safe(r.paymentMethod || "-")}</td>
      <td>${safe(fmt.format(r.amount || 0))}</td>
    </tr>
  `
    )
    .join("");

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
  .stats { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:12px; margin:18px 0 22px; }
  .stat { border:1px solid #E5E7EB; border-radius:12px; padding:12px; }
  .label { font-size:12px; color:#6B7280; }
  .value { font-size:20px; font-weight:700; margin-top:2px; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #E5E7EB; padding:8px 10px; font-size:12px; }
  thead th { background:#F9FAFB; text-align:left; color:#374151; }
  tfoot td { background:#F9FAFB; font-weight:600; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" class="logo" alt="Logo" />` : ""}
    <div>
      <h1 class="title">Reservation Report</h1>
      <div class="sub">Generated ${safe(stamp)}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="label">Total Reservations</div><div class="value">${safe(
      total
    )}</div></div>
    <div class="stat"><div class="label">Confirmed</div><div class="value">${safe(
      confirmed
    )}</div></div>
    <div class="stat"><div class="label">Cancelled</div><div class="value">${safe(
      cancelled
    )}</div></div>
    <div class="stat"><div class="label">Paid Reservations</div><div class="value">${safe(
      paid.length
    )}</div></div>
    <div class="stat"><div class="label">Pending Payments</div><div class="value">${safe(
      pending.length
    )}</div></div>
    <div class="stat"><div class="label">Unpaid</div><div class="value">${safe(
      unpaid.length
    )}</div></div>
    <div class="stat"><div class="label">Total Revenue</div><div class="value">${safe(
      fmt.format(revenue)
    )}</div></div>
    <div class="stat"><div class="label">Pending Amount</div><div class="value">${safe(
      fmt.format(pendingAmt)
    )}</div></div>
  </div>

  <h2>Reservation Details</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Slot</th>
        <th>Name</th>
        <th>Email</th>
        <th>Party</th>
        <th>Status</th>
        <th>Payment</th>
        <th>Method</th>
        <th>Amount (LKR)</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows ||
        `<tr><td colspan="9" style="text-align:center;color:#999;">No Reservations Found</td></tr>`
      }
    </tbody>
    <tfoot>
      <tr><td colspan="9">Report generated on ${safe(stamp)}</td></tr>
    </tfoot>
  </table>
</body>
</html>`;

  // --- download ---
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
