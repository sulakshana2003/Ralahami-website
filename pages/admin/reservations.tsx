/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import useSWR from "swr";
import { useMemo } from "react";

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

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const cls = {
  input:
    "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10",
  btn: "rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 active:scale-[.98]",
  btnGhost:
    "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50",
  card: "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
};
const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
});
const today = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function ReservationAdminPage() {
  const { data: reservations, mutate } = useSWR<Reservation[]>(
    "/api/reservations/reservations",
    fetcher
  );

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

  async function addReservation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
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

    const r = await fetch("/api/reservations/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return alert(await r.text());
    form.reset();
    mutate();
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
    <div className="mx-auto max-w-7xl p-4 sm:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservation Admin</h1>
          <p className="text-sm text-neutral-600">
            Manage table reservations and track payments.
          </p>
        </div>
      </header>

      {/* Summary */}
      <section className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="Total Reservations" value={stats.total.toString()} />
          <Stat title="Confirmed" value={stats.confirmed.toString()} />
          <Stat title="Cancelled" value={stats.cancelled.toString()} />
          <Stat title="Revenue" value={fmt.format(stats.revenue)} />
        </div>
      </section>

      {/* Add Reservation */}
      <section className="mb-6">
        <div className="mb-3 text-lg font-semibold">Add Reservation</div>
        <form
          onSubmit={addReservation}
          className={cls.card + " grid gap-2 sm:grid-cols-4"}
        >
          <input
            name="name"
            placeholder="Name"
            className={cls.input}
            required
          />
          <input
            name="email"
            placeholder="Email"
            className={cls.input}
            required
          />
          <input name="phone" placeholder="Phone" className={cls.input} />
          <input
            name="date"
            type="date"
            defaultValue={today()}
            className={cls.input}
            required
          />
          <input name="slot" type="time" className={cls.input} required />
          <input
            name="partySize"
            type="number"
            min={1}
            max={100}
            placeholder="Party Size"
            className={cls.input}
            required
          />
          <input
            name="amount"
            type="number"
            min={0}
            placeholder="Amount (LKR)"
            className={cls.input}
          />
          <select name="paymentMethod" className={cls.input}>
            <option value="">Method</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online</option>
          </select>
          <select name="paymentStatus" className={cls.input}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <input
            name="notes"
            placeholder="Notes (optional)"
            className={cls.input + " sm:col-span-2"}
          />
          <button className={cls.btn + " sm:col-span-1"}>Add</button>
        </form>
      </section>

      {/* Reservations Table */}
      <section>
        <div className="mb-3 text-lg font-semibold">Reservations</div>
        <div className={cls.card + " overflow-x-auto"}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">Date</th>
                <th>Slot</th>
                <th>Name</th>
                <th>Party</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Method</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="py-2">{r.date}</td>
                  <td>{r.slot}</td>
                  <td>{r.name}</td>
                  <td>{r.partySize}</td>
                  <td>
                    <select
                      value={r.status}
                      onChange={(e) =>
                        updateReservation(r._id, { status: e.target.value })
                      }
                      className={cls.input}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={r.paymentStatus}
                      onChange={(e) =>
                        updateReservation(r._id, {
                          paymentStatus: e.target.value,
                        })
                      }
                      className={cls.input}
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                    </select>
                  </td>
                  <td>{r.paymentMethod || "-"}</td>
                  <td>{fmt.format(r.amount || 0)}</td>
                  <td className="text-right">
                    <button
                      onClick={() => deleteReservation(r._id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-neutral-500">
                    No reservations yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
