import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/productCategories";
import { listProducts, type Product } from "@/lib/supabaseQueries";
import { getErrorMessage } from "@/lib/utils";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_app/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts({ ensureStarterProducts: true })
      .then((p) => {
        setProducts(p);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(getProductLoadError(e));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    const byCategory =
      category === "all" ? products : products.filter((p) => p.category === category);
    if (!s) return byCategory;
    return byCategory.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.brand ?? "").toLowerCase().includes(s),
    );
  }, [q, products, category]);

  return (
    <AppShell
      title="Products"
      action={
        <Link
          to="/products/new"
          className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow"
        >
          <Plus className="h-5 w-5" />
        </Link>
      }
    >
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full h-11 rounded-xl bg-input pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <CategoryButton
          label="All"
          active={category === "all"}
          onClick={() => setCategory("all")}
        />
        {PRODUCT_CATEGORIES.map((item) => (
          <CategoryButton
            key={item}
            label={PRODUCT_CATEGORY_LABELS[item]}
            active={category === item}
            onClick={() => setCategory(item)}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm font-medium text-destructive">Could not load products</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            {products.length === 0 ? "No products yet." : "No matches."}
          </p>
          {products.length === 0 && (
            <Link to="/products/new" className="inline-block mt-3 text-primary font-medium">
              Add your first product →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function getProductLoadError(error: unknown) {
  const message = getErrorMessage(error, "Could not load products");
  if (message.toLowerCase().includes("category")) {
    return "The products category migration has not been applied to Supabase yet. Apply the new migration, then reload this page.";
  }
  return message;
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-xl px-3 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
