import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DateSelector } from "@/components/DateSelector";
import { MacroSummaryCard } from "@/components/MacroSummaryCard";
import { QuantityInput } from "@/components/QuantityInput";
import { Sheet } from "@/components/Sheet";
import { ProductPicker } from "@/components/ProductPicker";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  addDailyLogItem,
  addMealTemplateToLog,
  deleteDailyLogItem,
  getMealTemplate,
  listWeightLogs,
  listDailyLogItems,
  listMealTemplates,
  updateDailyLogItem,
  type DailyLogItem,
  type MealTemplate,
  type MealTemplateItem,
  type Product,
  type WeightLog,
} from "@/lib/supabaseQueries";
import { computeMacros, fmtCal, fmtMacro, sumMacros } from "@/lib/nutrition";
import { Apple, Plus, Scale, Trash2, UtensilsCrossed } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/log")({
  component: LogPage,
});

type AddMode = "none" | "choose" | "product" | "productQty" | "meal" | "mealConfirm";
type WeightRangePreset = "week" | "month" | "custom";

const weightChartConfig = {
  weight: {
    label: "Weight",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

function LogPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>("none");
  const [weightPreset, setWeightPreset] = useState<WeightRangePreset>("week");
  const [weightStartDate, setWeightStartDate] = useState(() => daysAgo(6));
  const [weightEndDate, setWeightEndDate] = useState(() => todayString());
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weightLoading, setWeightLoading] = useState(true);

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

  useEffect(() => {
    setWeightLoading(true);
    listWeightLogs(weightStartDate, weightEndDate)
      .then(setWeightLogs)
      .catch((e) => toast.error(e.message ?? "Could not load weight logs"))
      .finally(() => setWeightLoading(false));
  }, [weightStartDate, weightEndDate]);

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

  function setWeightRange(preset: WeightRangePreset) {
    setWeightPreset(preset);
    if (preset === "week") {
      setWeightStartDate(daysAgo(6));
      setWeightEndDate(todayString());
    }
    if (preset === "month") {
      setWeightStartDate(daysAgo(29));
      setWeightEndDate(todayString());
    }
  }

  const weightChartData = weightLogs.map((log) => ({
    date: log.date,
    label: formatShortDate(log.date),
    weight: Number(log.weight_kg),
  }));

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

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Weight progression</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Track your weight across time.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => setWeightRange("week")}
            className={rangeButtonClass(weightPreset === "week")}
          >
            Last week
          </button>
          <button
            onClick={() => setWeightRange("month")}
            className={rangeButtonClass(weightPreset === "month")}
          >
            Last month
          </button>
          <button
            onClick={() => setWeightPreset("custom")}
            className={rangeButtonClass(weightPreset === "custom")}
          >
            Custom
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <DateField
            label="Start"
            value={weightStartDate}
            onChange={(value) => {
              setWeightPreset("custom");
              setWeightStartDate(value);
            }}
          />
          <DateField
            label="End"
            value={weightEndDate}
            onChange={(value) => {
              setWeightPreset("custom");
              setWeightEndDate(value);
            }}
          />
        </div>

        <div className="mt-4">
          {weightLoading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Loading weight data…</p>
          ) : weightChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No weight logged in this range.</p>
          ) : (
            <ChartContainer config={weightChartConfig} className="h-52 w-full">
              <LineChart data={weightChartData} margin={{ left: 8, right: 8, top: 12, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                />
                <YAxis
                  width={44}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={["dataMin - 1", "dataMax + 1"]}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {Number(value).toFixed(1)} kg
                        </span>
                      )}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                    />
                  }
                />
                <Line
                  dataKey="weight"
                  type="monotone"
                  connectNulls
                  stroke="#fff"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={{ r: 3.5, fill: "#fff", stroke: "#fff" }}
                  activeDot={{ r: 5, fill: "#fff", stroke: "#fff" }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
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

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs text-muted-foreground mb-1.5 ml-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 h-10 rounded-xl bg-input px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:h-11 sm:px-3 sm:text-sm"
      />
    </label>
  );
}

function rangeButtonClass(active: boolean) {
  return [
    "h-10 rounded-xl text-sm font-medium transition-colors",
    active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
