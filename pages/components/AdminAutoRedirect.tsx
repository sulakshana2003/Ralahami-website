
"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

/**
 * Redirects admins to /admin/users only when:
 * - user is authenticated
 * - current route is "/" or "/login"
 * It avoids repeated session updates to prevent navbar flicker.
 */
export default function AdminAutoRedirect() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const triedRefreshRef = useRef(false); // ensure we don't spam update()

  useEffect(() => {
    if (status !== "authenticated") return;

    const atEntry = router.pathname === "/" || router.pathname === "/login";
    if (!atEntry) return;

    const role = (session?.user as any)?.role;

    // If we already know the role, act without refreshing
    if (role === "admin") {
      router.replace("/admin/users");
      return;
    }
    if (role === "user") {
      // normal user: do nothing (stay on page)
      return;
    }

    // Role is missing (rare timing). Refresh ONCE to populate it.
    if (!triedRefreshRef.current) {
      triedRefreshRef.current = true;
      (async () => {
        const fresh = await update();
        const freshRole = (fresh?.user as any)?.role;
        if (freshRole === "admin") {
          router.replace("/admin/users");
        }
      })();
    }
  }, [status, session, router, update]);

  return null;
}
