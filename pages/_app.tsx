// pages/_app.tsx
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/src/context/CartContext"; // if you added cart
import "@/styles/globals.css";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps & { pageProps: { session?: any } }) {
  return (
    <SessionProvider session={session}>
      <CartProvider>
        <Component {...pageProps} />
      </CartProvider>
    </SessionProvider>
  );
}
