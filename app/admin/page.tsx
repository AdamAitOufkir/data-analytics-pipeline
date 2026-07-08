import Link from "next/link";
import {
  getAdminDashboardData,
  type DashboardMetricItem,
} from "@/lib/tracking/dashboard";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function widthPercent(value: number, max: number): string {
  if (max <= 0) {
    return "0%";
  }

  const percentage = (value / max) * 100;
  return `${Math.max(4, Math.min(100, percentage)).toFixed(1)}%`;
}

function renderMetricList(items: DashboardMetricItem[], barClassName: string) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No tracking events yet.</p>;
  }

  const maxValue = items[0]?.value ?? 1;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="font-mono text-slate-500">
              {numberFormatter.format(item.value)}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${barClassName}`}
              style={{ width: widthPercent(item.value, maxValue) }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatPaymentMethodLabel(value: string): string {
  if (value === "bank_transfer") {
    return "Bank Transfer";
  }

  if (value === "paypal") {
    return "PayPal";
  }

  if (value === "card") {
    return "Card";
  }

  return value || "Unknown";
}

export default async function AdminDashboardPage() {
  try {
    const data = await getAdminDashboardData();

    const kpiCards = [
      {
        label: "Total Events",
        value: numberFormatter.format(data.totalEvents),
        note: "all-time",
        cardClass:
          "border-sky-200 bg-[linear-gradient(145deg,#f0f9ff_0%,#e0f2fe_100%)]",
      },
      {
        label: "Events (24h)",
        value: numberFormatter.format(data.eventsLast24h),
        note: "recent activity",
        cardClass:
          "border-indigo-200 bg-[linear-gradient(145deg,#eef2ff_0%,#e0e7ff_100%)]",
      },
      {
        label: "Unique Users",
        value: numberFormatter.format(data.uniqueUsers),
        note: "anonymous ids",
        cardClass:
          "border-cyan-200 bg-[linear-gradient(145deg,#ecfeff_0%,#cffafe_100%)]",
      },
      {
        label: "Unique Sessions",
        value: numberFormatter.format(data.uniqueSessions),
        note: "session ids",
        cardClass:
          "border-blue-200 bg-[linear-gradient(145deg,#eff6ff_0%,#dbeafe_100%)]",
      },
      {
        label: "Orders",
        value: numberFormatter.format(data.totalOrders),
        note: `${numberFormatter.format(data.ordersLast24h)} in last 24h`,
        cardClass:
          "border-emerald-200 bg-[linear-gradient(145deg,#ecfdf5_0%,#d1fae5_100%)]",
      },
      {
        label: "Gross Revenue",
        value: currencyFormatter.format(data.grossRevenue),
        note: `AOV ${currencyFormatter.format(data.averageOrderValue)}`,
        cardClass:
          "border-green-200 bg-[linear-gradient(145deg,#f0fdf4_0%,#dcfce7_100%)]",
      },
      {
        label: "Checkout Conversion",
        value:
          data.checkoutConversionPercent === null
            ? "-"
            : `${data.checkoutConversionPercent}%`,
        note: "orders from cart intent",
        cardClass:
          "border-teal-200 bg-[linear-gradient(145deg,#f0fdfa_0%,#ccfbf1_100%)]",
      },
      {
        label: "Add To Cart",
        value: numberFormatter.format(data.addToCartEvents),
        note: "intent actions",
        cardClass:
          "border-amber-200 bg-[linear-gradient(145deg,#fffbeb_0%,#fef3c7_100%)]",
      },
      {
        label: "Revenue Intent",
        value: currencyFormatter.format(data.revenueIntent),
        note: "sum of cart prices",
        cardClass:
          "border-orange-200 bg-[linear-gradient(145deg,#fff7ed_0%,#fed7aa_100%)]",
      },
      {
        label: "Events / Session",
        value: data.averageEventsPerSession.toFixed(2),
        note: "engagement depth",
        cardClass:
          "border-violet-200 bg-[linear-gradient(145deg,#f5f3ff_0%,#ede9fe_100%)]",
      },
      {
        label: "Avg Product View",
        value: formatDuration(data.averageProductViewDurationMs),
        note: "view duration",
        cardClass:
          "border-fuchsia-200 bg-[linear-gradient(145deg,#fdf4ff_0%,#fae8ff_100%)]",
      },
    ];

    return (
      <section className="space-y-6">
        <header className="reveal-in rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ecfeff_50%,#f8fafc_100%)] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Tracking Intelligence
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Operational overview of event volume, behavior patterns, and
                product-level engagement captured by the tracking pipeline.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Back to storefront
              </Link>
              <p className="text-xs text-slate-500">
                Updated {dateTimeFormatter.format(new Date(data.generatedAt))}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-2xl border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] ${card.cardClass}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.note}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border border-sky-200 bg-[linear-gradient(150deg,#f8fbff_0%,#eef6ff_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
            <h2 className="text-base font-semibold text-slate-950">
              Event Type Distribution
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Most frequent events captured across the store.
            </p>
            <div className="mt-4">
              {renderMetricList(data.eventTypeCounts, "bg-sky-600")}
            </div>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-[linear-gradient(150deg,#f3fff8_0%,#ecfdf5_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
            <h2 className="text-base font-semibold text-slate-950">
              Top Pages
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Page views sorted by volume.
            </p>

            {renderMetricList(
              data.pageViewCounts.map((pageCount) => ({
                label: pageCount.page,
                value: pageCount.views,
              })),
              "bg-emerald-600",
            )}
          </article>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-3xl border border-indigo-200 bg-[linear-gradient(150deg,#f9f8ff_0%,#eef2ff_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
            <h2 className="text-base font-semibold text-slate-950">
              Payment Method Mix
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              How placed orders are distributed across payment options.
            </p>

            {renderMetricList(
              data.paymentMethodCounts.map((item) => ({
                label: formatPaymentMethodLabel(item.label),
                value: item.value,
              })),
              "bg-indigo-600",
            )}
          </article>

          <article className="rounded-3xl border border-amber-200 bg-[linear-gradient(150deg,#fffdf6_0%,#fffbeb_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
            <h2 className="text-base font-semibold text-slate-950">
              Scroll Depth Milestones
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Counts at 25/50/75/100 depth checkpoints.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {data.scrollDepthCounts.length === 0 ? (
                <p className="text-sm text-slate-500">No scroll data yet.</p>
              ) : (
                data.scrollDepthCounts.map((item) => (
                  <span
                    key={item.depth}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
                  >
                    {item.depth}%: {numberFormatter.format(item.count)}
                  </span>
                ))
              )}
            </div>
          </article>
        </div>

        <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
          <h2 className="text-base font-semibold text-slate-950">
            Product Performance
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Funnel-style view from detail engagement to cart intent.
          </p>

          {data.topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No product events captured yet.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Product
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Views
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Clicks
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Add to Cart
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Cart Rate
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-medium">
                      Avg View Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topProducts.map((product) => (
                    <tr key={product.productId} className="text-slate-700">
                      <td className="border-b border-slate-100 px-3 py-2.5 font-medium text-slate-900">
                        {product.productName}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2.5">
                        {numberFormatter.format(product.views)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2.5">
                        {numberFormatter.format(product.clicks)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2.5">
                        {numberFormatter.format(product.addToCarts)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2.5">
                        {product.cartRatePercent === null
                          ? "-"
                          : `${product.cartRatePercent}%`}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2.5">
                        {formatDuration(product.avgViewDurationMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-3xl border border-emerald-200 bg-[linear-gradient(150deg,#f3fff8_0%,#ecfdf5_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
            <h2 className="text-base font-semibold text-slate-950">
              Recent Orders
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Latest transactions persisted by checkout.
            </p>

            {data.recentOrders.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No orders yet.</p>
            ) : (
              <div className="mt-4 max-h-105 overflow-auto rounded-xl border border-emerald-200 bg-white/80">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-emerald-50 text-left text-xs uppercase tracking-[0.12em] text-emerald-800">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Order</th>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Total</th>
                      <th className="px-3 py-2 font-semibold">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id} className="border-t border-emerald-100">
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-emerald-900">
                          {order.orderNumber}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {order.customerName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {currencyFormatter.format(order.total)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {formatPaymentMethodLabel(order.paymentMethod)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="rounded-3xl border border-cyan-200 bg-[linear-gradient(150deg,#f8fdff_0%,#ecfeff_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.07)]">
            <h2 className="text-base font-semibold text-slate-950">
              Recent Events
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Latest captured events for quick debugging and validation.
            </p>

            {data.recentEvents.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No events yet.</p>
            ) : (
              <div className="mt-4 max-h-105 overflow-auto rounded-xl border border-cyan-200 bg-white/80">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-cyan-50 text-left text-xs uppercase tracking-[0.12em] text-cyan-800">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Time</th>
                      <th className="px-3 py-2 font-semibold">Event</th>
                      <th className="px-3 py-2 font-semibold">Page</th>
                      <th className="px-3 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 font-semibold">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEvents.map((event) => (
                      <tr key={event.id} className="border-t border-cyan-100">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {dateTimeFormatter.format(new Date(event.timestamp))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                          {event.eventType}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {event.page}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                          {event.productName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                          {event.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      </section>
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error while loading tracking metrics.";

    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          Admin Dashboard
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Unable to load metrics</h1>
        <p className="mt-2 text-sm leading-relaxed">{errorMessage}</p>
      </section>
    );
  }
}
