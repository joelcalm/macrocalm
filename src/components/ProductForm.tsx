import { useState } from "react";
import type { Product } from "@/lib/supabaseQueries";

export type ProductFormValues = {
  name: string;
  brand: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  notes: string;
};

export function emptyForm(): ProductFormValues {
  return {
    name: "",
    brand: "",
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fat_per_100g: 0,
    notes: "",
  };
}

export function fromProduct(p: Product): ProductFormValues {
  return {
    name: p.name,
    brand: p.brand ?? "",
    calories_per_100g: Number(p.calories_per_100g),
    protein_per_100g: Number(p.protein_per_100g),
    carbs_per_100g: Number(p.carbs_per_100g),
    fat_per_100g: Number(p.fat_per_100g),
    notes: p.notes ?? "",
  };
}

export function ProductForm({
  initial,
  imagePreviewUrl,
  submitLabel = "Save product",
  onSubmit,
}: {
  initial?: ProductFormValues;
  imagePreviewUrl?: string | null;
  submitLabel?: string;
  onSubmit: (v: ProductFormValues) => Promise<void> | void;
}) {
  const [v, setV] = useState<ProductFormValues>(initial ?? emptyForm());
  const [busy, setBusy] = useState(false);

  const field =
    "w-full h-12 rounded-xl bg-input px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.name.trim()) return;
        setBusy(true);
        try {
          await onSubmit(v);
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      {imagePreviewUrl && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <img src={imagePreviewUrl} alt="Label" className="w-full max-h-72 object-cover" />
        </div>
      )}

      <div>
        <Label>Name *</Label>
        <input
          className={field}
          placeholder="e.g. Greek yogurt"
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label>Brand</Label>
        <input
          className={field}
          placeholder="optional"
          value={v.brand}
          onChange={(e) => setV({ ...v, brand: e.target.value })}
        />
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Per 100g</p>

      <div className="grid grid-cols-2 gap-3">
        <NumField label="Calories" value={v.calories_per_100g} onChange={(n) => setV({ ...v, calories_per_100g: n })} unit="kcal" />
        <NumField label="Protein" value={v.protein_per_100g} onChange={(n) => setV({ ...v, protein_per_100g: n })} unit="g" />
        <NumField label="Carbs" value={v.carbs_per_100g} onChange={(n) => setV({ ...v, carbs_per_100g: n })} unit="g" />
        <NumField label="Fat" value={v.fat_per_100g} onChange={(n) => setV({ ...v, fat_per_100g: n })} unit="g" />
      </div>

      <div>
        <Label>Notes</Label>
        <textarea
          className="w-full rounded-xl bg-input p-3 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="optional"
          value={v.notes}
          onChange={(e) => setV({ ...v, notes: e.target.value })}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full h-13 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold py-3.5 shadow-glow active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-muted-foreground mb-1.5 ml-1">{children}</label>;
}

function NumField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  unit: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full h-12 rounded-xl bg-input px-4 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
