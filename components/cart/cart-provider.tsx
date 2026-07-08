"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/tracking/client";
import type { ProductSummary } from "@/types/product";

type CartContextValue = {
  items: ProductSummary[];
  addItem: (item: ProductSummary) => void;
  removeItem: (productId: string) => void;
  isInCart: (productId: string) => boolean;
  clearCart: () => void;
  total: number;
};

const CART_STORAGE_KEY = "demo_cart_items";

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: React.ReactNode;
};

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<ProductSummary[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = localStorage.getItem(CART_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as ProductSummary[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const addItem = (item: ProductSummary) => {
      setItems((previousItems) => {
        const alreadyInCart = previousItems.some(
          (currentItem) => currentItem.id === item.id,
        );

        if (alreadyInCart) {
          return previousItems;
        }

        trackEvent("add_to_cart", {
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          cart_size_after: previousItems.length + 1,
        });

        return [...previousItems, item];
      });
    };

    const removeItem = (productId: string) => {
      setItems((previousItems) => {
        const product = previousItems.find((item) => item.id === productId);

        if (!product) {
          return previousItems;
        }

        trackEvent("remove_from_cart", {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          cart_size_after: Math.max(previousItems.length - 1, 0),
        });

        return previousItems.filter((item) => item.id !== productId);
      });
    };

    const isInCart = (productId: string) =>
      items.some((item) => item.id === productId);

    const clearCart = () => {
      if (items.length === 0) {
        return;
      }

      trackEvent("cart_cleared", {
        cart_size_before: items.length,
      });

      setItems([]);
    };

    const total = items.reduce((sum, item) => sum + item.price, 0);

    return {
      items,
      addItem,
      removeItem,
      isInCart,
      clearCart,
      total,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
