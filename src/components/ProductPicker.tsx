import { useEffect, useMemo, useState } from "react";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/lib/productCategories";
import { listProducts, type Product } from "@/lib/supabaseQueries";
import { getErrorMessage } from "@/lib/utils";
import { Search } from "lucide-react";

export function ProductPicker({
  excludeProductIds = [],
  onPick,
}: {
  excludeProductIds?: string[];
  onPick: (p: Product) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts({ ensureStarterProducts: true })
      .then((list) => {
        setProducts(list);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(getProductPickerError(e));
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    const excluded = new Set(excludeProductIds);
    const available = products.filter((p) => !excluded.has(p.id));
    const byCategory =
      category === "all" ? available : available.filter((p) => p.category === category);
    if (!s) return byCategory;
    return byCategory.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.brand ?? "").toLowerCase().includes(s),
    );
  }, [products, q, category, excludeProductIds]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          className="w-full h-12 rounded-xl bg-input pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
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
      <div className="space-y-2 max-h-[60vh] overflow-y-auto -mx-1 px-1">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Loading products…</p>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">Could not load products</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {products.length === 0 ? "Add a product first." : "No matches."}
          </p>
        ) : null}
        {!loading &&
          !error &&
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className="w-full text-left flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/50"
            >
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center font-display font-bold text-primary">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {PRODUCT_CATEGORY_LABELS[p.category]} · {Math.round(p.calories_per_100g)} kcal /
                  100g
                </p>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}

function getProductPickerError(error: unknown) {
  const message = getErrorMessage(error, "Could not load products");
  if (message.toLowerCase().includes("category")) {
    return "Apply the products category migration in Supabase, then reload.";
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
