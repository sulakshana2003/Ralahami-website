import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const SuccessPage = () => {
  const router = useRouter();
  const { session_id, order_id } = router.query;  // Retrieve session or order ID from URL

  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (session_id) {
      // Fetch order details from your backend or database using session_id
      const fetchOrder = async () => {
        try {
          const res = await fetch(`/api/order/${session_id}`);
          const data = await res.json();
          setOrder(data);
        } catch (error) {
          console.error("Error fetching order details:", error);
        }
      };
      fetchOrder();
    }
  }, [session_id]);

  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.text("Receipt", 20, 20);
    autoTable(doc, {
      startY: 30,
      head: [["Item", "Quantity", "Price"]],
      body: order?.items?.map((item: any) => [
        item.name,
        item.qty,
        `Rs. ${item.unitPrice.toLocaleString()}`,
      ]),
    });

    doc.save("receipt.pdf");
  };

  if (!order) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Thank you for your order!</h1>
      <p>Your order ID is: {order_id}</p>
      <h2>Order Details</h2>
      <ul>
        {order.items.map((item: any) => (
          <li key={item.id}>
            {item.name} (x{item.qty}) - Rs. {item.unitPrice * item.qty}
          </li>
        ))}
      </ul>
      <p>Total: Rs. {order.total.toLocaleString()}</p>
      <button onClick={downloadReceipt}>Download Receipt</button>
    </div>
  );
};

export default SuccessPage;
