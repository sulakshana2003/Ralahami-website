import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/hooks/useCart";
import CardNav, { CardNavItem } from "./reactbits/CardNav";

const Navbar: React.FC = () => {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  const totalItemsRaw = useCart((s) => s.totalItems());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);
  const totalItems = hydrated ? totalItemsRaw : 0;

  // 🔹 Grouped nav items for CardNav
  const items: CardNavItem[] = [
    {
      label: "Explore",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        { label: "Home", href: "/", ariaLabel: "Go to home" },
        { label: "Menu", href: "/products", ariaLabel: "Browse menu" },
        { label: "Reserve", href: "/reservation", ariaLabel: "Make a reservation" },
      ],
    },
    {
      label: "Offers",
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "Our staff", href: "/Ourstaff", ariaLabel: "View staff" },
        { label: `Cart (${totalItems})`, href: "/cart", ariaLabel: "View cart" },
      ],
    },
    {
      label: "Account",
      bgColor: "#271E37",
      textColor: "#fff",
      links: isLoggedIn
        ? [
            { label: "My Account", href: "/account", ariaLabel: "Go to account" },
            { label: "Sign Out", href: "#signout", ariaLabel: "Sign out" },
          ]
        : [{ label: "Login", href: "/login", ariaLabel: "Login" }],
    },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <CardNav
        items={items}
        baseColor="#fff"
        menuColor="#000"
        ease="power3.out"
      />
    </header>
  );
};

export default Navbar;
