import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { jsPDF } from "jspdf";

export default function OrderConfirmationPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch order details using sessionId from the query string
    if (sessionId) {
      fetch(`/api/orders/${sessionId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setOrder(data);
          }
        })
        .catch((err) => {
          setError('An error occurred while fetching the order details.');
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [sessionId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!order) return <div>No order found!</div>;

  // Download receipt as PDF
const downloadReceipt = () => {
  const doc = new jsPDF();

  // Title
  doc.text('Order Confirmation', 10, 10);
  doc.text(`Order ID: ${order.id}`, 10, 20);
  doc.text(`Customer: ${order.customer.firstName} ${order.customer.lastName}`, 10, 30);
  doc.text(`Email: ${order.customer.email}`, 10, 40);

  // Items list
  let yOffset = 50;
  doc.text('Items:', 10, yOffset); // Title for the items section
  yOffset += 10;

  order.items.forEach((item: any, index: number) => {
    doc.text(`${item.name} - ${item.qty} x Rs. ${item.unitPrice}`, 10, yOffset);
    yOffset += 10; // Increase the yOffset to avoid overlapping text
  });

  // Total amount
  yOffset += 10;
  doc.text(`Total: Rs. ${order.charges.total}`, 10, yOffset);

  // Save the PDF
  doc.save('receipt.pdf');
};

  return (
    <div className="order-confirmation">
      <h1>Order Confirmation</h1>
      <div className="order-details">
        <h2>Thank you for your order!</h2>
        <p>Your order has been successfully placed.</p>

        <h3>Order Details:</h3>
        <ul>
          {order.items.map((item: any, index: number) => (
            <li key={index}>
              {item.name} - {item.qty} x Rs. {item.unitPrice}
            </li>
          ))}
        </ul>

        <p>
          <strong>Total: Rs. {order.charges.total}</strong>
        </p>
        <p>Payment Method: {order.payment.method}</p>
        <p>Fulfilment Method: {order.fulfilment.type}</p>
        <p>Shipping Address: {order.fulfilment.address?.line1}, {order.fulfilment.address?.city}</p>

        <button onClick={downloadReceipt}>Download Receipt</button>
      </div>
    </div>
  );
}
