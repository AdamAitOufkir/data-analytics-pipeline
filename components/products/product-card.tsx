"use client";

import Image from "next/image";
import Link from "next/link";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { trackEvent } from "@/lib/tracking/client";
import type { ProductSummary } from "@/types/product";

type ProductCardProps = {
  product: ProductSummary;
  index: number;
};

export function ProductCard({ product, index }: ProductCardProps) {
  const onProductClick = () => {
    trackEvent("product_click", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      position: index,
      page: "/",
    });
  };

  return (
    <article
      className="card-reveal group flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-200/90 bg-white/92 shadow-[0_14px_30px_rgba(15,23,42,0.09)] transition hover:-translate-y-1 hover:shadow-[0_24px_42px_rgba(15,23,42,0.14)]"
      style={{ animationDelay: `${Math.min(index * 75, 450)}ms` }}
    >
      <Link
        href={`/product/${product.id}`}
        onClick={onProductClick}
        className="flex flex-1 flex-col"
      >
        <div className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_15%_15%,rgba(186,230,253,0.45),transparent_45%),linear-gradient(150deg,#ffffff_0%,#eef4fb_100%)] p-6">
          <Image
            src={product.image}
            alt={product.name}
            width={640}
            height={420}
            className="h-36 w-full object-contain transition duration-300 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col space-y-3 p-5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Catalog Item
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-sky-700">
              {product.category}
            </span>
          </div>
          <h3 className="text-[1.08rem] font-semibold text-slate-950">
            {product.name}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {product.description}
          </p>

          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <p className="text-[1.36rem] font-semibold tracking-tight text-slate-900">
              ${product.price}
            </p>
            <span className="text-sm font-medium text-slate-500 transition group-hover:text-slate-700">
              View details
            </span>
          </div>
        </div>
      </Link>

      <div className="border-t border-slate-200 px-5 py-4">
        <AddToCartButton product={product} fullWidth />
      </div>
    </article>
  );
}
