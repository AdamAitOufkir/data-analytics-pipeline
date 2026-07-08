"use client";

import { CartProvider } from "@/components/cart/cart-provider";
import { TrackingProvider } from "@/components/tracking/tracking-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <TrackingProvider>
      <CartProvider>{children}</CartProvider>
    </TrackingProvider>
  );
}
