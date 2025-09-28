import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/db";
import Product from "@/models/Product";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createCanvas } from "canvas";
import Chart from "chart.js/auto";
import fs from "fs";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  await dbConnect();
  const products = await Product.find();

  // === Setup PDF ===
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // === Add Logo ===
  const logoPath = path.join(process.cwd(), "public/images/RalahamiLogo.png");
  const logo = fs.readFileSync(logoPath);
  const logoBase64 = `data:image/png;base64,${logo.toString("base64")}`;
  doc.addImage(logoBase64, "PNG", 40, 30, 80, 80); // left corner

  // === Header text ===
  doc.setFontSize(20);
  doc.text("Ralahami.lk – Product Report", 140, 60);
  doc.setFontSize(11);
  doc.text("123 Main Street, Colombo, Sri Lanka", 140, 80);
  doc.text("+94 77 123 4567  |  info@ralahami.lk", 140, 95);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 130);

  // === Key Analytics ===
  const total = products.length;
  const available = products.filter((p) => p.isAvailable).length;
  const lowStock = products.filter((p) => p.stock <= 5).length;
  const signature = products.filter((p) => p.isSignatureToday).length;

  doc.setFontSize(13);
  doc.text("Overview:", 40, 160);
  doc.setFontSize(11);
  doc.text(`Total Products: ${total}`, 60, 180);
  doc.text(`Available Products: ${available}`, 60, 195);
  doc.text(`Low Stock (<=5): ${lowStock}`, 60, 210);
  doc.text(`Signature Today: ${signature}`, 60, 225);

  // === Chart: Products per Category ===
  const categories = [...new Set(products.map((p) => p.category || "Uncategorized"))];
  const counts = categories.map((c) => products.filter((p) => p.category === c).length);

  const canvas = createCanvas(500, 250);
  // ❗ DO NOT call getContext() here for Chart.js — pass the canvas itself
  new Chart(canvas as any, {
    type: "bar",
    data: {
      labels: categories,
      datasets: [
        {
          label: "Products per Category",
          data: counts,
          backgroundColor: "#4F46E5",
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: "Products by Category",
        },
      },
    },
  });
  const chartImg = canvas.toDataURL("image/png");
  doc.addImage(chartImg, "PNG", 40, 250, 500, 200);

  // === Product Table ===
  const rows = products.map((p) => [
    p.name,
    p.category || "-",
    `LKR ${p.price.toFixed(2)}`,
    p.stock,
    p.isAvailable ? "Available" : "Unavailable",
    p.spicyLevel,
    p.tags?.join(", ") || "-",
  ]);

  autoTable(doc, {
    startY: 470,
    head: [["Name", "Category", "Price", "Stock", "Status", "SpicyLvl", "Tags"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, halign: "center" },
    bodyStyles: { fontSize: 9 },
    styles: { halign: "center" },
  });

  // === Footer ===
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(10);
  doc.text("Thank you for partnering with Ralahami.lk", 40, pageHeight - 30);

  // === Output PDF ===
  const pdfData = doc.output("arraybuffer");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=products-report.pdf");
  res.send(Buffer.from(pdfData));
}
