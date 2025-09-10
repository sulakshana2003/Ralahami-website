import Link from "next/link";
import { useCart } from "@/src/context/CartContext";

export default function CartBadge() {
  const { totalItems } = useCart();
  return (
    <Link href="/cart" className="relative inline-flex items-center gap-2" aria-label="Cart">
      <span>🛒</span>
      {totalItems > 0 && (
        <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-black px-1.5 text-center text-[10px] leading-5 text-white">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
