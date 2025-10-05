/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/_app.tsx
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import CartSessionBridge from "@/src/components/CartSessionBridge";
import ClientOnly from "@/src/components/ClientOnly";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps & { pageProps: { session?: any } }) {
  return (
    // ✅ Put the font variable on a top-level wrapper so it’s available app-wide
    <div className={playfair.variable}>
      <SessionProvider session={session}>
        <CartSessionBridge />
        <ClientOnly>
          <Toaster position="top-right" />
        </ClientOnly>
        <Component {...pageProps} />
      </SessionProvider>
    </div>
  );
}
