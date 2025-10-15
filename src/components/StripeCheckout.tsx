// components/StripeCheckout.tsx
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useCart } from "@/src/context/CartContext"; // Access cart items
import { useSession } from "next-auth/react"; // Get user session

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function StripeCheckout() {
  const { items, subtotal } = useCart(); // Get cart items and subtotal
  const { data: session } = useSession(); // Get user session
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items,
          email: session?.user?.email || "customer@example.com", // Get email from session
        }),
      });

      const data = await res.json();
      const stripe = await stripePromise;

      if (!stripe) {
        console.error("Stripe has not loaded yet.");
        setLoading(false);
        return;
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.clientSecret, // Session ID from backend
      });

      if (error) {
        console.error("Error redirecting to Stripe Checkout:", error);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      setLoading(false);
      alert("Something went wrong during the checkout process.");
    }
  };

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>
      <p>Subtotal: Rs. {subtotal}</p>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="checkout-button"
      >
        {loading ? "Loading..." : "Proceed to Payment"}
      </button>
    </div>
  );
}
