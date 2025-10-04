import React, { useEffect, useState } from "react";
import PillNav from "./reactbits/PillNav";
import { useSession, signOut } from "next-auth/react";
import { useCart } from "@/hooks/useCart";

const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const totalItemsRaw = useCart((s) => s.totalItems());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const totalItems = hydrated ? totalItemsRaw : 0; // 👈 ensures SSR and client match

  const items = [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/products" },
    { label: "Reserve", href: "/reservation" },
    { label: "Promotions", href: "/#promotions" },
    ...(isLoggedIn
      ? [
          { label: "Account", href: "/account" },
          { label: "Sign Out", href: "#signout" },
        ]
      : [{ label: "Login", href: "/login" }]),
    { label: `Cart (${totalItems})`, href: "/cart" }, // ✅ safe now
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <PillNav
          logo="/images/RalahamiLogo.png"
          logoAlt="Ralahami Logo"
          items={items}
          activeHref="/"
          className="custom-nav"
          ease="power2.easeOut"
          baseColor="#000000"
          pillColor="#ffffff"
          hoveredPillTextColor="#ffffff"
          pillTextColor="#000000"
        />
      </div>
    </header>
  );
};

export default Navbar;
