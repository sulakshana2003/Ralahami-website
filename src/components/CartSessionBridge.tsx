import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/hooks/useCart";

const PERSIST_NAME = "cart:v2";

export default function CartSessionBridge() {
  const { data: session, status } = useSession();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ensure anon id
    let anonKey = localStorage.getItem("cart:anonId");
    if (!anonKey) {
      anonKey = `anon-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("cart:anonId", anonKey);
    }

    const userId = (session?.user as any)?.id || null;  // ← must exist
    const nextKey = userId ?? anonKey;
    const prevKey = localStorage.getItem("auth:uid");
    localStorage.setItem("auth:uid", nextKey);

    // merge anon -> user on first login (if user bucket empty)
    if (prevKey && userId && prevKey.startsWith("anon-") && prevKey !== nextKey) {
      const anonStorageKey = `${PERSIST_NAME}:${prevKey}`;
      const userStorageKey = `${PERSIST_NAME}:${nextKey}`;
      const anonData = localStorage.getItem(anonStorageKey);
      const userData = localStorage.getItem(userStorageKey);
      if (anonData && !userData) {
        localStorage.setItem(userStorageKey, anonData);
        // optional: localStorage.removeItem(anonStorageKey);
      }
    }

    // rehydrate Zustand when the key changes
    if (lastKeyRef.current !== nextKey) {
      lastKeyRef.current = nextKey;
      (useCart as any).persist?.rehydrate?.();
    }

    // Debug (remove later):
    console.log("[CartSessionBridge] auth:uid =", nextKey);
  }, [session?.user, status]);

  return null;
}
