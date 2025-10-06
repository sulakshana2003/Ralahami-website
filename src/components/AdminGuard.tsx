// components/AdminGuard.tsx
import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      // Not logged in → send to login page
      signIn();
    }
  }, [status]);

  if (status === "loading") return <p>Checking authentication…</p>;

  // If user exists but is not an admin
  if (!session?.user || session.user.role !== "admin") {
    return <p className="text-center text-red-600 mt-10">Access denied</p>;
  }

  // ✅ Admin is signed in
  return <>{children}</>;
}
