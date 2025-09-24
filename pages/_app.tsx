import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import CartSessionBridge from "@/src/components/CartSessionBridge";
import Navbar from "pages/components/Navbar";
import ClientOnly from "@/src/components/ClientOnly";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps & { pageProps: { session?: any } }) {
  return (
    <SessionProvider session={session}>
      {/* runs effects only, safe during SSR */}
      <CartSessionBridge />

      {/* render navbar & toaster only on client to avoid SSR/client drift */}
      <ClientOnly>
        <Navbar />
        <Toaster position="top-right" />
      </ClientOnly>

      <Component {...pageProps} />
    </SessionProvider>
  );
}
