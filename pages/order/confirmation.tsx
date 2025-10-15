// pages/order/confirmation.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Item = { name: string; qty: number; unitPrice: number; lineTotal: number };
type OrderPayload = {
  orderId: string;
  status: "confirmed" | "preparing" | "ready" | "completed" | "cancelled" | string;
  revenue: number;
  cost: number;
  date: string; // YYYY-MM-DD
  items: Item[];
  customer?: { name?: string; email?: string; phone?: string };
  fulfilment?: any;
  note?: string;
  qrDataUrl: string;
};

export default function OrderConfirmationPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderPayload | null>(null);

  const qs = useMemo(() => new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""), []);
  const session_id = qs.get("session_id");
  const orderId = qs.get("orderId");

  const fetchOrder = useCallback(async () => {
    if (!session_id && !orderId) {
      setErr("Missing order identifier.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const query = session_id
        ? `session_id=${encodeURIComponent(session_id)}`
        : `orderId=${encodeURIComponent(orderId!)}`;
      const res = await fetch(`/api/orders/confirm?${query}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error || "Failed to load order.");
        setOrder(null);
      } else {
        setErr(null);
        setOrder(json.order as OrderPayload);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load order.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [session_id, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // (Optional) auto-refresh every 20s so the user sees updates after kitchen changes status
  useEffect(() => {
    const id = setInterval(() => fetchOrder(), 20000);
    return () => clearInterval(id);
  }, [fetchOrder]);

  const totalQty = useMemo(() => {
    return order?.items?.reduce((s, i) => s + (i.qty || 0), 0) ?? 0;
  }, [order]);

  const statusChip = (s: string) => {
    const tone =
      s === "ready" ? "bg-green-100 text-green-800"
      : s === "preparing" ? "bg-amber-100 text-amber-800"
      : s === "completed" ? "bg-blue-100 text-blue-800"
      : s === "cancelled" ? "bg-red-100 text-red-800"
      : "bg-neutral-100 text-neutral-800";
    const label = s?.charAt(0)?.toUpperCase() + s?.slice(1);
    return <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{label || "Confirmed"}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="h-10 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="mt-6 h-24 animate-pulse rounded-xl bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="text-2xl font-semibold">Order confirmation</h1>
          <p className="mt-3 text-red-600">Error: {err || "Unknown error"}</p>
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => location.reload()}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100"
            >
              Refresh
            </button>
            <Link href="/" className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <div className="mx-auto max-w-3xl px-6 pt-14">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Order confirmed 🎉</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Save this page. You can refresh to see live status updates from our kitchen.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchOrder()}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100"
            >
              Refresh status
            </button>
            <Link
              href="/"
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.4fr_0.6fr]">
          {/* Left: Details */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-500">Order ID</p>
                <p className="font-mono text-sm">{order.orderId}</p>
              </div>
              {statusChip(order.status || "confirmed")}
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Date</span>
                <span>{order.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Items</span>
                <span>{totalQty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Total paid</span>
                <span className="font-semibold">Rs. {Math.round(order.revenue).toLocaleString()}</span>
              </div>
            </div>

            {/* Items table */}
            <div className="mt-6 overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{it.name}</td>
                      <td className="px-3 py-2 text-center">{it.qty}</td>
                      <td className="px-3 py-2 text-right">Rs. {it.unitPrice.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">Rs. {it.lineTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.customer?.name || order.customer?.email || order.customer?.phone ? (
              <div className="mt-6 grid gap-2 rounded-xl bg-neutral-50 p-4 text-sm">
                <p className="font-medium">Customer</p>
                {order.customer?.name ? <p>Name: {order.customer.name}</p> : null}
                {order.customer?.email ? <p>Email: {order.customer.email}</p> : null}
                {order.customer?.phone ? <p>Phone: {order.customer.phone}</p> : null}
              </div>
            ) : null}

            <div className="mt-6 flex gap-2">
              <a
                href={`/api/orders/receipt.pdf?orderId=${encodeURIComponent(order.orderId)}`}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
              >
                Download receipt (PDF)
              </a>
              {/* Track button now just reloads this same page (no separate /track page) */}
              <button
                onClick={() => fetchOrder()}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Refresh status
              </button>
            </div>
          </section>

          {/* Right: QR */}
          <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium">Scan to view your order</p>
            <img
              src={order.qrDataUrl}
              alt="Order QR"
              className="mt-4 h-auto w-full max-w-[220px] rounded-xl border"
            />
            <p className="mt-3 text-xs text-neutral-500">
              Open this page later to check updated status. You can also hit “Refresh status”.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
