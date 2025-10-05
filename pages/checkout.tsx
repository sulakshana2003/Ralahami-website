// pages/checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useCart } from "@/hooks/useCart";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  "pk_test_51RwhjCE4mghBcU8D97gjwODEwddai88lzSnTOo1E9mvIn9wDRbtDv4nPS9rF2nhAJK0ZZ5pZcHmokKr1dtiBjZXO00huVbMGyD"
);

const FREE_DELIVERY_THRESHOLD = 5000; // LKR
const DELIVERY_FEE = 350;             // LKR (if below threshold)

type FormState = {
  fulfilment: "delivery" | "pickup";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // delivery-only
  addressLine1: string;
  addressLine2: string;
  city: string;
  notes: string;
  // payment
  paymentMethod: "online" | "cod" | "card_on_delivery";
  promo: string;
};

function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const has = (useCart as any).persist?.hasHydrated?.() ?? false;
    setHydrated(has);
    const unsub = (useCart as any).persist?.onFinishHydration?.(() => setHydrated(true));
    return () => unsub?.();
  }, []);
  return hydrated;
}

const CheckoutPageContent = () => {
  const router = useRouter();
  const hydrated = useHasHydrated();

  // cart
  const items    = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clearCart = useCart((s) => s.clear);

  // redirect if no items (after hydration)
  useEffect(() => {
    if (hydrated && (!items || items.length === 0)) {
      router.replace("/cart");
    }
  }, [hydrated, items, router]);

  // form
  const [form, setForm] = useState<FormState>({
    fulfilment: "delivery",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    notes: "",
    paymentMethod: "online",
    promo: "",
  });

  const discount = useMemo(() => {
    if (form.promo.trim().toUpperCase() === "WELCOME10") return Math.round(subtotal * 0.1);
    return 0;
  }, [form.promo, subtotal]);

  const deliveryFee = useMemo(() => {
    if (form.fulfilment === "pickup") return 0;
    return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  }, [form.fulfilment, subtotal]);

  const total = Math.max(0, subtotal - discount + deliveryFee);

  const onChange =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!form.firstName.trim()) errs.push("First name is required.");
    if (!form.lastName.trim()) errs.push("Last name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push("Valid email is required.");
    if (!/^[\d +\-()]{7,}$/.test(form.phone)) errs.push("Valid phone number is required.");
    if (form.fulfilment === "delivery") {
      if (!form.addressLine1.trim()) errs.push("Address line 1 is required for delivery.");
      if (!form.city.trim()) errs.push("City is required for delivery.");
    }
    if (!["online", "cod", "card_on_delivery"].includes(form.paymentMethod)) {
      errs.push("Choose a payment method.");
    }
    if (!items || items.length === 0) errs.push("Your cart is empty.");
    return errs;
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return; // double-click protection

    const errs = validate();
    if (errs.length) {
      errs.forEach((m) => toast.error(m));
      return;
    }

    // compose the order snapshot from client
    const order = {
      items: items.map((i) => ({
        slug: i.slug,
        name: i.name,
        image: i.image,
        unitPrice: i.unitPrice,
        qty: i.qty,
        lineTotal: i.unitPrice * i.qty,
      })),
      charges: {
        subtotal,
        discount,
        deliveryFee,
        total,
        currency: "LKR",
      },
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      },
      fulfilment: {
        type: form.fulfilment,
        address:
          form.fulfilment === "delivery"
            ? {
                line1: form.addressLine1.trim(),
                line2: form.addressLine2.trim(),
                city: form.city.trim(),
              }
            : null,
        notes: form.notes.trim() || null,
      },
      payment: {
        method: form.paymentMethod,
        promoCode: form.promo.trim() || null,
      },
    };

    try {
      setSubmitting(true);

      if (form.paymentMethod === "online") {
        // 1) Create draft in DB for the webhook to update after Stripe payment success
        const draftRes = await fetch("/api/orders/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order }),
        });

        if (!draftRes.ok) {
          const { error } = await draftRes.json().catch(() => ({ error: "Failed to create draft order." }));
          toast.error(error || "Failed to create draft order.");
          setSubmitting(false);
          return;
        }

        const { draftId } = await draftRes.json();

        // 2) Create Stripe Checkout Session, passing draftId
        const res = await fetch("/api/checkout/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...order, draftId }),
        });

        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "Checkout failed." }));
          toast.error(error || "Unable to start payment.");
          setSubmitting(false);
          return;
        }

        const data = await res.json();
        if (data?.url) {
          toast.success("Redirecting to secure payment…");
          window.location.href = data.url; // browser navigates to Stripe
          return;
        }

        toast.error("Payment session created but no redirect URL returned.");
        setSubmitting(false);
        return;
      }

      // === Offline payments (COD / Card-on-Delivery): persist immediately ===
      const localOrderId = `${form.paymentMethod.toUpperCase()}-${Date.now()}`;

      await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: localOrderId,
          revenue: total,
          cost: Math.round(total * 0.6), // adjust if you track real COGS
          note: JSON.stringify({
            status: "pending",
            method: form.paymentMethod,
            order,
          }),
        }),
      });

      clearCart();
      toast.success("Order placed! We’ll be in touch.");
      router.replace(`/order/confirmation?orderId=${encodeURIComponent(localOrderId)}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (!hydrated || !items || items.length === 0) {
    return (
      <div className="pt-28 pb-20">
        <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-neutral-100" />
        </div>
      </div>
    );
  }

  const progress = Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const remainingForFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  return (
    <div className="pt-28 pb-20">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">Checkout</h1>
          <p className="mt-2 text-sm text-neutral-600">Secure payment • Encrypted • No hidden fees</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* LEFT: Details */}
          <section className="space-y-6">
            {/* Fulfilment */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Fulfilment</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(["delivery", "pickup"] as const).map((opt) => (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-neutral-50 ${
                      form.fulfilment === opt ? "border-black" : "border-neutral-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfilment"
                      value={opt}
                      checked={form.fulfilment === opt}
                      onChange={onChange("fulfilment")}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-medium capitalize">{opt}</p>
                      <p className="text-xs text-neutral-500">
                        {opt === "delivery" ? "We’ll deliver your order to your address." : "Pick up at our Colombo location."}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {form.fulfilment === "delivery" ? (
                <p className="mt-3 text-xs text-neutral-600">
                  {subtotal >= FREE_DELIVERY_THRESHOLD ? (
                    <>🎉 Free delivery unlocked.</>
                  ) : (
                    <>You’re <b>Rs. {remainingForFree.toLocaleString()}</b> away from free delivery.</>
                  )}
                </p>
              ) : null}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-black transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Contact</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-neutral-600">First name</label>
                  <input
                    value={form.firstName}
                    onChange={onChange("firstName")}
                    className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-600">Last name</label>
                  <input
                    value={form.lastName}
                    onChange={onChange("lastName")}
                    className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="Doe"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-600">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={onChange("email")}
                    className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-600">Phone</label>
                  <input
                    value={form.phone}
                    onChange={onChange("phone")}
                    className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    placeholder="+94 77 123 4567"
                  />
                </div>
              </div>
            </div>

            {/* Address (delivery only) */}
            {form.fulfilment === "delivery" && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Delivery address</h2>
                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="text-xs text-neutral-600">Address line 1</label>
                    <input
                      value={form.addressLine1}
                      onChange={onChange("addressLine1")}
                      className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                      placeholder="123 Galle Road"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-600">Address line 2 (optional)</label>
                    <input
                      value={form.addressLine2}
                      onChange={onChange("addressLine2")}
                      className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                  <div className="sm:max-w-sm">
                    <label className="text-xs text-neutral-600">City</label>
                    <input
                      value={form.city}
                      onChange={onChange("city")}
                      className="mt-1 h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                      placeholder="Colombo"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Order notes (optional)</h2>
              <textarea
                value={form.notes}
                onChange={onChange("notes")}
                className="mt-3 h-24 w-full resize-none rounded-xl border border-neutral-300 p-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                placeholder="Any special instructions?"
              />
            </div>

            {/* Payment */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Payment</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {([
                  { key: "online",            title: "Online (Card)",      note: "Secure payment" },
                  { key: "cod",               title: "Cash on Delivery",    note: "Pay with cash" },
                  { key: "card_on_delivery",  title: "Card on Delivery",    note: "POS terminal" },
                ] as const).map((p) => (
                  <label
                    key={p.key}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:bg-neutral-50 ${
                      form.paymentMethod === p.key ? "border-black" : "border-neutral-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={p.key}
                      checked={form.paymentMethod === p.key}
                      onChange={onChange("paymentMethod")}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-neutral-500">{p.note}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT: Summary */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Order Summary</h2>

              <ul className="mt-4 divide-y">
                {items.map((it) => (
                  <li key={it.slug} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 py-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-neutral-100">
                      {it.image ? <Image src={it.image} alt={it.name} fill className="object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{it.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {it.qty} × Rs. {it.unitPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      Rs. {(it.unitPrice * it.qty).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl bg-neutral-50 p-3">
                <div className="flex items-center gap-2">
                  <input
                    value={form.promo}
                    onChange={onChange("promo")}
                    placeholder="Promo code (try WELCOME10)"
                    className="h-10 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  <button
                    onClick={() => {
                      if (form.promo.trim().toUpperCase() === "WELCOME10") toast.success("Promo applied");
                      else if (form.promo.trim()) toast("No such promo", { icon: "ℹ️" });
                    }}
                    className="h-10 rounded-lg bg-black px-3 text-sm font-medium text-white hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-neutral-700">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal.toLocaleString()}</span>
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between text-green-700">
                    <span>Promo savings</span>
                    <span>- Rs. {discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-neutral-700">
                  <span>Delivery</span>
                  <span>
                    {form.fulfilment === "pickup"
                      ? "—"
                      : deliveryFee === 0
                      ? "Free"
                      : `Rs. ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>

                <div className="mt-3 border-t border-dashed border-neutral-200 pt-3 text-base">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">Rs. {total.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">Taxes included where applicable.</p>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-medium text-white ${
                  submitting ? "bg-neutral-600" : "bg-black hover:opacity-90"
                }`}
                aria-busy={submitting}
              >
                {submitting ? "Processing…" : form.paymentMethod === "online" ? "Pay securely" : "Place order"}
              </button>

              <Link
                href="/cart"
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50"
              >
                Back to Cart
              </Link>
            </div>

            <ul className="grid gap-3 text-sm text-neutral-700 sm:grid-cols-2">
              <li className="rounded-xl border border-neutral-200 bg-white p-3">🔒 Encrypted payments</li>
              <li className="rounded-xl border border-neutral-200 bg-white p-3">🚚 Same-day (Colombo)</li>
              <li className="rounded-xl border border-neutral-200 bg-white p-3">💳 Cash / Card on delivery</li>
              <li className="rounded- xl border border-neutral-200 bg-white p-3">📞 Support: +94 11 234 5678</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutPageContent />
    </Elements>
  );
}