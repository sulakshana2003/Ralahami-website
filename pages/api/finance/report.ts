import { NextApiRequest, NextApiResponse } from "next";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import path from "path";
import fs from "fs";

// Import your DB connection + models
import { dbConnect } from "@/lib/db";
import OnlineOrder from "@/models/OnlineOrder";
import Reservation from "@/models/Reservation";
import InventoryItem from "@/models/InventoryItem";
import InventoryMove from "@/models/InventoryMovement";
import Employee from "@/models/Employee";
import Payroll from "@/models/Payroll";
import Product from "@/models/Product";

export const config = { runtime: "nodejs" };

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 600, height: 400 });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { from, to } = req.query as { from: string; to: string };
    await dbConnect();

    // 🔹 Fetch data from DB
    const orders = await OnlineOrder.find({
      date: { $gte: from, $lte: to },
    }).lean();
    const reservations = await Reservation.find({
      date: { $gte: from, $lte: to },
    }).lean();
    const items = await InventoryItem.find().lean();
    const moves = await InventoryMove.find({
      date: { $gte: from, $lte: to },
    }).lean();
    const employees = await Employee.find().lean();
    const payroll = await Payroll.find({
      date: { $gte: from, $lte: to },
    }).lean();
    const products = await Product.find().lean();

    // 🔹 Generate summary stats
    const onlineRevenue = orders.reduce((sum, o) => sum + o.revenue, 0);
    const onlineProfit = orders.reduce(
      (sum, o) => sum + (o.revenue - o.cost),
      0
    );
    const reservationRevenue = reservations.reduce(
      (sum, r) => sum + r.amount,
      0
    );
    const payrollOutflow = payroll.reduce((sum, p) => sum + p.amount, 0);
    const inventoryPurchases = moves
      .filter((m) => m.type === "purchase")
      .reduce((sum, m) => sum + (m.unitCost || 0) * m.qty, 0);
    const netProfit =
      onlineProfit + reservationRevenue - payrollOutflow - inventoryPurchases;

    // 🔹 Create charts
    const pieChart = await chartJSNodeCanvas.renderToBuffer({
      type: "pie",
      data: {
        labels: ["Online", "Reservations", "Payroll", "Inventory"],
        datasets: [
          {
            data: [
              onlineRevenue,
              reservationRevenue,
              payrollOutflow,
              inventoryPurchases,
            ],
            backgroundColor: ["#4f46e5", "#10b981", "#f87171", "#fbbf24"],
          },
        ],
      },
    });

    const barChart = await chartJSNodeCanvas.renderToBuffer({
      type: "bar",
      data: {
        labels: products.slice(0, 5).map((p) => p.name),
        datasets: [
          {
            label: "Stock",
            data: products.slice(0, 5).map((p) => p.stock),
            backgroundColor: "#4f46e5",
          },
        ],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });

    // 🔹 Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Header
    page.drawText("Ralahami Hotel", {
      x: 50,
      y: height - 60,
      size: 24,
      font,
      color: rgb(0.2, 0.2, 0.7),
    });

    const logoPath = path.join(process.cwd(), "public/hotel.png");
    if (fs.existsSync(logoPath)) {
      const logoBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: 450,
        y: height - 100,
        width: 100,
        height: 60,
      });
    }

    page.drawText(`Report Period: ${from} - ${to}`, {
      x: 50,
      y: height - 120,
      size: 12,
      font,
    });

    // Summary
    page.drawText(`Online Revenue: Rs. ${onlineRevenue}`, {
      x: 50,
      y: height - 160,
      size: 12,
    });
    page.drawText(`Online Profit: Rs. ${onlineProfit}`, {
      x: 50,
      y: height - 180,
      size: 12,
    });
    page.drawText(`Reservations Revenue: Rs. ${reservationRevenue}`, {
      x: 50,
      y: height - 200,
      size: 12,
    });
    page.drawText(`Payroll Outflow: Rs. ${payrollOutflow}`, {
      x: 50,
      y: height - 220,
      size: 12,
    });
    page.drawText(`Inventory Purchases: Rs. ${inventoryPurchases}`, {
      x: 50,
      y: height - 240,
      size: 12,
    });
    page.drawText(`Net Profit: Rs. ${netProfit}`, {
      x: 50,
      y: height - 260,
      size: 12,
    });

    // Embed charts
    const pieImage = await pdfDoc.embedPng(pieChart);
    page.drawImage(pieImage, {
      x: 50,
      y: height - 600,
      width: 200,
      height: 200,
    });

    const barImage = await pdfDoc.embedPng(barChart);
    page.drawImage(barImage, {
      x: 300,
      y: height - 600,
      width: 200,
      height: 200,
    });

    // Add new page for detailed tables
    const page2 = pdfDoc.addPage([595, 842]);
    let y = 800;

    function drawRow(text: string, x: number, fontSize = 10) {
      page2.drawText(text, { x, y, size: fontSize, font });
    }

    // Orders
    y -= 20;
    drawRow("Orders:", 50, 14);
    y -= 20;
    orders.slice(0, 20).forEach((o) => {
      drawRow(
        `${o.date} | ${o.orderId} | Rev: ${o.revenue} | Cost: ${o.cost}`,
        50
      );
      y -= 14;
    });

    // Reservations
    y -= 30;
    drawRow("Reservations:", 50, 14);
    y -= 20;
    reservations.slice(0, 20).forEach((r) => {
      drawRow(
        `${r.date} | ${r.name} | Party: ${r.partySize} | Rs.${r.amount}`,
        50
      );
      y -= 14;
    });

    // Products
    y -= 30;
    drawRow("Products:", 50, 14);
    y -= 20;
    products.slice(0, 20).forEach((p) => {
      drawRow(
        `${p.name} | Rs.${p.price} | Stock: ${p.stock} | ${
          p.isAvailable ? "Available" : "Unavailable"
        }`,
        50
      );
      y -= 14;
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=finance-report.pdf"
    );
    res.send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate report" });
  }
}
