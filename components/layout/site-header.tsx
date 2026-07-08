"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { ChartNoAxesColumnIncreasing, ShoppingBag, Store } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const primaryLinks = [
  { href: "/", label: "Shop" },
  { href: "/checkout", label: "Checkout" },
  { href: "/admin", label: "Analytics" },
];

const utilityLinks = [
  {
    href: "/",
    label: "Catalog",
    icon: Store,
  },
  {
    href: "/admin",
    label: "Tracking Dashboard",
    icon: ChartNoAxesColumnIncreasing,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { items, total } = useCart();

  return (
    <header className="reveal-in sticky top-3 z-40 mb-7 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_20px_45px_rgba(15,23,42,0.1)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-5 py-2 text-xs text-slate-100 sm:px-6">
        <p className="font-medium">Free shipping over $250</p>
        <p className="text-slate-300">Fast tracked event capture enabled</p>
      </div>

      <div className="space-y-4 px-5 py-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-3 lg:pr-3">
            <Link
              href="/"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white"
            >
              <ShoppingBag className="h-8 w-8 text-slate-900" />
            </Link>
            <div>
              <Link href="/" className="text-lg font-semibold text-slate-950">
                Rahma Shop
              </Link>
              <p className="text-xs text-slate-500">
                Behavioral storefront and analytics workspace
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-start gap-2 lg:justify-center">
            {primaryLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-start lg:justify-end">
            <Link
              href="/checkout"
              className="inline-flex cursor-pointer items-center rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-50 visited:text-slate-50 transition hover:bg-slate-800"
            >
              Cart {items.length} | {currencyFormatter.format(total)}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
          {utilityLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
