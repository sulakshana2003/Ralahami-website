import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/hooks/useCart";

const FREE_DELIVERY_THRESHOLD = 5000; // LKR

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeFromCart = useCart((s) => s.remove);
  const clearCart = useCart((s) => s.clear);
  const subtotal = useCart((s) => s.subtotal());

  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const discount = useMemo(() => {
    if (appliedPromo?.toUpperCase() === "WELCOME10") return subtotal * 0.1;
    return 0;
  }, [appliedPromo, subtotal]);

  const total = Math.max(0, subtotal - discount);
  const progress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  if (!items || items.length === 0) {
    return (
      <div className="pt-28 pb-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-neutral-100 p-4">
            <div className="flex h-full w-full items-center justify-center text-3xl">🛒</div>
          </div>
          <h1 className="text-2xl font-semibold">Your cart is empty</h1>
          <p className="mt-2 text-neutral-600">Let’s fix that — explore our menu and add your favourites.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Browse Menu →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.8fr_1fr]">
        <section className="space-y-4">
          <header className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Your Cart</h1>
              <p className="mt-1 text-sm text-neutral-600">
                {items.length} {items.length === 1 ? "item" : "items"} · Subtotal:{" "}
                <span className="font-medium text-neutral-900">Rs. {subtotal.toLocaleString()}</span>
              </p>
            </div>
            <button
              onClick={() => clearCart()}
              className="text-sm text-neutral-600 underline-offset-4 hover:text-black hover:underline"
            >
              Clear cart
            </button>
          </header>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <ul className="divide-y">
              {items.map((it) => (
                <li key={it.slug} className="group grid gap-4 p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center">
                  <div className="relative h-24 w-full overflow-hidden rounded-xl sm:h-24 sm:w-24">
                    {it.image ? (
                      <Image src={it.image} alt={it.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-neutral-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{it.name}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">Unit: Rs. {it.unitPrice.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(it.slug)}
                        className="rounded-full px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-red-600"
                        aria-label="Remove"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="text-xs text-neutral-600">Qty</label>
                      <div className="inline-flex items-center rounded-full border border-neutral-300">
                        <button
                          onClick={() => setQty(it.slug, Math.max(1, it.qty - 1))}
                          className="h-8 w-8 leading-none hover:bg-neutral-50"
                          aria-label="Decrease"
                        >
                          –
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => setQty(it.slug, Math.max(1, parseInt(e.target.value || "1", 10)))}
                          className="h-8 w-14 border-x border-neutral-300 text-center text-sm outline-none"
                        />
                        <button
                          onClick={() => setQty(it.slug, it.qty + 1)}
                          className="h-8 w-8 leading-none hover:bg-neutral-50"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="self-start text-right sm:self-center">
                    <p className="font-semibold">Rs. {(it.unitPrice * it.qty).toLocaleString()}</p>
                    <p className="mt-1 text-xs text-neutral-500">incl. item total</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="lg:sticky lg:top-24">
          <div className="mb-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            {subtotal >= FREE_DELIVERY_THRESHOLD ? (
              <p className="text-sm font-medium text-green-700">🎉 You’ve unlocked free delivery!</p>
            ) : (
              <>
                <p className="text-sm text-neutral-700">
                  You’re <span className="font-medium">Rs. {remainingForFree.toLocaleString()}</span> away from{" "}
                  <span className="font-medium">free delivery</span>.
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-black transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            <div className="mt-4 rounded-xl bg-neutral-50 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="Promo code (try WELCOME10)"
                  className="h-10 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <button
                  className="h-10 rounded-lg bg-black px-3 text-sm font-medium text-white hover:opacity-90"
                  onClick={() => setAppliedPromo(promo || null)}
                >
                  Apply
                </button>
              </div>
              {appliedPromo && (
                <p className="mt-2 text-xs text-green-700">
                  Code <b>{appliedPromo.toUpperCase()}</b> applied.
                </p>
              )}
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-neutral-700">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-green-700">
                  <span>Promo savings</span>
                  <span>- Rs. {Math.round(discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-neutral-500">
                <span>Delivery</span>
                <span>{subtotal >= FREE_DELIVERY_THRESHOLD ? "Free" : "Calculated at checkout"}</span>
              </div>
              <div className="mt-3 border-t border-dashed border-neutral-200 pt-3 text-base">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">Rs. {Math.round(total).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">Taxes included where applicable.</p>
              </div>
            </div>
            <Link
            href="/checkout"
            className="mt-4 block w-full rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white hover:opacity-90"
            >
            Proceed to Checkout
            </Link>


            <Link href="/products" className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50">
              Continue Shopping
            </Link>
          </div>

          <ul className="mt-4 grid gap-3 text-sm text-neutral-700 sm:grid-cols-2">
            <li className="rounded-xl border border-neutral-200 bg-white p-3">🚚 Same-day delivery (Colombo)</li>
            <li className="rounded-xl border border-neutral-200 bg-white p-3">💳 Cash / Card on delivery</li>
            <li className="rounded-xl border border-neutral-200 bg-white p-3">🥘 Freshly cooked to order</li>
            <li className="rounded-xl border border-neutral-200 bg-white p-3">⭐ 4.9/5 customer reviews</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
