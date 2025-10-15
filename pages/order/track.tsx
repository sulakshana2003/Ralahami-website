// pages/order/track.tsx
import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { name: string; qty: number; unitPrice: number; lineTotal: number };
type OrderPayload = {
  orderId: string;
  status: "confirmed" | "processing" | "preparing" | "ready" | "completed" | "cancelled";
  date: string;
  items: Item[];
  revenue: number;
};

export default function TrackOrderPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderPayload | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");
    const session_id = params.get("session_id") || params.get("sessionId");

    if (!orderId && !session_id) {
      setErr("Missing orderId or session_id.");
      setLoading(false);
      return;
    }

    const run = async () => {
      setLoading(true);
      try {
        const qs = orderId
          ? `orderId=${encodeURIComponent(orderId)}`
          : `session_id=${encodeURIComponent(session_id!)}`;

        const res = await fetch(`/api/orders/track?${qs}`);
        const json = await res.json();
        if (!res.ok) {
          setErr(json?.error || "Failed to load order.");
        } else {
          setOrder(json.order);
        }
      } catch (e: any) {
        setErr(e?.message || "Failed to load order.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="h-8 w-44 animate-pulse rounded bg-neutral-200" />
          <div className="mt-6 h-24 animate-pulse rounded-2xl bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="text-2xl font-semibold">Track order</h1>
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {err || "Unknown error"}
          </p>
          <Link href="/" className="mt-6 inline-block rounded-xl border px-4 py-2 text-sm">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <div className="mx-auto max-w-3xl px-6 pt-14">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Track order</h1>
          <Link
            href="/"
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-100"
          >
            Continue shopping
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500">Order ID</p>
              <p className="font-mono text-sm">{order.orderId}</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
              {order.status}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Date</span>
              <span>{order.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Items</span>
              <span>{order.items.reduce((s, i) => s + i.qty, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Total</span>
              <span className="font-semibold">
                Rs. {Math.round(order.revenue).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium">Items</p>
          <ul className="mt-3 divide-y">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span>{it.name} × {it.qty}</span>
                <span>Rs. {it.lineTotal.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
