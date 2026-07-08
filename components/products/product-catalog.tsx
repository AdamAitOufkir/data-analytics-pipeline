"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/products/product-card";
import type { ProductSummary } from "@/types/product";

type ProductCatalogProps = {
  products: ProductSummary[];
};

type PriceBand = "all" | "under100" | "100to180" | "180plus";
type SortBy = "featured" | "price_low" | "price_high" | "name_asc";

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A-Z" },
];

const priceBands: Array<{ value: PriceBand; label: string }> = [
  { value: "all", label: "All prices" },
  { value: "under100", label: "Under $100" },
  { value: "100to180", label: "$100 - $180" },
  { value: "180plus", label: "$180+" },
];

function byPriceBand(price: number, priceBand: PriceBand): boolean {
  if (priceBand === "under100") {
    return price < 100;
  }

  if (priceBand === "100to180") {
    return price >= 100 && price <= 180;
  }

  if (priceBand === "180plus") {
    return price > 180;
  }

  return true;
}

export function ProductCatalog({ products }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceBand, setPriceBand] = useState<PriceBand>("all");
  const [sortBy, setSortBy] = useState<SortBy>("featured");

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))].sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const result = products.filter((product) => {
      const haystack = `${product.name} ${product.description} ${product.category}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);
      const matchesPriceBand = byPriceBand(product.price, priceBand);

      return matchesQuery && matchesCategory && matchesPriceBand;
    });

    if (sortBy === "price_low") {
      return [...result].sort((a, b) => a.price - b.price);
    }

    if (sortBy === "price_high") {
      return [...result].sort((a, b) => b.price - a.price);
    }

    if (sortBy === "name_asc") {
      return [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, query, selectedCategories, priceBand, sortBy]);

  const activeFilterCount =
    selectedCategories.length + (priceBand === "all" ? 0 : 1);

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceBand("all");
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((previous) =>
      previous.includes(category)
        ? previous.filter((item) => item !== category)
        : [...previous, category],
    );
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="self-start lg:sticky lg:top-64 xl:top-56">
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_16px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:max-h-[calc(100vh-18rem)] lg:overflow-y-auto">
            <div className="border-b border-slate-200 bg-white/95 px-5 py-4 lg:sticky lg:top-0 lg:z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Filters
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    Refine Catalog
                  </h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                  {activeFilterCount} active
                </span>
              </div>
            </div>

            <div className="space-y-5 px-5 py-4">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Category
                </p>
                <div className="mt-2 space-y-2">
                  {categories.map((category) => (
                    <label
                      key={category}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                    >
                      <span>{category}</span>
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Price
                </p>
                <div className="mt-2 space-y-2">
                  {priceBands.map((band) => (
                    <label
                      key={band.value}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                    >
                      <input
                        type="radio"
                        name="price-band"
                        checked={priceBand === band.value}
                        onChange={() => setPriceBand(band.value)}
                      />
                      <span>{band.label}</span>
                    </label>
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="reveal-in rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-[0_16px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <label className="block w-full">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Search Catalog
                </p>
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by product name, category, or description"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                />
              </label>

              <label className="block md:w-64">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Sort
                </p>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortBy)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Showing {filteredProducts.length} of {products.length} products.
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 text-center shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
              <p className="text-lg font-semibold text-slate-900">
                No products match your filters
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Try a broader search term or clear one of the active filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
