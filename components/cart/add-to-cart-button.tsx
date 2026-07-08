"use client";

import { useCart } from "@/components/cart/cart-provider";
import type { ProductSummary } from "@/types/product";

type AddToCartButtonProps = {
  product: ProductSummary;
  fullWidth?: boolean;
};

export function AddToCartButton({
  product,
  fullWidth = false,
}: AddToCartButtonProps) {
  const { addItem, removeItem, isInCart } = useCart();
  const inCart = isInCart(product.id);

  const onToggleCart = () => {
    if (inCart) {
      removeItem(product.id);
      return;
    }

    addItem(product);
  };

  return (
    <button
      type="button"
      onClick={onToggleCart}
      className={`inline-flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        fullWidth ? "w-full" : ""
      } ${
        inCart
          ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-400"
          : "border-slate-900 bg-slate-900 text-slate-50 hover:bg-slate-800 focus-visible:ring-slate-700"
      }`}
    >
      {inCart ? "Remove from cart" : "Add to cart"}
    </button>
  );
}
