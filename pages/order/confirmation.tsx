/* eslint-disable @typescript-eslint/no-explicit-any */
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

// Lazy-load QR renderer only in the browser
const QRCodeCanvas = dynamic(async () => (await import("qrcode.react")).QRCodeCanvas, {
  ssr: false,
});

/* ----------------------------- Types ----------------------------- */
type Line = { name: string; qty: number; unitPrice: number; lineTotal: number };

type NormalizedOrder = {
  orderId: string;
  status: string;
  revenue: number;
  cost: number;
  date: string; // YYYY-MM-DD
  items: Line[];
  customer?: { name?: string; email?: string; phone?: string };
  note?: string;
  // trackUrl may not always be returned, so we compute a fallback
  trackUrl?: string;
};

const fmt = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 0,
});
const rs = (n?: number) => fmt.format(Math.round(n ?? 0));

const STATUS_COLORS: Record<string, string> = {
  confirmed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  preparing:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  ready:
    "bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  completed:
    "bg-gray-50 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:ring-gray-500/30",
  cancelled:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
};

/* ----------------------------- Page ------------------------------ */
export default function OrderConfirmPage() {
  const router = useRouter();
  const { session_id, orderId: orderIdQ } = router.query as {
    session_id?: string;
    orderId?: string;
  };

  const [order, setOrder] = useState<NormalizedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // First load: hit /api/orders/confirm (this also emails & stores DB if session_id present)
  useEffect(() => {
    if (!router.isReady) return;
    const controller = new AbortController();

    const run = async () => {
      const p = new URLSearchParams();
      if (session_id) p.set("session_id", session_id);
      if (orderIdQ) p.set("orderId", orderIdQ);

      if (![...p.keys()].length) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/orders/confirm?${p.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Confirm failed");

        const o: NormalizedOrder = data.order;
        setOrder(o);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [router.isReady, session_id, orderIdQ]);

  const oid = order?.orderId ?? orderIdQ ?? "";
  const trackUrl =
    order?.trackUrl || `${process.env.NEXT_PUBLIC_HOST_URL || ""}/order/track?orderId=${encodeURIComponent(oid)}`;

  // Poll public status every 5s (only when we have an orderId)
  useEffect(() => {
    if (!oid) return;
    setPolling(true);

    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/public-status?orderId=${encodeURIComponent(oid)}`);
        const data = await res.json();
        if (res.ok) {
          setOrder((prev) =>
            prev
              ? { ...prev, status: data.status, date: data.date ?? prev.date, revenue: data.revenue ?? prev.revenue }
              : {
                  orderId: oid,
                  status: data.status,
                  revenue: data.revenue,
                  cost: data.cost,
                  date: data.date,
                  items: [],
                }
          );
        }
      } catch (e) {
        // ignore transient errors; next tick will retry
      }
    };

    tick();
    pollRef.current = setInterval(tick, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      setPolling(false);
    };
  }, [oid]);

  const items = order?.items ?? [];
  const totalQty = useMemo(() => items.reduce((s, i) => s + (Number(i.qty) || 0), 0), [items]);

  return (
    <>
      <Head>
        <title>Order confirmed</title>
      </Head>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Order confirmed 🎉</h1>
            <p className="text-sm text-neutral-600">
              Save this page. It will auto-update as we prepare your order.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.reload()}
              className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50"
            >
              Refresh status
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-black text-white hover:bg-neutral-800"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        {/* Card + Aside */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
          {/* Main Card */}
          <section className="rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur p-4 sm:p-6">
            {loading && <p className="text-neutral-500">Finalizing your order…</p>}

            {!loading && order && (
              <>
                {/* Meta */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                  <div className="col-span-2">
                    <div className="text-neutral-500">Order ID</div>
                    <div className="flex items-center gap-2">
                      <code className="text-[13px] break-all">{order.orderId}</code>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ring-1 ${
                          STATUS_COLORS[order.status] || STATUS_COLORS.confirmed
                        }`}
                        title={polling ? "Auto-updating…" : "Idle"}
                      >
                        {order.status[0]?.toUpperCase()}
                        {order.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-neutral-500">Date</div>
                    <div className="font-medium">{order.date}</div>
                  </div>

                  <div>
                    <div className="text-neutral-500">Total paid</div>
                    <div className="font-semibold">{rs(order.revenue)}</div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mt-4">
                  <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-neutral-50 text-neutral-700">
                        <tr>
                          <th className="text-left px-3 py-2">Item</th>
                          <th className="text-right px-3 py-2">Qty</th>
                          <th className="text-right px-3 py-2">Price</th>
                          <th className="text-right px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx} className="border-t border-neutral-200">
                            <td className="px-3 py-2">{it.name}</td>
                            <td className="px-3 py-2 text-right">{it.qty}</td>
                            <td className="px-3 py-2 text-right">{rs(it.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-medium">{rs(it.lineTotal)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-neutral-200 bg-neutral-50">
                          <td className="px-3 py-2 font-medium">Total</td>
                          <td className="px-3 py-2 text-right font-medium">{totalQty}</td>
                          <td></td>
                          <td className="px-3 py-2 text-right font-semibold">{rs(order.revenue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Customer */}
                {(order.customer?.name || order.customer?.email || order.customer?.phone) && (
                  <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-medium mb-2">Customer</div>
                    {order.customer?.name && (
                      <div className="text-sm">
                        <span className="text-neutral-500">Name: </span>
                        {order.customer.name}
                      </div>
                    )}
                    {order.customer?.email && (
                      <div className="text-sm">
                        <span className="text-neutral-500">Email: </span>
                        {order.customer.email}
                      </div>
                    )}
                    {order.customer?.phone && (
                      <div className="text-sm">
                        <span className="text-neutral-500">Phone: </span>
                        {order.customer.phone}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {oid && (
                    <a
                      className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50"
                      href={`/api/orders/receipt.pdf?orderId=${encodeURIComponent(oid)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download receipt (PDF)
                    </a>
                  )}
                  <button
                    onClick={() => router.reload()}
                    className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800"
                  >
                    Refresh status
                  </button>
                </div>
              </>
            )}
          </section>

          {/* Aside with QR */}
          <aside className="rounded-2xl border border-neutral-200 bg-white/70 backdrop-blur p-4 lg:sticky lg:top-8 h-fit">
            <div className="text-sm font-semibold leading-tight">Scan to view your order</div>
            <div className="mt-2">
              {oid && (
                <div className="p-2 rounded-xl border border-neutral-200 inline-block bg-white">
                  <div className="w-[168px] h-[168px] flex items-center justify-center">
                    {/* Fallback text if QR lib not yet loaded */}
                    {typeof window === "undefined" ? (
                      <div className="text-xs text-neutral-500">Loading QR…</div>
                    ) : (
                      <QRCodeCanvas
                        id="order-qr"
                        value={trackUrl}
                        size={160}
                        includeMargin={false}
                        level="M"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[12px] text-neutral-500 mt-3">
              Open this page later to check updated status. You can also hit “Refresh status”.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
