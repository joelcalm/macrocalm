import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MacroSummaryCard } from "@/components/MacroSummaryCard";
import { ProductPicker } from "@/components/ProductPicker";
import { QuantityInput } from "@/components/QuantityInput";
import { Sheet } from "@/components/Sheet";
import {
  addMealTemplateItem,
  addMealTemplateToLog,
  deleteMealTemplate,
  deleteMealTemplateItem,
  getMealTemplate,
  updateMealTemplate,
  updateMealTemplateItem,
  type MealTemplateItem,
  type MealTemplate,
  type Product,
} from "@/lib/supabaseQueries";
import { computeMacros, sumMacros } from "@/lib/nutrition";
import { getErrorMessage } from "@/lib/utils";
import { Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/meals/$mealId")({
  component: MealDetail,
});

function MealDetail() {
  const { mealId } = Route.useParams();
  const nav = useNavigate();
  const [template, setTemplate] = useState<MealTemplate | null>(null);
  const [items, setItems] = useState<MealTemplateItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  useEffect(() => {
    getMealTemplate(mealId).then((res) => {
      if (res) {
        setTemplate(res.template);
        setName(res.template.name);
        setDescription(res.template.description ?? "");
        setItems(res.items);
      }
      setLoading(false);
    });
  }, [mealId]);

  const totals = sumMacros(
    items.map((i) =>
      i.product
        ? computeMacros(i.product, i.default_quantity_g)
        : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ),
  );

  async function changeQty(item: MealTemplateItem, q: number) {
    setItems((current) =>
      current.map((x) => (x.id === item.id ? { ...x, default_quantity_g: q } : x)),
    );
    try {
      await updateMealTemplateItem(item.id, q);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  }

  async function removeItem(id: string) {
    const previous = items;
    setItems((current) => current.filter((x) => x.id !== id));
    try {
      await deleteMealTemplateItem(id);
    } catch (e: unknown) {
      setItems(previous);
      toast.error(getErrorMessage(e));
    }
  }

  async function saveDetails() {
    if (!name.trim()) {
      toast.error("Meal name is required");
      return;
    }

    setSavingDetails(true);
    try {
      const updated = await updateMealTemplate(mealId, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setTemplate(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      toast.success("Meal updated");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSavingDetails(false);
    }
  }

  async function addProduct(product: Product) {
    setPickerOpen(false);
    try {
      const item = await addMealTemplateItem(mealId, product.id, 100);
      setItems((current) => [...current, item]);
      toast.success("Product added");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  }

  async function logToday() {
    const today = new Date().toISOString().slice(0, 10);
    await addMealTemplateToLog(
      today,
      mealId,
      items.map((i) => ({ product_id: i.product_id, quantity_g: i.default_quantity_g })),
    );
    toast.success("Logged for today");
    nav({ to: "/" });
  }

  async function removeMeal() {
    if (!confirm("Delete this meal template?")) return;
    await deleteMealTemplate(mealId);
    toast.success("Deleted");
    nav({ to: "/meals" });
  }

  if (loading)
    return (
      <AppShell title="Meal">
        <p className="text-muted-foreground">Loading…</p>
      </AppShell>
    );
  if (!template)
    return (
      <AppShell title="Meal">
        <p className="text-muted-foreground">Not found.</p>
      </AppShell>
    );

  return (
    <AppShell
      title={template.name}
      action={
        <button
          onClick={removeMeal}
          className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-3 mb-4">
        <input
          className="w-full h-12 rounded-xl bg-input px-4 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Meal name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full h-12 rounded-xl bg-input px-4 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="button"
          onClick={saveDetails}
          disabled={savingDetails}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {savingDetails ? "Saving..." : "Save details"}
        </button>
      </div>

      <MacroSummaryCard macros={totals} label="Meal totals" />

      <div className="mt-4 space-y-2">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center">
            <p className="text-sm text-muted-foreground">No products in this meal yet.</p>
          </div>
        )}

        {items.map((i) => (
          <div key={i.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium truncate">{i.product?.name}</p>
              <button
                onClick={() => removeItem(i.id)}
                className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <QuantityInput value={i.default_quantity_g} onChange={(v) => changeQty(i, v)} />
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
        onClick={logToday}
        disabled={items.length === 0}
        className="w-full h-13 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold py-3.5 mt-5 shadow-glow"
      >
        Log this meal today
      </button>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add product">
        <ProductPicker
          excludeProductIds={items.map((item) => item.product_id)}
          onPick={addProduct}
        />
      </Sheet>
    </AppShell>
  );
}
