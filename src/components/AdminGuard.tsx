import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { status, data: session } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  if (status === "loading") return <div className="p-6">Loading session…</div>;
  if (status === "authenticated" && session?.user?.role !== "admin")
    return <div className="p-6 text-red-600">Access denied: Admins only</div>;

  return <>{children}</>;
}

export default AdminGuard;
