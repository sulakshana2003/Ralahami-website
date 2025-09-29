// /pages/order/confirmation.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const ConfirmationPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    const { session_id } = router.query;

    if (session_id) {
      fetch(`/api/order/confirmation?session_id=${session_id}`)
        .then((res) => res.json())
        .then((data) => {
          setOrderDetails(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [router.query]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Order Confirmation</h1>
      {orderDetails ? (
        <div>
          <h2>Thank you for your purchase!</h2>
          <p>Your order ID is: {orderDetails.id}</p>
          {/* Display other order details */}
        </div>
      ) : (
        <div>
          <p>Something went wrong with the order.</p>
        </div>
      )}
    </div>
  );
};

export default ConfirmationPage;
