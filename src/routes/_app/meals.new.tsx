import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Sheet } from "@/components/Sheet";
import { ProductPicker } from "@/components/ProductPicker";
import { QuantityInput } from "@/components/QuantityInput";
import { MacroSummaryCard } from "@/components/MacroSummaryCard";
import { createMealTemplate, type Product } from "@/lib/supabaseQueries";
import { computeMacros, sumMacros } from "@/lib/nutrition";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/meals/new")({
  component: NewMeal,
});

type Row = { product: Product; quantity_g: number };

function NewMeal() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const totals = sumMacros(rows.map((r) => computeMacros(r.product, r.quantity_g)));

  async function save() {
    if (!name.trim() || rows.length === 0) {
      toast.error("Add a name and at least one product");
      return;
    }
    setBusy(true);
    try {
      await createMealTemplate(
        name.trim(),
        description.trim() || null,
        rows.map((r) => ({ product_id: r.product.id, default_quantity_g: r.quantity_g })),
      );
      toast.success("Meal saved");
      nav({ to: "/meals" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="New meal">
      <input
        className="w-full h-12 rounded-xl bg-input px-4 mb-3 focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Meal name (e.g. Breakfast bowl)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full h-12 rounded-xl bg-input px-4 mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <MacroSummaryCard macros={totals} label="Meal totals" />

      <div className="mt-4 space-y-2">
        {rows.map((r, idx) => (
          <div key={r.product.id + idx} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium truncate">{r.product.name}</p>
              <button
                onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <QuantityInput
              value={r.quantity_g}
              onChange={(v) => setRows(rows.map((x, i) => (i === idx ? { ...x, quantity_g: v } : x)))}
            />
          </div>
        ))}

        <button
          onClick={() => setPickerOpen(true)}
          className="w-full h-12 rounded-xl border border-dashed border-border bg-card/50 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50"
        >
          <Plus className="h-4 w-4" />
          Add product
        </button>
      </div>

      <button
        disabled={busy}
        onClick={save}
        className="w-full h-13 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold py-3.5 mt-5 shadow-glow disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save meal"}
      </button>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Pick product">
        <ProductPicker
          onPick={(p) => {
            setRows([...rows, { product: p, quantity_g: 100 }]);
            setPickerOpen(false);
          }}
        />
      </Sheet>
    </AppShell>
  );
}
