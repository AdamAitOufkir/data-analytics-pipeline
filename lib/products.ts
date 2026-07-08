import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import type { ProductSummary } from "@/types/product";

const DEMO_PRODUCTS: Omit<ProductSummary, "id">[] = [
  {
    name: "StreamPulse Keyboard",
    category: "Keyboards",
    price: 129,
    image: "/products/streampulse-keyboard.svg",
    description:
      "Compact mechanical keyboard built for analysts who live in shortcuts and dashboards.",
  },
  {
    name: "StreamPulse TKL Keyboard",
    category: "Keyboards",
    price: 119,
    image: "/products/streampulse-keyboard.svg",
    description:
      "Tenkeyless layout that frees desk space while keeping tactical switches and fast response.",
  },
  {
    name: "StreamPulse Ergo Keyboard",
    category: "Keyboards",
    price: 149,
    image: "/products/streampulse-keyboard.svg",
    description:
      "Split ergonomic profile designed for long analytics sessions and better wrist posture.",
  },
  {
    name: "StreamPulse Wireless Keyboard",
    category: "Keyboards",
    price: 139,
    image: "/products/streampulse-keyboard.svg",
    description:
      "Low-latency wireless keyboard with long battery life and programmable macro layers.",
  },
  {
    name: "Atlas Insight Mouse",
    category: "Mice",
    price: 89,
    image: "/products/atlas-insight-mouse.svg",
    description:
      "Ergonomic precision mouse tuned for long sessions of behavioral data exploration.",
  },
  {
    name: "Atlas Insight Mini Mouse",
    category: "Mice",
    price: 79,
    image: "/products/atlas-insight-mouse.svg",
    description:
      "Compact travel mouse that keeps precision tracking in a light, portable form factor.",
  },
  {
    name: "Atlas Insight Vertical Mouse",
    category: "Mice",
    price: 109,
    image: "/products/atlas-insight-mouse.svg",
    description:
      "Vertical grip design to reduce strain while preserving quick movements across dashboards.",
  },
  {
    name: "EventFlow Headset",
    category: "Audio",
    price: 149,
    image: "/products/eventflow-headset.svg",
    description:
      "Noise-canceling headset for focused sprint reviews, standups, and incident triage.",
  },
  {
    name: "EventFlow Studio Headset",
    category: "Audio",
    price: 179,
    image: "/products/eventflow-headset.svg",
    description:
      "Enhanced microphone and passive isolation for clear communication in high-noise offices.",
  },
  {
    name: "EventFlow Travel Headset",
    category: "Audio",
    price: 129,
    image: "/products/eventflow-headset.svg",
    description:
      "Foldable lightweight headset optimized for meetings and quick analysis sessions on the move.",
  },
  {
    name: "SignalDock Hub",
    category: "Docking",
    price: 199,
    image: "/products/signaldock-hub.svg",
    description:
      "Multi-port dock that keeps your analytics workstation connected and synchronized.",
  },
  {
    name: "SignalDock Hub Pro",
    category: "Docking",
    price: 249,
    image: "/products/signaldock-hub.svg",
    description:
      "High-bandwidth dock with additional display and networking ports for heavy workstation setups.",
  },
  {
    name: "SignalDock USB-C Hub",
    category: "Docking",
    price: 169,
    image: "/products/signaldock-hub.svg",
    description:
      "Slim USB-C hub balancing portability and core expansion for modern ultrabook workflows.",
  },
  {
    name: "PulseControl Macro Pad",
    category: "Workstation",
    price: 99,
    image: "/products/streampulse-keyboard.svg",
    description:
      "Programmable macro pad for repetitive BI actions, data exports, and incident playbooks.",
  },
  {
    name: "OpsBoard Desk Mat",
    category: "Workstation",
    price: 49,
    image: "/products/streampulse-keyboard.svg",
    description:
      "Large desk surface that stabilizes peripherals and keeps workspace movement consistent.",
  },
];

let hasSeededProducts = false;

function inferCategory(name: string): string {
  const normalized = name.toLowerCase();

  if (normalized.includes("keyboard") || normalized.includes("macro")) {
    return "Keyboards";
  }

  if (normalized.includes("mouse")) {
    return "Mice";
  }

  if (normalized.includes("headset")) {
    return "Audio";
  }

  if (normalized.includes("dock") || normalized.includes("hub")) {
    return "Docking";
  }

  return "Workstation";
}

function toProductSummary(product: {
  _id: Types.ObjectId;
  name: string;
  category?: string;
  price: number;
  image: string;
  description: string;
}): ProductSummary {
  return {
    id: String(product._id),
    name: product.name,
    category:
      typeof product.category === "string" && product.category.trim()
        ? product.category.trim()
        : inferCategory(product.name),
    price: product.price,
    image: product.image,
    description: product.description,
  };
}

async function ensureSeedProducts() {
  if (hasSeededProducts) {
    return;
  }

  await ProductModel.bulkWrite(
    DEMO_PRODUCTS.map((product) => ({
      updateOne: {
        filter: { name: product.name },
        update: {
          $set: product,
        },
        upsert: true,
      },
    })),
  );

  hasSeededProducts = true;
}

export async function getProducts(): Promise<ProductSummary[]> {
  await connectToDatabase();
  await ensureSeedProducts();

  const products = await ProductModel.find().sort({ name: 1 }).lean();
  return products.map((product) =>
    toProductSummary({
      _id: product._id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: product.image,
      description: product.description,
    }),
  );
}

export async function getProductById(
  productId: string,
): Promise<ProductSummary | null> {
  if (!Types.ObjectId.isValid(productId)) {
    return null;
  }

  await connectToDatabase();
  await ensureSeedProducts();

  const product = await ProductModel.findById(productId).lean();

  if (!product) {
    return null;
  }

  return toProductSummary({
    _id: product._id,
    name: product.name,
    category: product.category,
    price: product.price,
    image: product.image,
    description: product.description,
  });
}
