import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { listProducts, type Product } from "@/lib/supabaseQueries";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_app/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProducts().then((p) => {
      setProducts(p);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || (p.brand ?? "").toLowerCase().includes(s),
    );
  }, [q, products]);

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

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
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
