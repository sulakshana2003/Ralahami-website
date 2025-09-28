import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut, signIn } from "next-auth/react";
import { useCart } from "@/hooks/useCart";

/* ------------------- tightened NavLinks ------------------- */
const NavLinks = () => (
  <>
    <Link
      href="/products"
      className="relative text-sm font-medium text-neutral-800 hover:text-amber-600
                 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-0 after:bg-amber-600
                 after:transition-all hover:after:w-full"
    >
      Menu
    </Link>
    <Link
      href="/reservation"
      className="relative text-sm font-medium text-neutral-800 hover:text-amber-600
                 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-0 after:bg-amber-600
                 after:transition-all hover:after:w-full"
    >
      Reserve
    </Link>
    <Link
      href="/#promotions"
      className="relative text-sm font-medium text-neutral-800 hover:text-amber-600
                 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-0 after:bg-amber-600
                 after:transition-all hover:after:w-full"
    >
      Promotions
    </Link>
  </>
);

const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const totalItemsRaw = useCart((s) => s.totalItems());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const has = (useCart as any).persist?.hasHydrated?.() ?? false;
    setHydrated(has);
    const unsub = (useCart as any).persist?.onFinishHydration?.(() => setHydrated(true));
    return () => unsub?.();
  }, []);
  const totalItems = hydrated ? totalItemsRaw : 0;

  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-gradient-to-b from-white/40 via-white/20 to-transparent backdrop-blur-md border-b border-white/20">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image src="/images/RalahamiLogo.png" alt="Ralahami" fill className="object-contain" />
          </div>
          <span className="font-semibold text-lg tracking-wide text-amber-700 group-hover:text-amber-800">
            Ralahami
          </span>
        </Link>

        {/* center links with no side padding—gap controls spacing */}
        <nav className="hidden md:flex items-center gap-4">
          <NavLinks />
        </nav>

        {/* right actions unchanged */}
        <div className="hidden md:flex items-center gap-4">
          {!isLoggedIn ? (
            <Link
              href="/login"
              className="rounded-full border border-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-white/30"
            >
              Login
            </Link>
          ) : (
            <>
              <Link
                href="/account"
                className="rounded-full border border-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-white/30"
              >
                Account
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-white/30"
              >
                Sign out
              </button>
            </>
          )}

          <Link
            href="/cart"
            className="relative rounded-full border border-neutral-200/60 px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-white/30"
          >
            Cart
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1 text-[11px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          <Link
            href="/reservation"
            className="rounded-full bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Book a Table
          </Link>
        </div>

        {/* mobile toggle & drawer remain same */}
        {/* ... keep your existing mobile drawer code here ... */}
      </div>
    </header>
  );
};

export default Navbar;
