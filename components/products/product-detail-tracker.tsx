"use client";

import { useEffect } from "react";
import { flushEventQueue, trackEvent } from "@/lib/tracking/client";

type ProductDetailTrackerProps = {
  productId: string;
  productName: string;
  price: number;
};

export function ProductDetailTracker({
  productId,
  productName,
  price,
}: ProductDetailTrackerProps) {
  useEffect(() => {
    const start = Date.now();

    trackEvent("product_view", {
      product_id: productId,
      product_name: productName,
      price,
    });

    return () => {
      const duration = Date.now() - start;

      trackEvent("product_view_duration", {
        product_id: productId,
        product_name: productName,
        duration,
      });

      void flushEventQueue({ useBeacon: true });
    };
  }, [price, productId, productName]);

  return null;
}
