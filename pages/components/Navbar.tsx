import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut, signIn } from "next-auth/react";
import { useCart } from "@/hooks/useCart";

const NavLinks = () => (
  <>
    <Link href="/products" className="text-sm text-neutral-700 hover:text-black">Menu</Link>
    <Link href="/reservation" className="text-sm text-neutral-700 hover:text-black">Reserve</Link>
    <Link href="/#promotions" className="text-sm text-neutral-700 hover:text-black">Promotions</Link>
  </>
);

const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  // ✅ Always call the hook
  const totalItemsRaw = useCart((s) => s.totalItems());

  // ✅ Hydration guard so SSR/client numbers don't mismatch
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const has = (useCart as any).persist?.hasHydrated?.() ?? false;
    setHydrated(has);
    const unsub = (useCart as any).persist?.onFinishHydration?.(() => setHydrated(true));
    return () => unsub?.();
  }, []);

  // Only *use* the value after hydration
  const totalItems = hydrated ? totalItemsRaw : 0;

  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200/50 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-2">
          <div className="relative h-8 w-8">
            <Image src="/images/RalahamiLogo.png" alt="Ralahami" fill className="object-contain" />
          </div>
          <span className="font-semibold tracking-wide">Ralahami Restaurant</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks />
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isLoggedIn ? (
            <Link href="/login" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Login
            </Link>
          ) : (
            <>
              <Link href="/account" className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                Account
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
              >
                Sign out
              </button>
            </>
          )}

          <Link href="/cart" className="relative rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
            Cart
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-[11px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          <Link href="/reservation" className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Book a Table
          </Link>
        </div>

        <button
          onClick={() => setOpen((s) => !s)}
          className="inline-flex items-center justify-center rounded-lg p-2 md:hidden"
          aria-label="Toggle menu"
        >
          <span className="sr-only">Menu</span>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path
              d={open ? "M6 18L18 6M6 6l12 12" : "M3 6h18M3 12h18M3 18h18"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-neutral-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3">
            <div className="flex flex-col gap-3"><NavLinks /></div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {!isLoggedIn ? (
                <button
                  onClick={() => signIn(undefined, { callbackUrl: "/login" })}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                >
                  Login
                </button>
              ) : (
                <>
                  <Link href="/account" onClick={() => setOpen(false)} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                    Account
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                  >
                    Sign out
                  </button>
                </>
              )}

              <Link href="/cart" onClick={() => setOpen(false)} className="relative rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
                Cart
                {totalItems > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1 text-[11px] font-semibold text-white">
                    {totalItems}
                  </span>
                )}
              </Link>

              <Link href="/reservation" onClick={() => setOpen(false)} className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
                Book a Table
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
