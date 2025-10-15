/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

function safe(s: any) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!
  ));
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

export async function generateFinanceReport({
  productStats,
  inventoryStats,
  employeeStats,
  payrollStats,
  reservationStats,
  chartDataUrl,
  fmt,
}: {
  productStats: { totalRevenue: number; totalDiscount: number; productCount: number };
  inventoryStats: { totalValue: number; totalPurchases: number; totalConsumption: number };
  employeeStats: { totalEmployees: number; activeEmployees: number; totalMonthlyCost: number };
  payrollStats: { totalPaid: number; totalDeductions: number };
  reservationStats: { totalReservations: number; totalPaid: number; pending: number; cancelled: number };
  chartDataUrl?: string;
  fmt: Intl.NumberFormat;
}) {
  const logo = await toDataUrl("/images/RalahamiLogo.png");
  const now = new Date();
  const stamp =
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ` +
    `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  // ------- Card Grid HTMLs -------
  const cards = `
  <div class="cards">
    <div class="card"><div class="label">Products</div><div class="value">${safe(productStats.productCount)}</div></div>
    <div class="card"><div class="label">Total Product Revenue</div><div class="value">${safe(fmt.format(productStats.totalRevenue))}</div></div>
    <div class="card"><div class="label">Total Discounts</div><div class="value">${safe(fmt.format(productStats.totalDiscount))}</div></div>

    <div class="card"><div class="label">Inventory Value</div><div class="value">${safe(fmt.format(inventoryStats.totalValue))}</div></div>
    <div class="card"><div class="label">Purchases</div><div class="value">${safe(fmt.format(inventoryStats.totalPurchases))}</div></div>
    <div class="card"><div class="label">Consumption</div><div class="value">${safe(inventoryStats.totalConsumption)}</div></div>

    <div class="card"><div class="label">Employees</div><div class="value">${safe(employeeStats.totalEmployees)}</div></div>
    <div class="card"><div class="label">Active Employees</div><div class="value">${safe(employeeStats.activeEmployees)}</div></div>
    <div class="card"><div class="label">Salary Cost</div><div class="value">${safe(fmt.format(employeeStats.totalMonthlyCost))}</div></div>

    <div class="card"><div class="label">Payroll Paid</div><div class="value">${safe(fmt.format(payrollStats.totalPaid))}</div></div>
    <div class="card"><div class="label">Payroll Deductions</div><div class="value">${safe(fmt.format(payrollStats.totalDeductions))}</div></div>

    <div class="card"><div class="label">Reservations</div><div class="value">${safe(reservationStats.totalReservations)}</div></div>
    <div class="card"><div class="label">Reservation Revenue</div><div class="value">${safe(fmt.format(reservationStats.totalPaid))}</div></div>
    <div class="card"><div class="label">Pending Payments</div><div class="value">${safe(fmt.format(reservationStats.pending))}</div></div>
    <div class="card"><div class="label">Cancelled</div><div class="value">${safe(reservationStats.cancelled)}</div></div>
  </div>`;

  // ------- HTML Template -------
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Finance Report</title>
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
  .chart-wrap { margin: 16px 0 22px; border:1px solid #E5E7EB; border-radius:12px; padding:12px; }
  .chart-title { font-weight:700; margin-bottom:8px; }
  .chart-img { width:100%; height:auto; display:block; }
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
      <h1 class="title">Finance Report</h1>
      <div class="sub">Generated ${safe(stamp)}</div>
    </div>
  </div>

  ${cards}

  ${chartDataUrl ? `
  <div class="chart-wrap">
    <div class="chart-title">Financial Summary Chart</div>
    <img class="chart-img" src="${chartDataUrl}" alt="Finance Overview Chart" />
  </div>` : ''}
  
  <h2>Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Metric</th>
        <th>Value (LKR)</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Products</td><td>Total Revenue</td><td>${safe(fmt.format(productStats.totalRevenue))}</td></tr>
      <tr><td>Inventory</td><td>Total Stock Value</td><td>${safe(fmt.format(inventoryStats.totalValue))}</td></tr>
      <tr><td>Payroll</td><td>Total Salaries Paid</td><td>${safe(fmt.format(payrollStats.totalPaid))}</td></tr>
      <tr><td>Reservations</td><td>Paid Revenue</td><td>${safe(fmt.format(reservationStats.totalPaid))}</td></tr>
    </tbody>
    <tfoot>
      <tr><td colspan="3">Report generated on ${safe(stamp)}</td></tr>
    </tfoot>
  </table>
</body>
</html>`;

  // ------- Download as HTML file -------
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finance-report_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
