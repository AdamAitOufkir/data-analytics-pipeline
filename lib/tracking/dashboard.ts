import { connectToDatabase } from "@/lib/mongodb";
import { EventModel } from "@/models/Event";
import { OrderModel } from "@/models/Order";

type CountAggregate = {
  _id: string | number | null;
  count: number;
};

type AddToCartAggregate = {
  _id: null;
  count: number;
  totalPrice: number;
};

type OrderStatsAggregate = {
  _id: null;
  count: number;
  grossRevenue: number;
};

type ProductAggregate = {
  _id: string;
  productName: string;
  views: number;
  clicks: number;
  addToCarts: number;
  durationTotal: number;
  durationCount: number;
};

type AvgDurationAggregate = {
  _id: null;
  avgDuration: number | null;
};

type RawRecentEvent = {
  _id: unknown;
  event_type: string;
  user_id: string;
  session_id: string;
  timestamp: unknown;
  metadata?: unknown;
};

type RawRecentOrder = {
  _id: unknown;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  payment_method: string;
  status: string;
  created_at: unknown;
};

export type DashboardMetricItem = {
  label: string;
  value: number;
};

export type DashboardProductItem = {
  productId: string;
  productName: string;
  views: number;
  clicks: number;
  addToCarts: number;
  cartRatePercent: number | null;
  avgViewDurationMs: number | null;
};

export type DashboardRecentEvent = {
  id: string;
  timestamp: string;
  eventType: string;
  userId: string;
  sessionId: string;
  page: string;
  productName: string;
  detail: string;
};

export type DashboardRecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

export type AdminDashboardData = {
  generatedAt: string;
  totalEvents: number;
  eventsLast24h: number;
  uniqueUsers: number;
  uniqueSessions: number;
  addToCartEvents: number;
  revenueIntent: number;
  totalOrders: number;
  ordersLast24h: number;
  grossRevenue: number;
  averageOrderValue: number;
  checkoutConversionPercent: number | null;
  averageEventsPerSession: number;
  averageProductViewDurationMs: number | null;
  eventTypeCounts: DashboardMetricItem[];
  pageViewCounts: Array<{ page: string; views: number }>;
  paymentMethodCounts: DashboardMetricItem[];
  scrollDepthCounts: Array<{ depth: number; count: number }>;
  topProducts: DashboardProductItem[];
  recentEvents: DashboardRecentEvent[];
  recentOrders: DashboardRecentOrder[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

const PRODUCT_EVENT_TYPES = [
  "product_view",
  "product_click",
  "add_to_cart",
  "product_view_duration",
];

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIsoTimestamp(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return new Date(0).toISOString();
  }

  return date.toISOString();
}

function summarizeMetadata(metadata: Record<string, unknown>): string {
  const duration = asNumber(metadata.duration);
  if (duration !== null) {
    return `${(duration / 1000).toFixed(1)}s`;
  }

  const depth = asNumber(metadata.depth);
  if (depth !== null) {
    return `${Math.round(depth)}% depth`;
  }

  const x = asNumber(metadata.x);
  const y = asNumber(metadata.y);
  if (x !== null && y !== null) {
    return `(${Math.round(x)}, ${Math.round(y)})`;
  }

  const price = asNumber(metadata.price);
  if (price !== null) {
    return `$${price}`;
  }

  const element = asString(metadata.element);
  if (element) {
    return element;
  }

  const page = asString(metadata.page);
  if (page) {
    return page;
  }

  return "-";
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const dayAgo = new Date(Date.now() - DAY_MS);

  await connectToDatabase();

  const [
    totalEvents,
    eventsLast24h,
    uniqueUsers,
    uniqueSessions,
    addToCartStats,
    orderStats,
    ordersLast24h,
    eventTypeCountsRaw,
    pageViewCountsRaw,
    paymentMethodCountsRaw,
    scrollDepthCountsRaw,
    productCountsRaw,
    avgDurationRaw,
    recentOrdersRaw,
    recentEventsRaw,
  ] = await Promise.all([
    EventModel.countDocuments(),
    EventModel.countDocuments({ timestamp: { $gte: dayAgo } }),
    EventModel.distinct("user_id"),
    EventModel.distinct("session_id"),
    EventModel.aggregate([
      { $match: { event_type: "add_to_cart" } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalPrice: {
            $sum: {
              $convert: {
                input: "$metadata.price",
                to: "double",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
      },
    ]),
    OrderModel.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          grossRevenue: { $sum: "$total" },
        },
      },
    ]),
    OrderModel.countDocuments({ created_at: { $gte: dayAgo } }),
    EventModel.aggregate([
      { $group: { _id: "$event_type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]),
    EventModel.aggregate([
      { $match: { event_type: "page_view" } },
      {
        $project: {
          page: {
            $convert: {
              input: "$metadata.page",
              to: "string",
              onError: "(unknown)",
              onNull: "(unknown)",
            },
          },
        },
      },
      { $group: { _id: "$page", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]),
    OrderModel.aggregate([
      { $group: { _id: "$payment_method", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),
    EventModel.aggregate([
      { $match: { event_type: "scroll_depth" } },
      {
        $project: {
          depth: {
            $convert: {
              input: "$metadata.depth",
              to: "int",
              onError: -1,
              onNull: -1,
            },
          },
        },
      },
      { $match: { depth: { $gte: 0 } } },
      { $group: { _id: "$depth", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    EventModel.aggregate([
      { $match: { event_type: { $in: PRODUCT_EVENT_TYPES } } },
      {
        $project: {
          event_type: 1,
          productId: {
            $convert: {
              input: "$metadata.product_id",
              to: "string",
              onError: "",
              onNull: "",
            },
          },
          productName: {
            $convert: {
              input: "$metadata.product_name",
              to: "string",
              onError: "Unknown product",
              onNull: "Unknown product",
            },
          },
          duration: {
            $convert: {
              input: "$metadata.duration",
              to: "double",
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $match: { productId: { $ne: "" } } },
      {
        $group: {
          _id: "$productId",
          productName: { $first: "$productName" },
          views: {
            $sum: { $cond: [{ $eq: ["$event_type", "product_view"] }, 1, 0] },
          },
          clicks: {
            $sum: {
              $cond: [{ $eq: ["$event_type", "product_click"] }, 1, 0],
            },
          },
          addToCarts: {
            $sum: { $cond: [{ $eq: ["$event_type", "add_to_cart"] }, 1, 0] },
          },
          durationTotal: {
            $sum: {
              $cond: [{ $eq: ["$event_type", "product_view_duration"] }, "$duration", 0],
            },
          },
          durationCount: {
            $sum: {
              $cond: [{ $eq: ["$event_type", "product_view_duration"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { views: -1, addToCarts: -1, clicks: -1 } },
      { $limit: 10 },
    ]),
    EventModel.aggregate([
      { $match: { event_type: "product_view_duration" } },
      {
        $group: {
          _id: null,
          avgDuration: {
            $avg: {
              $convert: {
                input: "$metadata.duration",
                to: "double",
                onError: null,
                onNull: null,
              },
            },
          },
        },
      },
    ]),
    OrderModel.find()
      .sort({ created_at: -1 })
      .limit(20)
      .lean(),
    EventModel.find()
      .sort({ timestamp: -1 })
      .limit(40)
      .lean(),
  ]);

  const addToCartStatsItem = (addToCartStats as AddToCartAggregate[])[0];
  const orderStatsItem = (orderStats as OrderStatsAggregate[])[0];
  const averageEventsPerSession =
    uniqueSessions.length > 0 ? totalEvents / uniqueSessions.length : 0;
  const totalOrders = orderStatsItem?.count ?? 0;
  const grossRevenue = roundMetric(orderStatsItem?.grossRevenue ?? 0);
  const averageOrderValue =
    totalOrders > 0 ? roundMetric(grossRevenue / totalOrders) : 0;
  const checkoutConversionPercent =
    (addToCartStatsItem?.count ?? 0) > 0
      ? Number(
          ((totalOrders / (addToCartStatsItem?.count ?? 1)) * 100).toFixed(1),
        )
      : null;

  const eventTypeCounts = (eventTypeCountsRaw as CountAggregate[]).map((item) => ({
    label: String(item._id ?? "unknown"),
    value: item.count,
  }));

  const pageViewCounts = (pageViewCountsRaw as CountAggregate[]).map((item) => ({
    page: String(item._id ?? "(unknown)"),
    views: item.count,
  }));

  const paymentMethodCounts = (paymentMethodCountsRaw as CountAggregate[]).map(
    (item) => ({
      label: String(item._id ?? "unknown"),
      value: item.count,
    }),
  );

  const scrollDepthCounts = (scrollDepthCountsRaw as CountAggregate[]).map(
    (item) => ({
      depth: Number(item._id ?? 0),
      count: item.count,
    }),
  );

  const topProducts = (productCountsRaw as ProductAggregate[]).map((item) => {
    const avgViewDurationMs =
      item.durationCount > 0
        ? Math.round(item.durationTotal / item.durationCount)
        : null;

    const cartRatePercent =
      item.views > 0
        ? Number(((item.addToCarts / item.views) * 100).toFixed(1))
        : null;

    return {
      productId: item._id,
      productName: item.productName || "Unknown product",
      views: item.views,
      clicks: item.clicks,
      addToCarts: item.addToCarts,
      cartRatePercent,
      avgViewDurationMs,
    };
  });

  const averageProductViewDurationMs = Math.round(
    (avgDurationRaw as AvgDurationAggregate[])[0]?.avgDuration ?? 0,
  );

  const recentEvents = (recentEventsRaw as RawRecentEvent[]).map((event) => {
    const metadata = asRecord(event.metadata);

    return {
      id: String(event._id),
      timestamp: toIsoTimestamp(event.timestamp),
      eventType: event.event_type,
      userId: event.user_id,
      sessionId: event.session_id,
      page: asString(metadata.page) || "-",
      productName: asString(metadata.product_name) || "-",
      detail: summarizeMetadata(metadata),
    };
  });

  const recentOrders = (recentOrdersRaw as RawRecentOrder[]).map((order) => ({
    id: String(order._id),
    orderNumber: asString(order.order_number) || "-",
    customerName: asString(order.customer_name) || "-",
    customerEmail: asString(order.customer_email) || "-",
    total: asNumber(order.total) ?? 0,
    paymentMethod: asString(order.payment_method) || "-",
    status: asString(order.status) || "-",
    createdAt: toIsoTimestamp(order.created_at),
  }));

  return {
    generatedAt: new Date().toISOString(),
    totalEvents,
    eventsLast24h,
    uniqueUsers: uniqueUsers.length,
    uniqueSessions: uniqueSessions.length,
    addToCartEvents: addToCartStatsItem?.count ?? 0,
    revenueIntent: Math.round(addToCartStatsItem?.totalPrice ?? 0),
    totalOrders,
    ordersLast24h,
    grossRevenue,
    averageOrderValue,
    checkoutConversionPercent,
    averageEventsPerSession: Number(averageEventsPerSession.toFixed(2)),
    averageProductViewDurationMs:
      averageProductViewDurationMs > 0 ? averageProductViewDurationMs : null,
    eventTypeCounts,
    pageViewCounts,
    paymentMethodCounts,
    scrollDepthCounts,
    topProducts,
    recentEvents,
    recentOrders,
  };
}