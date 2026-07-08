import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductDetailTracker } from "@/components/products/product-detail-tracker";
import { getProductById } from "@/lib/products";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <article className="reveal-in space-y-7 rounded-[28px] border border-slate-200/85 bg-white/92 p-6 shadow-[0_22px_44px_rgba(15,23,42,0.11)] backdrop-blur-sm sm:p-8">
      <ProductDetailTracker
        productId={product.id}
        productName={product.name}
        price={product.price}
      />

      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        <span aria-hidden="true">&larr;</span>
        Back to catalog
      </Link>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_1.15fr] lg:items-start">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_18%_16%,rgba(186,230,253,0.45),transparent_48%),linear-gradient(145deg,#ffffff_0%,#edf3fa_100%)] p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
          >
            <div className="absolute -left-12 -top-10 h-28 w-28 rounded-full bg-sky-200/45 blur-2xl" />
          </div>

          <Image
            src={product.image}
            alt={product.name}
            width={640}
            height={420}
            className="relative h-64 w-full object-contain"
          />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Product Overview
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.1rem]">
              {product.name}
            </h1>
          </div>

          <p className="text-[1rem] leading-relaxed text-slate-600">
            {product.description}
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-slate-500">
              Current Price
            </p>
            <p className="mt-2 text-[2rem] font-semibold tracking-tight text-slate-950">
              ${product.price}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Product views are tracked on load
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              View duration is tracked on exit
            </div>
          </div>

          <div className="max-w-sm pt-1">
            <AddToCartButton product={product} fullWidth />
          </div>
        </div>
      </div>
    </article>
  );
}
