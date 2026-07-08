import { model, models, Schema } from "mongoose";

export type OrderLineItem = {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderDocument = {
  order_number: string;
  user_id: string;
  session_id: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  city: string;
  country: string;
  payment_method: "card" | "paypal" | "bank_transfer";
  items: OrderLineItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: "placed" | "processing";
  created_at: Date;
};

const orderLineItemSchema = new Schema<OrderLineItem>(
  {
    product_id: { type: String, required: true },
    product_name: { type: String, required: true },
    unit_price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    line_total: { type: Number, required: true, min: 0 },
  },
  {
    _id: false,
  },
);

const orderSchema = new Schema<OrderDocument>(
  {
    order_number: { type: String, required: true, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    session_id: { type: String, required: true, index: true },
    customer_name: { type: String, required: true },
    customer_email: { type: String, required: true, index: true },
    shipping_address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    payment_method: {
      type: String,
      required: true,
      enum: ["card", "paypal", "bank_transfer"],
    },
    items: { type: [orderLineItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shipping_fee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["placed", "processing"],
      default: "placed",
      index: true,
    },
    created_at: { type: Date, required: true, default: Date.now, index: true },
  },
  {
    collection: "orders",
    versionKey: false,
  },
);

export const OrderModel =
  models.Order || model<OrderDocument>("Order", orderSchema);