/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/admin/finance.tsx
'use client';

import { useEffect, useMemo, useState } from "react";

/**
 * Financial Management Admin (Single TSX)
 * - Tabs: Dashboard, Revenues, Inventory, Employees, Reports
 * - Tracks: online orders, reservations, inventory (raw materials), payroll
 * - Generates CSV reports (no extra libs)
 * - Persists to localStorage (acts like a tiny in-file backend for now)
 *
 * Currency: LKR
 */

// ---------- Types ----------
type ISODate = string; // 'YYYY-MM-DD'

type OnlineOrder = {
  id: string;
  date: ISODate;
  orderId: string;
  revenue: number; // money received from customer
  cost: number;    // direct cost (ingredients/packaging) for this order
  note?: string;
};

type ReservationIncome = {
  id: string;
  date: ISODate;
  reservationId: string;
  revenue: number;
  cost: number; // direct cost for reservation (e.g., set menu ingredients)
  note?: string;
};

type InventoryItem = {
  id: string;
  name: string;     // e.g., "Rice", "Dhal", "Chicken"
  unit: string;     // e.g., "kg", "L", "pcs"
  unitCost: number; // your current moving-average cost per unit (LKR)
  stockQty: number; // on-hand quantity
  reorderLevel: number;
  category?: string; // e.g., "Grains", "Meat", etc.
};

type InventoryMovement = {
  id: string;
  date: ISODate;
  itemId: string;
  type: "purchase" | "consume";
  qty: number;
  unitCost?: number; // for purchases (optional for consumes)
  note?: string;
};

type Employee = {
  id: string;
  name: string;
  role: string;
  baseSalary: number; // monthly base
};

type PayrollTxn = {
  id: string;
  date: ISODate;
  employeeId: string;
  type: "salary" | "advance" | "bonus" | "deduction";
  amount: number; // positive number; 'deduction' will be treated as negative outflow in summaries
  note?: string;
};

type DataStore = {
  onlineOrders: OnlineOrder[];
  reservations: ReservationIncome[];
  inventoryItems: InventoryItem[];
  inventoryMoves: InventoryMovement[];
  employees: Employee[];
  payroll: PayrollTxn[];
};

// ---------- Helpers ----------
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});

const todayStr = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const STORAGE_KEY = "finance_admin_v1";

// Seed rich dummy DB
const DEFAULT_DATA: DataStore = {
  onlineOrders: [
    { id: uid(), date: dateShift(-2), orderId: "ORD-1001", revenue: 12500, cost: 7200, note: "3 combos + delivery" },
    { id: uid(), date: dateShift(-1), orderId: "ORD-1002", revenue: 8200, cost: 4300, note: "lunch set A" },
    { id: uid(), date: dateShift(0),  orderId: "ORD-1003", revenue: 15400, cost: 8600, note: "dinner family pack" },
  ],
  reservations: [
    { id: uid(), date: dateShift(-2), reservationId: "RES-2001", revenue: 18000, cost: 9000, note: "10 pax set" },
    { id: uid(), date: dateShift(-1), reservationId: "RES-2002", revenue: 22000, cost: 11000, note: "12 pax birthday" },
    { id: uid(), date: dateShift(0),  reservationId: "RES-2003", revenue: 16000, cost: 7800, note: "8 pax" },
  ],
  inventoryItems: [
    { id: "inv-rice", name: "Rice", unit: "kg", unitCost: 220, stockQty: 180, reorderLevel: 60, category: "Grains" },
    { id: "inv-dhal", name: "Dhal", unit: "kg", unitCost: 450, stockQty: 55, reorderLevel: 20, category: "Pulses" },
    { id: "inv-chicken", name: "Chicken", unit: "kg", unitCost: 1150, stockQty: 40, reorderLevel: 15, category: "Meat" },
    { id: "inv-coconut-milk", name: "Coconut Milk", unit: "L", unitCost: 380, stockQty: 30, reorderLevel: 10, category: "Dairy/Alt" },
  ],
  inventoryMoves: [
    // Purchases (increase stock)
    { id: uid(), date: dateShift(-3), itemId: "inv-rice", type: "purchase", qty: 100, unitCost: 210, note: "wholesale bag" },
    { id: uid(), date: dateShift(-1), itemId: "inv-chicken", type: "purchase", qty: 25, unitCost: 1120, note: "supplier A" },
    { id: uid(), date: dateShift(0),  itemId: "inv-dhal", type: "purchase", qty: 30, unitCost: 440, note: "top up" },
    // Consumes (reduce stock)
    { id: uid(), date: dateShift(-2), itemId: "inv-rice", type: "consume", qty: 20, note: "orders+reservations" },
    { id: uid(), date: dateShift(-1), itemId: "inv-chicken", type: "consume", qty: 10, note: "orders" },
    { id: uid(), date: dateShift(0),  itemId: "inv-dhal", type: "consume", qty: 8, note: "orders" },
  ],
  employees: [
    { id: "emp-1", name: "Nuwan Perera", role: "Chef", baseSalary: 160000 },
    { id: "emp-2", name: "Ishara Silva", role: "Sous Chef", baseSalary: 120000 },
    { id: "emp-3", name: "Kavinda Jay", role: "Cashier", baseSalary: 80000 },
  ],
  payroll: [
    { id: uid(), date: dateShift(-2), employeeId: "emp-1", type: "salary", amount: 160000, note: "Aug salary" },
    { id: uid(), date: dateShift(-2), employeeId: "emp-3", type: "advance", amount: 10000, note: "advance" },
    { id: uid(), date: dateShift(-1), employeeId: "emp-2", type: "bonus", amount: 15000, note: "weekend OT bonus" },
    { id: uid(), date: dateShift(0),  employeeId: "emp-3", type: "deduction", amount: 5000, note: "late arrivals" },
  ],
};

// Small helper to create YYYY-MM-DD relative dates
function dateShift(daysFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---------- Mock Backend (localStorage) ----------
function loadStore(): DataStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as DataStore;
    // basic sanity: merge with defaults if any list missing
    return {
      ...DEFAULT_DATA,
      ...parsed,
      onlineOrders: parsed.onlineOrders ?? DEFAULT_DATA.onlineOrders,
      reservations: parsed.reservations ?? DEFAULT_DATA.reservations,
      inventoryItems: parsed.inventoryItems ?? DEFAULT_DATA.inventoryItems,
      inventoryMoves: parsed.inventoryMoves ?? DEFAULT_DATA.inventoryMoves,
      employees: parsed.employees ?? DEFAULT_DATA.employees,
      payroll: parsed.payroll ?? DEFAULT_DATA.payroll,
    };
  } catch {
    return DEFAULT_DATA;
  }
}
function saveStore(s: DataStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ---------- Main Page ----------
export default function FinanceAdminPage() {
  const [store, setStore] = useState<DataStore>(DEFAULT_DATA);
  const [tab, setTab] = useState<"dashboard" | "revenues" | "inventory" | "employees" | "reports">("dashboard");

  // filters
  const [from, setFrom] = useState<ISODate>(dateShift(-7));
  const [to, setTo] = useState<ISODate>(todayStr());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = loadStore();
    setStore(s);
  }, []);

  // persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    saveStore(store);
  }, [store]);

  // ---------- Derived / Aggregations ----------
  const rangeFilter = (d: ISODate) => d >= from && d <= to;

  const ordersInRange = useMemo(
    () => store.onlineOrders.filter(o => rangeFilter(o.date)),
    [store.onlineOrders, from, to]
  );
  const reservationsInRange = useMemo(
    () => store.reservations.filter(r => rangeFilter(r.date)),
    [store.reservations, from, to]
  );
  const payrollInRange = useMemo(
    () => store.payroll.filter(p => rangeFilter(p.date)),
    [store.payroll, from, to]
  );
  const invPurchasesInRange = useMemo(
    () => store.inventoryMoves.filter(m => m.type === "purchase" && rangeFilter(m.date)),
    [store.inventoryMoves, from, to]
  );
  const invConsumesInRange = useMemo(
    () => store.inventoryMoves.filter(m => m.type === "consume" && rangeFilter(m.date)),
    [store.inventoryMoves, from, to]
  );

  const totals = useMemo(() => {
    const onlineRev = ordersInRange.reduce((s, x) => s + x.revenue, 0);
    const onlineCost = ordersInRange.reduce((s, x) => s + x.cost, 0);
    const onlineProfit = onlineRev - onlineCost;

    const resRev = reservationsInRange.reduce((s, x) => s + x.revenue, 0);
    const resCost = reservationsInRange.reduce((s, x) => s + x.cost, 0);
    const resProfit = resRev - resCost;

    // Treat payroll outflow: salary/advance/bonus = outflow; deduction = inflow (reduce outflow)
    const payrollOutflow = payrollInRange.reduce((s, x) => {
      const sign = x.type === "deduction" ? -1 : 1;
      return s + sign * x.amount;
    }, 0);

    // Inventory purchases cost (cash outflow) within range
    const inventoryPurchaseCost = invPurchasesInRange.reduce(
      (s, m) => s + (m.unitCost || 0) * m.qty,
      0
    );

    // Inventory consumption cost (COGS proxy) — approximate using current item unitCost
    const consumptionsCost = invConsumesInRange.reduce((s, m) => {
      const item = store.inventoryItems.find(i => i.id === m.itemId);
      return s + (item?.unitCost || 0) * m.qty;
    }, 0);

    // Net profit (high level, illustrative)
    const netProfit = onlineProfit + resProfit - payrollOutflow - inventoryPurchaseCost;

    return {
      onlineRev, onlineCost, onlineProfit,
      resRev, resCost, resProfit,
      payrollOutflow,
      inventoryPurchaseCost,
      consumptionsCost,
      netProfit,
    };
  }, [
    ordersInRange, reservationsInRange, payrollInRange,
    invPurchasesInRange, invConsumesInRange, store.inventoryItems
  ]);

  // ---------- Mutators (simulate backend) ----------
  function addOnlineOrder(p: Omit<OnlineOrder, "id">) {
    setStore(s => ({ ...s, onlineOrders: [{ id: uid(), ...p }, ...s.onlineOrders] }));
  }
  function addReservation(p: Omit<ReservationIncome, "id">) {
    setStore(s => ({ ...s, reservations: [{ id: uid(), ...p }, ...s.reservations] }));
  }
  function addInventoryItem(p: Omit<InventoryItem, "id">) {
    setStore(s => ({ ...s, inventoryItems: [{ id: uid(), ...p }, ...s.inventoryItems] }));
  }
  function addInventoryMove(p: Omit<InventoryMovement, "id">) {
    // Update stock & moving-average cost for purchases
    setStore(s => {
      const newMove = { id: uid(), ...p };
      const items = [...s.inventoryItems];
      const i = items.findIndex(it => it.id === p.itemId);
      if (i >= 0) {
        const item = { ...items[i] };
        if (p.type === "purchase") {
          const oldValue = item.unitCost * item.stockQty;
          const addValue = (p.unitCost || 0) * p.qty;
          const newQty = item.stockQty + p.qty;
          item.stockQty = newQty;
          item.unitCost = newQty > 0 ? (oldValue + addValue) / newQty : item.unitCost;
        } else {
          item.stockQty = Math.max(0, item.stockQty - p.qty);
        }
        items[i] = item;
      }
      return { ...s, inventoryItems: items, inventoryMoves: [newMove, ...s.inventoryMoves] };
    });
  }
  function addEmployee(p: Omit<Employee, "id">) {
    setStore(s => ({ ...s, employees: [{ id: uid(), ...p }, ...s.employees] }));
  }
  function addPayroll(p: Omit<PayrollTxn, "id">) {
    setStore(s => ({ ...s, payroll: [{ id: uid(), ...p }, ...s.payroll] }));
  }

  // ---------- Simple UI Controls ----------
  function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-neutral-500">{title}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {sub ? <div className="mt-1 text-xs text-neutral-500">{sub}</div> : null}
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: any }) {
    return (
      <section className="mt-6">
        <div className="mb-3 text-lg font-semibold">{title}</div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">{children}</div>
      </section>
    );
  }

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 text-sm font-medium rounded-xl border transition active:scale-[.98] ${
        tab === id
          ? "bg-black text-white border-black"
          : "bg-white text-black border-neutral-200 hover:bg-neutral-50"
      }`}
    >
      {label}
    </button>
  );

  // ---------- Forms (inline, minimal) ----------
  function OrdersForm() {
    const [date, setDate] = useState<ISODate>(todayStr());
    const [orderId, setOrderId] = useState("");
    const [revenue, setRevenue] = useState<number | "">("");
    const [cost, setCost] = useState<number | "">("");
    const [note, setNote] = useState("");

    function submit() {
      if (!orderId || revenue === "" || cost === "") return alert("Fill all required fields.");
      if (Number(revenue) < 0 || Number(cost) < 0) return alert("Numbers must be positive.");
      addOnlineOrder({ date, orderId, revenue: Number(revenue), cost: Number(cost), note });
      setOrderId(""); setRevenue(""); setCost(""); setNote("");
    }

    return (
      <div className="grid gap-2 sm:grid-cols-6">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="input sm:col-span-2" />
        <input placeholder="Order ID" value={orderId} onChange={e=>setOrderId(e.target.value)} className="input sm:col-span-2" />
        <input placeholder="Revenue (LKR)" inputMode="numeric" value={revenue} onChange={e=>setRevenue(numOnly(e.target.value))} className="input" />
        <input placeholder="Cost (LKR)" inputMode="numeric" value={cost} onChange={e=>setCost(numOnly(e.target.value))} className="input" />
        <input placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)} className="input sm:col-span-5" />
        <button onClick={submit} className="btn-primary">Add Online Order</button>
      </div>
    );
  }

  function ReservationsForm() {
    const [date, setDate] = useState<ISODate>(todayStr());
    const [reservationId, setReservationId] = useState("");
    const [revenue, setRevenue] = useState<number | "">("");
    const [cost, setCost] = useState<number | "">("");
    const [note, setNote] = useState("");

    function submit() {
      if (!reservationId || revenue === "" || cost === "") return alert("Fill all required fields.");
      if (Number(revenue) < 0 || Number(cost) < 0) return alert("Numbers must be positive.");
      addReservation({ date, reservationId, revenue: Number(revenue), cost: Number(cost), note });
      setReservationId(""); setRevenue(""); setCost(""); setNote("");
    }

    return (
      <div className="grid gap-2 sm:grid-cols-6">
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="input sm:col-span-2" />
        <input placeholder="Reservation ID" value={reservationId} onChange={e=>setReservationId(e.target.value)} className="input sm:col-span-2" />
        <input placeholder="Revenue (LKR)" inputMode="numeric" value={revenue} onChange={e=>setRevenue(numOnly(e.target.value))} className="input" />
        <input placeholder="Cost (LKR)" inputMode="numeric" value={cost} onChange={e=>setCost(numOnly(e.target.value))} className="input" />
        <input placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)} className="input sm:col-span-5" />
        <button onClick={submit} className="btn-primary">Add Reservation</button>
      </div>
    );
  }

  function InventoryForm() {
    // add item
    const [name, setName] = useState("");
    const [unit, setUnit] = useState("kg");
    const [unitCost, setUnitCost] = useState<number | "">("");
    const [stockQty, setStockQty] = useState<number | "">("");
    const [reorderLevel, setReorderLevel] = useState<number | "">("");
    const [category, setCategory] = useState("");

    function submitItem() {
      if (!name || unitCost === "" || stockQty === "" || reorderLevel === "") return alert("Fill all fields.");
      if (Number(unitCost) < 0 || Number(stockQty) < 0 || Number(reorderLevel) < 0) return alert("Numbers must be positive.");
      addInventoryItem({
        name, unit, unitCost: Number(unitCost), stockQty: Number(stockQty), reorderLevel: Number(reorderLevel), category
      });
      setName(""); setUnit("kg"); setUnitCost(""); setStockQty(""); setReorderLevel(""); setCategory("");
    }

    // movement
    const [mDate, setMDate] = useState<ISODate>(todayStr());
    const [mItem, setMItem] = useState<string>("");
    const [mType, setMType] = useState<"purchase"|"consume">("purchase");
    const [mQty, setMQty] = useState<number | "">("");
    const [mCost, setMCost] = useState<number | "">("");
    const [mNote, setMNote] = useState("");

    function submitMove() {
      if (!mItem || mQty === "") return alert("Pick item and qty.");
      if (Number(mQty) <= 0) return alert("Qty must be positive.");
      if (mType === "purchase" && (mCost === "" || Number(mCost) < 0)) return alert("Provide purchase unit cost.");
      addInventoryMove({
        date: mDate, itemId: mItem, type: mType, qty: Number(mQty), unitCost: mType === "purchase" ? Number(mCost) : undefined, note: mNote
      });
      setMQty(""); setMCost(""); setMNote("");
    }

    return (
      <div className="grid gap-6">
        <div>
          <div className="mb-2 font-medium">Add Raw Material</div>
          <div className="grid gap-2 sm:grid-cols-6">
            <input placeholder="Name (e.g., Rice)" value={name} onChange={e=>setName(e.target.value)} className="input sm:col-span-2" />
            <select value={unit} onChange={e=>setUnit(e.target.value)} className="input">
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="pcs">pcs</option>
            </select>
            <input placeholder="Unit Cost (LKR)" inputMode="numeric" value={unitCost} onChange={e=>setUnitCost(numOnly(e.target.value))} className="input" />
            <input placeholder="Initial Stock Qty" inputMode="numeric" value={stockQty} onChange={e=>setStockQty(numOnly(e.target.value))} className="input" />
            <input placeholder="Reorder Level" inputMode="numeric" value={reorderLevel} onChange={e=>setReorderLevel(numOnly(e.target.value))} className="input" />
            <input placeholder="Category (optional)" value={category} onChange={e=>setCategory(e.target.value)} className="input sm:col-span-2" />
            <button onClick={submitItem} className="btn-primary sm:col-span-1">Add Item</button>
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">Record Purchase / Consumption</div>
          <div className="grid gap-2 sm:grid-cols-6">
            <input type="date" value={mDate} onChange={e=>setMDate(e.target.value)} className="input" />
            <select value={mItem} onChange={e=>setMItem(e.target.value)} className="input sm:col-span-2">
              <option value="">Select Item</option>
              {store.inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <select value={mType} onChange={e=>setMType(e.target.value as any)} className="input">
              <option value="purchase">Purchase</option>
              <option value="consume">Consume</option>
            </select>
            <input placeholder="Qty" inputMode="numeric" value={mQty} onChange={e=>setMQty(numOnly(e.target.value))} className="input" />
            <input placeholder="Unit Cost (for Purchase)" inputMode="numeric" value={mCost} onChange={e=>setMCost(numOnly(e.target.value))} className="input" />
            <input placeholder="Note (optional)" value={mNote} onChange={e=>setMNote(e.target.value)} className="input sm:col-span-5" />
            <button onClick={submitMove} className="btn-primary">Add Movement</button>
          </div>
        </div>
      </div>
    );
  }

  function EmployeesForm() {
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [baseSalary, setBaseSalary] = useState<number | "">("");

    function submitEmp() {
      if (!name || !role || baseSalary === "") return alert("Fill all fields.");
      if (Number(baseSalary) < 0) return alert("Salary must be positive.");
      addEmployee({ name, role, baseSalary: Number(baseSalary) });
      setName(""); setRole(""); setBaseSalary("");
    }

    const [pDate, setPDate] = useState<ISODate>(todayStr());
    const [empId, setEmpId] = useState("");
    const [type, setType] = useState<PayrollTxn["type"]>("salary");
    const [amount, setAmount] = useState<number | "">("");
    const [note, setNote] = useState("");

    function submitPayroll() {
      if (!empId || amount === "") return alert("Pick employee and amount.");
      if (Number(amount) <= 0) return alert("Amount must be positive.");
      addPayroll({ date: pDate, employeeId: empId, type, amount: Number(amount), note });
      setAmount(""); setNote("");
    }

    return (
      <div className="grid gap-6">
        <div>
          <div className="mb-2 font-medium">Add Employee</div>
          <div className="grid gap-2 sm:grid-cols-5">
            <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} className="input" />
            <input placeholder="Role" value={role} onChange={e=>setRole(e.target.value)} className="input" />
            <input placeholder="Base Salary (LKR)" inputMode="numeric" value={baseSalary} onChange={e=>setBaseSalary(numOnly(e.target.value))} className="input" />
            <button onClick={submitEmp} className="btn-primary sm:col-span-1">Add</button>
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">Record Payroll Transaction</div>
          <div className="grid gap-2 sm:grid-cols-6">
            <input type="date" value={pDate} onChange={e=>setPDate(e.target.value)} className="input" />
            <select value={empId} onChange={e=>setEmpId(e.target.value)} className="input sm:col-span-2">
              <option value="">Select Employee</option>
              {store.employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
            </select>
            <select value={type} onChange={e=>setType(e.target.value as any)} className="input">
              <option value="salary">Salary</option>
              <option value="advance">Advance</option>
              <option value="bonus">Bonus</option>
              <option value="deduction">Deduction</option>
            </select>
            <input placeholder="Amount (LKR)" inputMode="numeric" value={amount} onChange={e=>setAmount(numOnly(e.target.value))} className="input" />
            <input placeholder="Note (optional)" value={note} onChange={e=>setNote(e.target.value)} className="input sm:col-span-2" />
            <button onClick={submitPayroll} className="btn-primary">Add Payroll</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Reports ----------
  function generateCSV() {
    // per-day rollup within range
    const days = enumerateDays(from, to);
    const rows = [["Date","Online Revenue","Online Cost","Online Profit","Reservation Revenue","Reservation Cost","Reservation Profit","Payroll Outflow","Inventory Purchases","Approx. COGS (Consumes)","Net Profit (illustrative)"]];

    days.forEach(d => {
      const o = store.onlineOrders.filter(x => x.date === d);
      const r = store.reservations.filter(x => x.date === d);
      const p = store.payroll.filter(x => x.date === d);
      const purchases = store.inventoryMoves.filter(x => x.date === d && x.type === "purchase");
      const consumes  = store.inventoryMoves.filter(x => x.date === d && x.type === "consume");

      const oRev = sum(o.map(x=>x.revenue));
      const oCost= sum(o.map(x=>x.cost));
      const oProfit = oRev - oCost;

      const rRev = sum(r.map(x=>x.revenue));
      const rCost= sum(r.map(x=>x.cost));
      const rProfit = rRev - rCost;

      const payroll = p.reduce((s, x) => s + (x.type==="deduction"? -1:1)*x.amount, 0);
      const invPurch = purchases.reduce((s, m) => s + (m.unitCost||0)*m.qty, 0);
      const cogs = consumes.reduce((s, m) => {
        const item = store.inventoryItems.find(i=>i.id===m.itemId);
        return s + (item?.unitCost||0)*m.qty;
      }, 0);

      const net = oProfit + rProfit - payroll - invPurch;

      rows.push([
        d, oRev.toString(), oCost.toString(), oProfit.toString(),
        rRev.toString(), rCost.toString(), rProfit.toString(),
        payroll.toString(), invPurch.toString(), cogs.toString(), net.toString()
      ]);
    });

    const csv = rows.map(r => r.map(wrapCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    downloadURL(url, `finance_report_${from}_to_${to}.csv`);
  }

  // ---------- Render ----------
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Management Admin</h1>
          <p className="text-sm text-neutral-600">Track revenue, costs, inventory & payroll. Generate CSV reports.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TabBtn id="dashboard" label="Dashboard" />
          <TabBtn id="revenues" label="Revenues" />
          <TabBtn id="inventory" label="Inventory" />
          <TabBtn id="employees" label="Employees" />
          <TabBtn id="reports" label="Reports" />
        </div>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-600">From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="input w-[160px]" />
          <label className="ml-2 text-sm text-neutral-600">To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="input w-[160px]" />
        </div>
      </div>

      {tab === "dashboard" && (
        <>
          <Section title="Key Metrics (selected range)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard title="Online Revenue" value={fmt.format(totals.onlineRev)} sub={`Cost ${fmt.format(totals.onlineCost)}`} />
              <StatCard title="Online Profit" value={fmt.format(totals.onlineProfit)} />
              <StatCard title="Reservation Revenue" value={fmt.format(totals.resRev)} sub={`Cost ${fmt.format(totals.resCost)}`} />
              <StatCard title="Reservation Profit" value={fmt.format(totals.resProfit)} />
              <StatCard title="Payroll Outflow" value={fmt.format(totals.payrollOutflow)} />
              <StatCard title="Inventory Purchases (Cash)" value={fmt.format(totals.inventoryPurchaseCost)} sub={`Approx. COGS (Consumes) ${fmt.format(totals.consumptionsCost)}`} />
            </div>

            <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700">
              <div className="font-semibold">Illustrative Net Profit (range)</div>
              <div className="mt-1">{fmt.format(totals.netProfit)}</div>
              <div className="mt-1 text-xs text-neutral-500">Net ≈ (Online Profit + Reservation Profit) − Payroll − Inventory Purchases. (Consumes shown separately as COGS proxy.)</div>
            </div>
          </Section>

          <Section title="Low Stock Alerts">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {store.inventoryItems
                .filter(i => i.stockQty <= i.reorderLevel)
                .map(i => (
                  <div key={i.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-neutral-600">Stock: {i.stockQty} {i.unit} • Reorder ≤ {i.reorderLevel}</div>
                    <div className="text-neutral-500">Unit cost: {fmt.format(i.unitCost)}</div>
                  </div>
                ))}
              {store.inventoryItems.filter(i => i.stockQty <= i.reorderLevel).length === 0 && (
                <div className="text-sm text-neutral-600">No low-stock items 🎉</div>
              )}
            </div>
          </Section>
        </>
      )}

      {tab === "revenues" && (
        <>
          <Section title="Add Online Order (Daily Profit from Online Orders)">
            <OrdersForm />
          </Section>
          <Section title="Add Reservation (Daily Profit from Reservations)">
            <ReservationsForm />
          </Section>

          <Section title="Recent Entries (within range)">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 font-medium">Online Orders</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500">
                      <th className="py-2">Date</th>
                      <th>Order</th>
                      <th>Revenue</th>
                      <th>Cost</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersInRange.map(x => (
                      <tr key={x.id} className="border-t">
                        <td className="py-2">{x.date}</td>
                        <td>{x.orderId}</td>
                        <td>{fmt.format(x.revenue)}</td>
                        <td>{fmt.format(x.cost)}</td>
                        <td className={x.revenue - x.cost >= 0 ? "text-green-600" : "text-red-600"}>
                          {fmt.format(x.revenue - x.cost)}
                        </td>
                      </tr>
                    ))}
                    {ordersInRange.length === 0 && <tr><td className="py-2 text-neutral-500" colSpan={5}>No orders in range</td></tr>}
                  </tbody>
                </table>
              </div>

              <div>
                <div className="mb-2 font-medium">Reservations</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500">
                      <th className="py-2">Date</th>
                      <th>Reservation</th>
                      <th>Revenue</th>
                      <th>Cost</th>
                      <th>Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservationsInRange.map(x => (
                      <tr key={x.id} className="border-t">
                        <td className="py-2">{x.date}</td>
                        <td>{x.reservationId}</td>
                        <td>{fmt.format(x.revenue)}</td>
                        <td>{fmt.format(x.cost)}</td>
                        <td className={x.revenue - x.cost >= 0 ? "text-green-600" : "text-red-600"}>
                          {fmt.format(x.revenue - x.cost)}
                        </td>
                      </tr>
                    ))}
                    {reservationsInRange.length === 0 && <tr><td className="py-2 text-neutral-500" colSpan={5}>No reservations in range</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        </>
      )}

      {tab === "inventory" && (
        <>
          <Section title="Manage Raw Materials (Inventory Finance)">
            <InventoryForm />
          </Section>

          <Section title="Inventory Snapshot">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2">Item</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Unit Cost</th>
                  <th>Stock</th>
                  <th>Reorder</th>
                  <th>Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {store.inventoryItems.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="py-2">{i.name}</td>
                    <td>{i.category || "-"}</td>
                    <td>{i.unit}</td>
                    <td>{fmt.format(i.unitCost)}</td>
                    <td>{i.stockQty}</td>
                    <td>{i.reorderLevel}</td>
                    <td>{fmt.format(i.unitCost * i.stockQty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Inventory Movements (within range)">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2">Date</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>Total</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {store.inventoryMoves.filter(m=>rangeFilter(m.date)).map(m => {
                  const it = store.inventoryItems.find(i=>i.id===m.itemId);
                  const unitCost = m.type==="purchase" ? (m.unitCost||0) : (it?.unitCost||0);
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="py-2">{m.date}</td>
                      <td>{it?.name || m.itemId}</td>
                      <td className={m.type==="purchase" ? "text-blue-600" : "text-amber-700"}>{m.type}</td>
                      <td>{m.qty} {it?.unit}</td>
                      <td>{fmt.format(unitCost)}</td>
                      <td>{fmt.format(unitCost * m.qty)}</td>
                      <td>{m.note || "-"}</td>
                    </tr>
                  );
                })}
                {store.inventoryMoves.filter(m=>rangeFilter(m.date)).length===0 && (
                  <tr><td className="py-2 text-neutral-500" colSpan={7}>No movements in range</td></tr>
                )}
              </tbody>
            </table>
          </Section>
        </>
      )}

      {tab === "employees" && (
        <>
          <Section title="Employee Finance">
            <EmployeesForm />
          </Section>

          <Section title="Employees">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2">Employee</th>
                  <th>Role</th>
                  <th>Base Salary</th>
                </tr>
              </thead>
              <tbody>
                {store.employees.map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="py-2">{e.name}</td>
                    <td>{e.role}</td>
                    <td>{fmt.format(e.baseSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Payroll Transactions (within range)">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2">Date</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {payrollInRange.map(p => {
                  const emp = store.employees.find(e=>e.id===p.employeeId);
                  const sign = p.type==="deduction" ? "-" : "";
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="py-2">{p.date}</td>
                      <td>{emp?.name || p.employeeId}</td>
                      <td>{p.type}</td>
                      <td className={p.type==="deduction" ? "text-green-700" : "text-red-700"}>
                        {sign}{fmt.format(p.amount)}
                      </td>
                      <td>{p.note || "-"}</td>
                    </tr>
                  );
                })}
                {payrollInRange.length === 0 && <tr><td className="py-2 text-neutral-500" colSpan={5}>No payroll entries in range</td></tr>}
              </tbody>
            </table>
          </Section>
        </>
      )}

      {tab === "reports" && (
        <>
          <Section title="Generate Report">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={generateCSV} className="btn-primary">Download CSV (Summary by Day)</button>
              <button onClick={() => window.print()} className="btn-outline">Print Page</button>
            </div>
            <div className="mt-3 text-sm text-neutral-600">
              CSV includes per-day: Online/Reservation revenue, costs, profits, payroll outflow, inventory purchases, approximate COGS (consumes), and an illustrative Net Profit.
            </div>
          </Section>
        </>
      )}

      <footer className="mt-10 text-center text-xs text-neutral-500">
        Built for your admin folder. Replace the in-file mock layer with real APIs/MongoDB when ready.
      </footer>

      {/* tiny styles */}
      <style jsx>{`
        .input {
          @apply w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10;
        }
        .btn-primary {
          @apply rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 active:scale-[.98];
        }
        .btn-outline {
          @apply rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50 active:scale-[.98];
        }
      `}</style>
    </div>
  );
}

// ---------- Tiny utils ----------
function numOnly(v: string): number | "" {
  // block letters/signs; allow only digits and optional dot
  const cleaned = v.replace(/[^\d.]/g, "");
  // disallow negative by removing leading '-'
  if (cleaned === "") return "";
  const n = Number(cleaned);
  return Number.isNaN(n) ? "" : n;
}
function sum(arr: number[]) { return arr.reduce((s, x) => s + x, 0); }
function enumerateDays(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const s = new Date(from+"T00:00:00");
  const e = new Date(to+"T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) {
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    out.push(`${d.getFullYear()}-${mm}-${dd}`);
  }
  return out;
}
function wrapCSV(x: string) {
  if (x == null) return "";
  const s = String(x);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadURL(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
