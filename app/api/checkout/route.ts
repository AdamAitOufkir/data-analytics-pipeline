import { NextRequest, NextResponse } from "next/server";
import { logErrorEvent, logPipelineEvent } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb";
import { EventModel } from "@/models/Event";
import { OrderModel } from "@/models/Order";

export const runtime = "nodejs";

type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CheckoutPayload = {
  user_id: string;
  session_id: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  city: string;
  country: string;
  payment_method: "card" | "paypal" | "bank_transfer";
  items: CheckoutItem[];
};

const VALID_PAYMENT_METHODS = new Set(["card", "paypal", "bank_transfer"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

function normalizeItems(rawItems: unknown): CheckoutItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  const consolidated = new Map<string, CheckoutItem>();

  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) {
      continue;
    }

    const id = asTrimmedString(rawItem.id);
    const name = asTrimmedString(rawItem.name);
    const price = asFiniteNumber(rawItem.price);
    const quantity = Math.max(
      1,
      Math.floor(asFiniteNumber(rawItem.quantity) ?? 1),
    );

    if (!id || !name || price === null || price <= 0) {
      continue;
    }

    const existing = consolidated.get(id);

    if (!existing) {
      consolidated.set(id, {
        id,
        name,
        price,
        quantity,
      });
      continue;
    }

    consolidated.set(id, {
      ...existing,
      quantity: existing.quantity + quantity,
    });
  }

  return [...consolidated.values()].slice(0, 40);
}

function normalizePayload(rawBody: unknown):
  | { ok: true; value: CheckoutPayload }
  | { ok: false; error: string } {
  if (!isRecord(rawBody)) {
    return { ok: false, error: "Payload must be an object." };
  }

  const userId = asTrimmedString(rawBody.user_id) || "anonymous_user";
  const sessionId = asTrimmedString(rawBody.session_id) || "anonymous_session";
  const customerName = asTrimmedString(rawBody.customer_name);
  const customerEmail = asTrimmedString(rawBody.customer_email).toLowerCase();
  const shippingAddress = asTrimmedString(rawBody.shipping_address);
  const city = asTrimmedString(rawBody.city);
  const country = asTrimmedString(rawBody.country);
  const paymentMethod = asTrimmedString(rawBody.payment_method);
  const items = normalizeItems(rawBody.items);

  if (!customerName || customerName.length < 2) {
    return { ok: false, error: "Customer name is required." };
  }

  if (!EMAIL_REGEX.test(customerEmail)) {
    return { ok: false, error: "Valid customer email is required." };
  }

  if (!shippingAddress || shippingAddress.length < 4) {
    return { ok: false, error: "Shipping address is required." };
  }

  if (!city) {
    return { ok: false, error: "City is required." };
  }

  if (!country) {
    return { ok: false, error: "Country is required." };
  }

  if (!VALID_PAYMENT_METHODS.has(paymentMethod)) {
    return { ok: false, error: "A supported payment method is required." };
  }

  if (items.length === 0) {
    return { ok: false, error: "Cart is empty. Add at least one product." };
  }

  return {
    ok: true,
    value: {
      user_id: userId,
      session_id: sessionId,
      customer_name: customerName,
      customer_email: customerEmail,
      shipping_address: shippingAddress,
      city,
      country,
      payment_method: paymentMethod as CheckoutPayload["payment_method"],
      items,
    },
  };
}

export async function POST(request: NextRequest) {
  const requestStartedAt = performance.now();
  const requestRoute = request.nextUrl.pathname;
  const method = request.method;
  const userAgent = request.headers.get("user-agent") ?? "";

  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    logPipelineEvent({
      route: requestRoute,
      method,
      responseTimeMs: Number((performance.now() - requestStartedAt).toFixed(2)),
      userAgent,
      stage: "checkout_ingest",
      status: "invalid_json",
    });

    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const normalizedPayload = normalizePayload(parsedBody);

  if (!normalizedPayload.ok) {
    logPipelineEvent({
      route: requestRoute,
      method,
      responseTimeMs: Number((performance.now() - requestStartedAt).toFixed(2)),
      userAgent,
      stage: "checkout_ingest",
      status: "validation_failed",
      reason: normalizedPayload.error,
    });

    return NextResponse.json(
      { success: false, error: normalizedPayload.error },
      { status: 400 },
    );
  }

  const payload = normalizedPayload.value;
  const subtotal = roundCurrency(
    payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  const shippingFee = subtotal >= 250 ? 0 : 18;
  const total = roundCurrency(subtotal + shippingFee);
  const orderNumber = generateOrderNumber();
  const responseTimeMs = Number((performance.now() - requestStartedAt).toFixed(2));

  try {
    await connectToDatabase();

    const createdOrder = await OrderModel.create({
      order_number: orderNumber,
      user_id: payload.user_id,
      session_id: payload.session_id,
      customer_name: payload.customer_name,
      customer_email: payload.customer_email,
      shipping_address: payload.shipping_address,
      city: payload.city,
      country: payload.country,
      payment_method: payload.payment_method,
      items: payload.items.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        line_total: roundCurrency(item.price * item.quantity),
      })),
      subtotal,
      shipping_fee: shippingFee,
      total,
      status: "placed",
      created_at: new Date(),
    });

    await EventModel.create({
      event_type: "checkout_complete",
      user_id: payload.user_id,
      session_id: payload.session_id,
      timestamp: new Date(),
      metadata: {
        order_number: orderNumber,
        order_id: String(createdOrder._id),
        total,
        subtotal,
        shipping_fee: shippingFee,
        item_count: payload.items.length,
        payment_method: payload.payment_method,
      },
    });

    logPipelineEvent({
      route: requestRoute,
      method,
      responseTimeMs,
      userAgent,
      stage: "checkout_ingest",
      status: "success",
      orderNumber,
      orderId: String(createdOrder._id),
      total,
      subtotal,
      shippingFee,
      itemCount: payload.items.length,
      paymentMethod: payload.payment_method,
    });

    return NextResponse.json({
      success: true,
      orderId: String(createdOrder._id),
      orderNumber,
      subtotal,
      shippingFee,
      total,
    });
  } catch (error) {
    logErrorEvent({
      event: "checkout_persist_failure",
      route: requestRoute,
      method,
      responseTimeMs,
      userAgent,
      error,
      metadata: {
        orderNumber,
        itemCount: payload.items.length,
        paymentMethod: payload.payment_method,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to place order. Please try again.",
      },
      { status: 500 },
    );
  }
}
