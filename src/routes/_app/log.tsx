import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DateSelector } from "@/components/DateSelector";
import { MacroSummaryCard } from "@/components/MacroSummaryCard";
import { QuantityInput } from "@/components/QuantityInput";
import { Sheet } from "@/components/Sheet";
import { ProductPicker } from "@/components/ProductPicker";
import {
  addDailyLogItem,
  addMealTemplateToLog,
  deleteDailyLogItem,
  getMealTemplate,
  listDailyLogItems,
  listMealTemplates,
  updateDailyLogItem,
  type DailyLogItem,
  type MealTemplate,
  type MealTemplateItem,
  type Product,
} from "@/lib/supabaseQueries";
import { computeMacros, fmtCal, fmtMacro, sumMacros } from "@/lib/nutrition";
import { Apple, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/log")({
  component: LogPage,
});

type AddMode = "none" | "choose" | "product" | "productQty" | "meal" | "mealConfirm";

function LogPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>("none");

  const [pickedProduct, setPickedProduct] = useState<Product | null>(null);
  const [pickedQty, setPickedQty] = useState(100);

  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [mealConfirmItems, setMealConfirmItems] = useState<(MealTemplateItem & { qty: number })[]>([]);
  const [pickedTemplate, setPickedTemplate] = useState<MealTemplate | null>(null);

  async function refresh() {
    setLoading(true);
    const list = await listDailyLogItems(date);
    setItems(list);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [date]);

  const totals = sumMacros(
    items.map((i) => (i.product ? computeMacros(i.product, i.quantity_g) : { calories: 0, protein: 0, carbs: 0, fat: 0 })),
  );

  const grouped: Record<string, DailyLogItem[]> = {};
  for (const i of items) {
    const k = i.meal_name ?? "Individual items";
    (grouped[k] ??= []).push(i);
  }

  async function changeQty(item: DailyLogItem, q: number) {
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, quantity_g: q } : x)));
    await updateDailyLogItem(item.id, q);
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await deleteDailyLogItem(id);
  }

  async function saveProduct() {
    if (!pickedProduct) return;
    await addDailyLogItem({ date, product_id: pickedProduct.id, quantity_g: pickedQty });
    setAddMode("none");
    setPickedProduct(null);
    setPickedQty(100);
    refresh();
  }

  async function openMealPicker() {
    setAddMode("meal");
    setTemplates(await listMealTemplates());
  }

  async function pickTemplate(tpl: MealTemplate) {
    const data = await getMealTemplate(tpl.id);
    if (!data) return;
    setPickedTemplate(tpl);
    setMealConfirmItems(data.items.map((i) => ({ ...i, qty: i.default_quantity_g })));
    setAddMode("mealConfirm");
  }

  async function confirmMeal() {
    if (!pickedTemplate) return;
    await addMealTemplateToLog(
      date,
      pickedTemplate.id,
      mealConfirmItems.map((i) => ({ product_id: i.product_id, quantity_g: i.qty })),
    );
    setAddMode("none");
    setPickedTemplate(null);
    refresh();
    toast.success("Meal logged");
  }

  const mealConfirmTotals = sumMacros(
    mealConfirmItems.map((i) =>
      i.product ? computeMacros(i.product, i.qty) : { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ),
  );

  return (
    <AppShell title="Log">
      <DateSelector value={date} onChange={setDate} />
      <div className="mt-4">
        <MacroSummaryCard macros={totals} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={() => setAddMode("product")}
          className="rounded-2xl border border-border bg-card p-4 text-left flex flex-col gap-1 hover:border-primary/50"
        >
          <Apple className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Add product</span>
        </button>
        <button
          onClick={openMealPicker}
          className="rounded-2xl bg-gradient-primary text-primary-foreground p-4 text-left flex flex-col gap-1 shadow-glow"
        >
          <UtensilsCrossed className="h-5 w-5" />
          <span className="font-semibold text-sm">Add meal</span>
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Nothing logged for this day.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupName, list]) => (
            <div key={groupName}>
              <p className="text-sm font-medium mb-2">{groupName}</p>
              <div className="space-y-2">
                {list.map((i) => {
                  const m = i.product ? computeMacros(i.product, i.quantity_g) : null;
                  return (
                    <div key={i.id} className="rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{i.product?.name}</p>
                          {m && (
                            <p className="text-xs text-muted-foreground">
                              {fmtCal(m.calories)} kcal · P {fmtMacro(m.protein)} · C {fmtMacro(m.carbs)} · F {fmtMacro(m.fat)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(i.id)}
                          className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2">
                        <QuantityInput value={Number(i.quantity_g)} onChange={(v) => changeQty(i, v)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add product picker */}
      <Sheet open={addMode === "product"} onClose={() => setAddMode("none")} title="Pick product">
        <ProductPicker
          onPick={(p) => {
            setPickedProduct(p);
            setPickedQty(100);
            setAddMode("productQty");
          }}
        />
      </Sheet>

      <Sheet open={addMode === "productQty"} onClose={() => setAddMode("none")} title={pickedProduct?.name}>
        {pickedProduct && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">How many grams?</p>
            <QuantityInput value={pickedQty} onChange={setPickedQty} />
            <MacroSummaryCard macros={computeMacros(pickedProduct, pickedQty)} />
            <button
              onClick={saveProduct}
              className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
            >
              Add to log
            </button>
          </div>
        )}
      </Sheet>

      {/* Add meal */}
      <Sheet open={addMode === "meal"} onClose={() => setAddMode("none")} title="Pick meal">
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No meals saved yet.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => pickTemplate(t)}
                className="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/50"
              >
                <p className="font-medium">{t.name}</p>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet open={addMode === "mealConfirm"} onClose={() => setAddMode("none")} title={`Log ${pickedTemplate?.name}`}>
        <div className="space-y-3">
          <MacroSummaryCard macros={mealConfirmTotals} />
          {mealConfirmItems.map((it, idx) => (
            <div key={it.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="font-medium truncate mb-2">{it.product?.name}</p>
              <QuantityInput
                value={it.qty}
                onChange={(v) =>
                  setMealConfirmItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: v } : x)))
                }
              />
            </div>
          ))}
          <button
            onClick={confirmMeal}
            className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
          >
            <Plus className="inline h-4 w-4 mr-1" />
            Add to log
          </button>
        </div>
      </Sheet>
    </AppShell>
  );
}
