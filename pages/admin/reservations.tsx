/* eslint-disable @typescript-eslint/no-explicit-any */
import useSWR from "swr";
import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import AdminGuard from "../components/AdminGuard";

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

function Button({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost:
      "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm active:scale-[.98] transition ${
        styles[tone]
      } ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-200 ${
        props.className || ""
      }`}
    />
  );
}
function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-black"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">{children}</div>
          {footer && (
            <div className="mt-6 flex justify-end gap-2">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

type Reservation = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  date: string;
  slot: string;
  partySize: number;
  notes?: string;
  status: "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid" | "unpaid";
  paymentMethod?: "cash" | "card" | "online";
  amount: number;
};

export default function ReservationAdminPage() {
  // 🔎 filter states
  const [filterName, setFilterName] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const query = `/api/reservations/reservations?name=${encodeURIComponent(
    filterName
  )}&partySize=${encodeURIComponent(filterParty)}&date=${encodeURIComponent(
    filterDate
  )}`;

  const { data: reservations, mutate } = useSWR<Reservation[]>(query, fetcher);
  const list = Array.isArray(reservations) ? reservations : [];

  const stats = useMemo(() => {
    const total = list.length;
    const confirmed = list.filter((r) => r.status === "confirmed").length;
    const cancelled = list.filter((r) => r.status === "cancelled").length;
    const revenue = list
      .filter((r) => r.paymentStatus === "paid")
      .reduce((s, r) => s + (r.amount || 0), 0);
    return { total, confirmed, cancelled, revenue };
  }, [list]);

  const [isOpen, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function addReservation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name")?.toString() || "",
      email: fd.get("email")?.toString() || "",
      phone: fd.get("phone")?.toString() || "",
      date: fd.get("date")?.toString() || "",
      slot: fd.get("slot")?.toString() || "",
      partySize: Number(fd.get("partySize") || 0),
      amount: Number(fd.get("amount") || 0),
      paymentMethod: fd.get("paymentMethod")?.toString() || "",
      paymentStatus: fd.get("paymentStatus")?.toString() || "pending",
      notes: fd.get("notes")?.toString() || "",
    };
    setBusy(true);
    const r = await fetch("/api/reservations/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) return alert(await r.text());
    e.currentTarget.reset();
    mutate();
    setOpen(false);
  }

  async function updateReservation(id: string, updates: any) {
    const r = await fetch("/api/reservations/reservations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!r.ok) return alert(await r.text());
    mutate();
  }

  async function deleteReservation(id: string) {
    if (!confirm("Delete this reservation?")) return;
    const r = await fetch(`/api/reservations/reservations?id=${id}`, {
      method: "DELETE",
    });
    if (!r.ok) return alert(await r.text());
    mutate();
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reservation Management</h1>
            <p className="text-sm text-neutral-500">
              Track table bookings and payments
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>+ New Reservation</Button>
        </div>

        {/* 🔎 Filters */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Input
            placeholder="Filter by Name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Filter by Party Size"
            value={filterParty}
            onChange={(e) => setFilterParty(e.target.value)}
          />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard title="Total Reservations" value={stats.total} />
          <StatCard title="Confirmed" value={stats.confirmed} />
          <StatCard title="Cancelled" value={stats.cancelled} />
          <StatCard title="Revenue" value={fmt.format(stats.revenue)} />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2">Slot</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Party</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3">{r.slot}</td>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3">{r.partySize}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={r.status}
                      onChange={(e) =>
                        updateReservation(r._id, { status: e.target.value })
                      }
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={r.paymentStatus}
                      onChange={(e) =>
                        updateReservation(r._id, {
                          paymentStatus: e.target.value,
                        })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3">{r.paymentMethod || "-"}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      value={r.amount}
                      onChange={(e) =>
                        updateReservation(r._id, {
                          amount: Number(e.target.value || 0),
                        })
                      }
                      className="w-24 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button tone="danger" onClick={() => deleteReservation(r._id)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-neutral-500">
                    No reservations yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        <Modal
          open={isOpen}
          onClose={() => setOpen(false)}
          title="Create Reservation"
          footer={
            <>
              <Button tone="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  (document.getElementById("resForm") as HTMLFormElement)?.requestSubmit()
                }
                disabled={busy}
              >
                Save
              </Button>
            </>
          }
        >
          <form
            id="resForm"
            onSubmit={addReservation}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Input name="name" placeholder="Name" required />
            <Input name="email" placeholder="Email" required />
            <Input name="phone" placeholder="Phone" />
            <Input type="date" name="date" defaultValue={today()} required />
            <Input type="time" name="slot" required />
            <Input
              type="number"
              name="partySize"
              placeholder="Party Size"
              min={1}
              max={100}
              required
            />
            <Input type="number" name="amount" placeholder="Amount (LKR)" min={0} />
            <Select name="paymentMethod">
              <option value="">Method</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </Select>
            <Select name="paymentStatus" defaultValue="pending">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </Select>
            <Input
              name="notes"
              placeholder="Notes (optional)"
              className="sm:col-span-2"
            />
          </form>
        </Modal>
      </DashboardLayout>
    </AdminGuard>
  );
}
