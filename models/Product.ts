import { model, models, Schema } from "mongoose";

export type ProductDocument = {
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
};

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
  },
  {
    collection: "products",
    versionKey: false,
  },
);

export const ProductModel =
  models.Product || model<ProductDocument>("Product", productSchema);
