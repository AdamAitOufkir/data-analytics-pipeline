"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { ensureTrackingIds, trackEvent } from "@/lib/tracking/client";

type PaymentMethod = "card" | "paypal" | "bank_transfer";

type CheckoutFormState = {
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  city: string;
  country: string;
  paymentMethod: PaymentMethod;
};

type CheckoutApiSuccess = {
  success: true;
  orderId: string;
  orderNumber: string;
  subtotal: number;
  shippingFee: number;
  total: number;
};

type CheckoutApiFailure = {
  success: false;
  error: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const steps = ["Contact", "Shipping", "Payment", "Complete"] as const;

const defaultFormState: CheckoutFormState = {
  customerName: "",
  customerEmail: "",
  shippingAddress: "",
  city: "",
  country: "",
  paymentMethod: "card",
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart();

  const [step, setStep] = useState(0);
  const [formState, setFormState] = useState<CheckoutFormState>(defaultFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<CheckoutApiSuccess | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items],
  );
  const shippingFee = subtotal >= 250 ? 0 : 18;
  const total = subtotal + shippingFee;

  const canProceedFromContact =
    formState.customerName.trim().length >= 2 &&
    isValidEmail(formState.customerEmail);

  const canProceedFromShipping =
    formState.shippingAddress.trim().length >= 4 &&
    formState.city.trim().length > 0 &&
    formState.country.trim().length > 0;

  const canSubmitOrder =
    items.length > 0 &&
    canProceedFromContact &&
    canProceedFromShipping &&
    Boolean(formState.paymentMethod);

  const onContinueStep = () => {
    setErrorMessage(null);

    if (step === 0 && !canProceedFromContact) {
      setErrorMessage("Please provide a valid name and email.");
      return;
    }

    if (step === 1 && !canProceedFromShipping) {
      setErrorMessage("Please complete shipping address details.");
      return;
    }

    setStep((previousStep) => Math.min(previousStep + 1, 3));

    trackEvent("checkout_step_continue", {
      step_from: steps[step],
      step_to: steps[Math.min(step + 1, 3)],
    });
  };

  const onBackStep = () => {
    setErrorMessage(null);
    setStep((previousStep) => Math.max(previousStep - 1, 0));
  };

  const onPlaceOrder = async () => {
    setErrorMessage(null);

    if (!canSubmitOrder) {
      setErrorMessage("Checkout form is incomplete.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { userId, sessionId } = ensureTrackingIds();

      trackEvent("checkout_submit", {
        cart_size: items.length,
        total,
      });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          customer_name: formState.customerName.trim(),
          customer_email: formState.customerEmail.trim(),
          shipping_address: formState.shippingAddress.trim(),
          city: formState.city.trim(),
          country: formState.country.trim(),
          payment_method: formState.paymentMethod,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
          })),
        }),
      });

      const payload = (await response.json()) as
        | CheckoutApiSuccess
        | CheckoutApiFailure;

      if (!response.ok || !payload.success) {
        throw new Error(
          "error" in payload ? payload.error : "Failed to place order.",
        );
      }

      setPlacedOrder(payload);
      setStep(3);
      clearCart();

      trackEvent("checkout_success", {
        order_number: payload.orderNumber,
        total: payload.total,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to place order.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !placedOrder) {
    return (
      <section className="reveal-in rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_16px_32px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Checkout
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Your cart is empty
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Add products from the storefront before starting checkout.
        </p>

        <Link
          href="/"
          className="mt-5 inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Back to storefront
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="reveal-in rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Checkout Flow
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Secure Checkout
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Complete the steps below to create an order record in MongoDB.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Continue shopping
          </Link>
        </div>
      </header>

      <ol className="grid gap-2 rounded-2xl border border-slate-200 bg-white/85 p-3 sm:grid-cols-4">
        {steps.map((stepLabel, index) => {
          const isDone = index < step;
          const isCurrent = index === step;

          return (
            <li
              key={stepLabel}
              className={`rounded-xl border px-3 py-2.5 transition ${
                isCurrent
                  ? "border-sky-300 bg-sky-50"
                  : isDone
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">
                Step {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {stepLabel}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:p-6">
          {step === 0 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-950">
                Contact Information
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Full name</span>
                  <input
                    value={formState.customerName}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        customerName: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-sky-400"
                    placeholder="Jane Doe"
                  />
                </label>

                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Email address</span>
                  <input
                    type="email"
                    value={formState.customerEmail}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        customerEmail: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-sky-400"
                    placeholder="jane@example.com"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-950">
                Shipping Details
              </h2>
              <label className="block space-y-1.5 text-sm text-slate-700">
                <span>Address</span>
                <input
                  value={formState.shippingAddress}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      shippingAddress: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-sky-400"
                  placeholder="123 Market Street"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>City</span>
                  <input
                    value={formState.city}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        city: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-sky-400"
                    placeholder="New York"
                  />
                </label>

                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Country</span>
                  <input
                    value={formState.country}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        country: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-sky-400"
                    placeholder="United States"
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-950">
                Payment Method
              </h2>
              <div className="space-y-2.5">
                {[
                  {
                    value: "card",
                    label: "Credit / Debit Card",
                  },
                  {
                    value: "paypal",
                    label: "PayPal",
                  },
                  {
                    value: "bank_transfer",
                    label: "Bank Transfer",
                  },
                ].map((method) => (
                  <label
                    key={method.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      checked={formState.paymentMethod === method.value}
                      onChange={() =>
                        setFormState((previous) => ({
                          ...previous,
                          paymentMethod: method.value as PaymentMethod,
                        }))
                      }
                    />
                    <span className="font-medium">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-emerald-700">
                Order Placed Successfully
              </h2>

              {placedOrder ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-900">
                    Order number <strong>{placedOrder.orderNumber}</strong> has
                    been saved to the database.
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Charged total: {currencyFormatter.format(placedOrder.total)}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Back to storefront
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex cursor-pointer items-center rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100"
                >
                  View admin analytics
                </Link>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {step < 3 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={onBackStep}
                  className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Back
                </button>
              ) : null}

              {step < 2 ? (
                <button
                  type="button"
                  onClick={onContinueStep}
                  className="inline-flex cursor-pointer items-center rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-50 transition hover:bg-slate-800"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPlaceOrder}
                  disabled={!canSubmitOrder || isSubmitting}
                  className="inline-flex cursor-pointer items-center rounded-xl border border-sky-700 bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                >
                  {isSubmitting ? "Placing order..." : "Place order"}
                </button>
              )}
            </div>
          ) : null}
        </article>

        <aside className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:p-6">
          <h2 className="text-base font-semibold text-slate-950">
            Order Summary
          </h2>

          <ul className="mt-3 space-y-2.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-600">
                  {currencyFormatter.format(item.price)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-3 text-sm text-slate-700">
            <p className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{currencyFormatter.format(subtotal)}</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Shipping</span>
              <span>
                {shippingFee === 0 ? "Free" : currencyFormatter.format(shippingFee)}
              </span>
            </p>
            <p className="flex items-center justify-between text-base font-semibold text-slate-950">
              <span>Total</span>
              <span>{currencyFormatter.format(total)}</span>
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}