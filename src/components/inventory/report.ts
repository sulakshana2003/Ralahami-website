/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Item, Movement } from "../../../pages/types/inventory";

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

export async function generateInventoryReport({
  items,
  movements,
  from,
  to,
  lowStockCount,
  totalValue,
  fmt,
  chartDataUrl, // optional PNG data URL of your bar chart
}: {
  items: Item[];
  movements: Movement[];
  from: string;
  to: string;
  lowStockCount: number;
  totalValue: number;
  fmt: Intl.NumberFormat;
  chartDataUrl?: string;
}) {
  const logo = await toDataUrl("/images/RalahamiLogo.png");
  const now = new Date();
  const stamp =
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ` +
    `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const itemRows = items.map(i => `
    <tr>
      <td>${safe(i.name)}</td>
      <td>${safe(i.category || "-")}</td>
      <td>${safe(i.unit)}</td>
      <td>${safe(fmt.format(i.unitCost))}</td>
      <td>${safe(i.stockQty)}</td>
      <td>${safe(i.reorderLevel)}</td>
      <td>${safe(fmt.format(i.stockQty * i.unitCost))}</td>
    </tr>
  `).join("");

  const byId: Record<string, Item> = {};
  items.forEach(i => (byId[i._id] = i));

  const moveRows = movements.map(m => {
    const item = byId[m.itemId];
    const uc = m.type === "purchase" ? (m.unitCost || 0) : (item?.unitCost || 0);
    return `
      <tr>
        <td>${safe(m.date)}</td>
        <td>${safe(item?.name || m.itemId)}</td>
        <td>${safe(m.type)}</td>
        <td>${safe(m.qty)} ${safe(item?.unit || "")}</td>
        <td>${safe(fmt.format(uc))}</td>
        <td>${safe(fmt.format(uc * m.qty))}</td>
        <td>${safe(m.note || "-")}</td>
      </tr>
    `;
  }).join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Inventory Report</title>
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
  h2 { font-size:16px; margin:12px 0 8px; }
  table { width:100%; border-collapse:collapse; }
  th, td { border:1px solid #E5E7EB; padding:8px 10px; font-size:12px; }
  thead th { background:#F9FAFB; text-align:left; color:#374151; }
  tfoot td { background:#F9FAFB; font-weight:600; }
  .mt-16 { margin-top:16px; }

  .chart-wrap { margin: 16px 0 22px; border:1px solid #E5E7EB; border-radius:12px; padding:12px; }
  .chart-title { font-weight:700; margin-bottom:8px; }
  .chart-img { width:100%; height:auto; display:block; }
</style>
</head>
<body>
  <div class="header">
    ${logo ? `<img src="${logo}" class="logo" alt="Logo" />` : ""}
    <div>
      <h1 class="title">Inventory Report</h1>
      <div class="sub">Generated ${safe(stamp)} • Movements: ${safe(from)} → ${safe(to)}</div>
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Total Items</div><div class="value">${items.length}</div></div>
    <div class="card"><div class="label">Low Stock</div><div class="value">${lowStockCount}</div></div>
    <div class="card"><div class="label">Stock Value</div><div class="value">${safe(fmt.format(totalValue))}</div></div>
    <div class="card"><div class="label">Movements (range)</div><div class="value">${movements.length}</div></div>
  </div>

  ${chartDataUrl ? `
  <div class="chart-wrap">
    <div class="chart-title">Inventory Stock Levels</div>
    <img class="chart-img" src="${chartDataUrl}" alt="Inventory Stock Levels Bar Chart" />
  </div>` : ''}

  <h2>Inventory Snapshot</h2>
  <table>
    <thead>
      <tr>
        <th style="width:180px">Item</th>
        <th style="width:140px">Category</th>
        <th style="width:70px">Unit</th>
        <th style="width:120px">Unit Cost</th>
        <th style="width:90px">Stock</th>
        <th style="width:90px">Reorder</th>
        <th style="width:130px">Value</th>
      </tr>
    </thead>
    <tbody>${itemRows || `<tr><td colspan="7">No items</td></tr>`}</tbody>
  </table>

  <h2 class="mt-16">Inventory Movements (${safe(from)} → ${safe(to)})</h2>
  <table>
    <thead>
      <tr>
        <th style="width:120px">Date</th>
        <th style="width:180px">Item</th>
        <th style="width:100px">Type</th>
        <th style="width:120px">Qty</th>
        <th style="width:120px">Unit Cost</th>
        <th style="width:120px">Total</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>${moveRows || `<tr><td colspan="7">No movements in range</td></tr>`}</tbody>
    <tfoot>
      <tr><td colspan="7">Report generated on ${safe(stamp)}</td></tr>
    </tfoot>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventory-report_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
