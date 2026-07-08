"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";

export function CartPanel() {
  const { items, removeItem, total } = useCart();

  return (
    <aside className="reveal-in sticky top-64 h-fit overflow-hidden rounded-3xl border border-slate-200/90 bg-white/92 p-5 shadow-[0_24px_45px_rgba(15,23,42,0.12)] backdrop-blur-sm xl:top-56">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Cart Summary
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Active Cart
            </h2>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            {items.length} items
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-4">
            <p className="text-sm text-slate-600">
              Add products to generate cart interaction events.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200/90 bg-white px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      ${item.price}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="flex items-center justify-between text-sm text-slate-700">
            <span>Estimated total</span>
            <strong className="text-lg font-semibold text-slate-950">
              ${total}
            </strong>
          </p>

          {items.length === 0 ? (
            <button
              type="button"
              disabled
              className="mt-3 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500"
            >
              Checkout
            </button>
          ) : (
            <Link
              href="/checkout"
              className="mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-50 transition hover:bg-slate-800"
            >
              Checkout
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
