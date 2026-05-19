import type { Product } from "@/lib/supabaseQueries";
import { fmtCal, fmtMacro } from "@/lib/nutrition";
import { Link } from "@tanstack/react-router";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-card hover:border-primary/50 transition-colors"
    >
      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-secondary flex items-center justify-center">
        {product.source_image_url ? (
          <img src={product.source_image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-xl font-bold text-primary">
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{product.name}</p>
        {product.brand && <p className="text-xs text-muted-foreground truncate">{product.brand}</p>}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="text-primary font-medium">{fmtCal(product.calories_per_100g)} kcal</span>
          <span>P {fmtMacro(product.protein_per_100g)}</span>
          <span>C {fmtMacro(product.carbs_per_100g)}</span>
          <span>F {fmtMacro(product.fat_per_100g)}</span>
        </div>
      </div>
    </Link>
  );
}
