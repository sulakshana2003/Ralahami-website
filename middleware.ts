import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const isAdminArea = req.nextUrl.pathname.startsWith("/admin");
      if (isAdminArea) return token?.role === "admin"; // only admins
      return true; // everything else is public as usual
    },
  },
});

export const config = {
  matcher: ["/admin/:path*"],
};
