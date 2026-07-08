import { ProductCatalog } from "@/components/products/product-catalog";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();

  return <ProductCatalog products={products} />;
}
