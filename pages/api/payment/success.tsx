import { useEffect } from "react";
import { useRouter } from "next/router";

const PaymentSuccessPage = () => {
  const router = useRouter();

  useEffect(() => {
    const { session_id } = router.query; // Get the Stripe session ID from query params

    if (session_id) {
      // Send the session_id to the API to save the order
      fetch("/api/payment/success", {
        method: "POST",
        body: JSON.stringify({ sessionId: session_id }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Order saved:", data);
        })
        .catch((error) => {
          console.error("Error saving order:", error);
        });
    }
  }, [router.query]);

  return <div>Thank you for your purchase! Your order is being processed.</div>;
};

export default PaymentSuccessPage;
