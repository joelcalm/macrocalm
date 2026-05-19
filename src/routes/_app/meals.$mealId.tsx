import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MacroSummaryCard } from "@/components/MacroSummaryCard";
import { QuantityInput } from "@/components/QuantityInput";
import {
  addMealTemplateToLog,
  deleteMealTemplate,
  deleteMealTemplateItem,
  getMealTemplate,
  updateMealTemplateItem,
  type MealTemplateItem,
  type MealTemplate,
} from "@/lib/supabaseQueries";
import { computeMacros, sumMacros } from "@/lib/nutrition";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/meals/$mealId")({
  component: MealDetail,
});

function MealDetail() {
  const { mealId } = Route.useParams();
  const nav = useNavigate();
  const [template, setTemplate] = useState<MealTemplate | null>(null);
  const [items, setItems] = useState<MealTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMealTemplate(mealId).then((res) => {
      if (res) {
        setTemplate(res.template);
        setItems(res.items);
      }
      setLoading(false);
    });
  }, [mealId]);

  const totals = sumMacros(
    items.map((i) =>
      i.product ? computeMacros(i.product, i.default_quantity_g) : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ),
  );

  async function changeQty(item: MealTemplateItem, q: number) {
    setItems(items.map((x) => (x.id === item.id ? { ...x, default_quantity_g: q } : x)));
    try {
      await updateMealTemplateItem(item.id, q);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function removeItem(id: string) {
    setItems(items.filter((x) => x.id !== id));
    await deleteMealTemplateItem(id);
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

  if (loading) return <AppShell title="Meal"><p className="text-muted-foreground">Loading…</p></AppShell>;
  if (!template) return <AppShell title="Meal"><p className="text-muted-foreground">Not found.</p></AppShell>;

  return (
    <AppShell
      title={template.name}
      action={
        <button onClick={removeMeal} className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      }
    >
      {template.description && <p className="text-sm text-muted-foreground mb-4">{template.description}</p>}
      <MacroSummaryCard macros={totals} label="Meal totals" />

      <div className="mt-4 space-y-2">
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
      </div>

      <button
        onClick={logToday}
        className="w-full h-13 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold py-3.5 mt-5 shadow-glow"
      >
        Log this meal today
      </button>
    </AppShell>
  );
}
