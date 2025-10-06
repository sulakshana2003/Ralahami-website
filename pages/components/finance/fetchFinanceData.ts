/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

export async function fetchFinanceData() {
  try {
    const [productRes, itemRes, moveRes, empRes, payrollRes, reservationRes] = await Promise.all([
      axios.get("/api/products"),
      axios.get("/api/inventory/items"),
      axios.get("/api/inventory/movements"),
      axios.get("/api/Employee/employees"),
      axios.get("/api/Employee/payroll"),
      axios.get("/api/reservations/reservations"),
    ]);

    const products = productRes.data || [];
    const items = itemRes.data || [];
    const moves = moveRes.data || [];
    const employees = empRes.data || [];
    const payroll = payrollRes.data || [];
    const reservations = reservationRes.data || [];

    // ===== PRODUCTS =====
    const totalRevenue = products.reduce((sum: number, p: any) => sum + (p.finalPrice ?? p.price ?? 0), 0);
    const totalDiscount = products.reduce((sum: number, p: any) => sum + (p.promotion ?? 0), 0);
    const productCount = products.length;

    // ===== INVENTORY =====
    const totalValue = items.reduce((sum: number, i: any) => sum + i.unitCost * i.stockQty, 0);
    const totalPurchases = moves
      .filter((m: any) => m.type === "purchase")
      .reduce((sum: number, m: any) => sum + (m.unitCost ?? 0) * m.qty, 0);
    const totalConsumption = moves
      .filter((m: any) => m.type === "consume")
      .reduce((sum: number, m: any) => sum + m.qty, 0);

    // ===== EMPLOYEES =====
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e: any) => e.isActive).length;
    const totalMonthlyCost = employees
      .filter((e: any) => e.isActive)
      .reduce((sum: number, e: any) => sum + (e.baseSalary ?? 0), 0);

    // ===== PAYROLL =====
    const totalPaid = payroll
      .filter((p: any) => p.type !== "deduction")
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalDeductions = payroll
      .filter((p: any) => p.type === "deduction")
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    // ===== RESERVATIONS =====
    const totalReservations = reservations.length;
    const totalPaidRes = reservations
      .filter((r: any) => r.paymentStatus === "paid")
      .reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);
    const pending = reservations
      .filter((r: any) => r.paymentStatus === "pending")
      .reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);
    const cancelled = reservations.filter((r: any) => r.status === "cancelled").length;

    return {
      productStats: { totalRevenue, totalDiscount, productCount },
      inventoryStats: { totalValue, totalPurchases, totalConsumption },
      employeeStats: { totalEmployees, activeEmployees, totalMonthlyCost },
      payrollStats: { totalPaid, totalDeductions },
      reservationStats: { totalReservations, totalPaid: totalPaidRes, pending, cancelled },
    };
  } catch (err) {
    console.error("❌ Failed to fetch finance data:", err);
    throw err;
  }
}
