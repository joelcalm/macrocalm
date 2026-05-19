import { useEffect, useMemo, useState } from "react";
import { listProducts, type Product } from "@/lib/supabaseQueries";
import { Search } from "lucide-react";

export function ProductPicker({ onPick }: { onPick: (p: Product) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    listProducts().then(setProducts);
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.brand ?? "").toLowerCase().includes(s),
    );
  }, [products, q]);

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
      <div className="space-y-2 max-h-[60vh] overflow-y-auto -mx-1 px-1">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {products.length === 0 ? "Add a product first." : "No matches."}
          </p>
        )}
        {filtered.map((p) => (
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
                {Math.round(p.calories_per_100g)} kcal / 100g
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
