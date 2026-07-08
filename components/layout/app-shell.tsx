"use client";

import { usePathname } from "next/navigation";
import { CartPanel } from "@/components/cart/cart-panel";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isExpandedRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/checkout");

  return (
    <div
      className={
        isExpandedRoute
          ? "grid gap-7"
          : "grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]"
      }
    >
      <main>{children}</main>
      {isExpandedRoute ? null : <CartPanel />}
    </div>
  );
}
