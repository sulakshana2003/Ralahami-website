/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiUsers,
} from "react-icons/fi";

interface Reservation {
  _id: string;
  name: string;
  email: string;
  date: string;
  slot: string;
  partySize: number;
  amount: number;
  status: "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid" | "unpaid";
  paymentMethod?: "cash" | "card" | "online";
}

export default function ReservationFinance() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalReservations, setTotalReservations] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [cancelled, setCancelled] = useState(0);

  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await axios.get("/api/reservations/reservations"); // ✅ Make sure file path matches this endpoint
        const data = res.data || [];
        setReservations(data);

        const total = data.length;
        const totalPaid = data
          .filter((r: Reservation) => r.paymentStatus === "paid")
          .reduce((acc: number, r: Reservation) => acc + (r.amount || 0), 0);

        const pending = data
          .filter((r: Reservation) => r.paymentStatus === "pending")
          .reduce((acc: number, r: Reservation) => acc + (r.amount || 0), 0);

        const cancelledCount = data.filter(
          (r: Reservation) => r.status === "cancelled"
        ).length;

        setTotalReservations(total);
        setTotalRevenue(totalPaid);
        setPendingRevenue(pending);
        setCancelled(cancelledCount);
      } catch (err) {
        console.error("❌ Failed to fetch reservation data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReservations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-emerald-600">
        Loading reservation data...
      </div>
    );
  }

  return (
    <section className="p-6 space-y-8">
      <h2 className="text-2xl font-semibold text-gray-800">
        Reservation Finance Overview
      </h2>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiCalendar className="text-2xl text-blue-500 mb-2" />
          <p className="text-sm text-gray-500">Total Reservations</p>
          <p className="text-2xl font-bold text-gray-800">
            {totalReservations}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiDollarSign className="text-2xl text-emerald-600 mb-2" />
          <p className="text-sm text-gray-500">Total Revenue (Paid)</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiClock className="text-2xl text-amber-500 mb-2" />
          <p className="text-sm text-gray-500">Pending Payments</p>
          <p className="text-2xl font-bold text-gray-800">
            LKR {pendingRevenue.toLocaleString()}
          </p>
        </div>

        <div className="p-5 bg-white border rounded-xl shadow-sm">
          <FiUsers className="text-2xl text-rose-500 mb-2" />
          <p className="text-sm text-gray-500">Cancelled Reservations</p>
          <p className="text-2xl font-bold text-gray-800">{cancelled}</p>
        </div>
      </div>

      {/* Reservation Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Reservation Transactions
        </h3>
        <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-emerald-50 text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Party Size</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-5 text-center text-gray-500"
                  >
                    No reservations found.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r._id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{r.date}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.email}</td>
                    <td className="px-4 py-3">{r.slot}</td>
                    <td className="px-4 py-3">{r.partySize}</td>
                    <td className="px-4 py-3">
                      LKR {r.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          r.paymentStatus === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.paymentStatus === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          r.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
