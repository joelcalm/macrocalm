import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MacroSummaryCard } from "@/components/MacroSummaryCard";
import { Sheet } from "@/components/Sheet";
import {
  getWeightLog,
  listDailyLogItems,
  upsertWeightLog,
  type DailyLogItem,
  type WeightLog,
} from "@/lib/supabaseQueries";
import { computeMacros, sumMacros, fmtCal, fmtMacro } from "@/lib/nutrition";
import { Plus, Scale, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<DailyLogItem[]>([]);
  const [weightLog, setWeightLog] = useState<WeightLog | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listDailyLogItems(today), getWeightLog(today)]).then(([dailyItems, weight]) => {
      setItems(dailyItems);
      setWeightLog(weight);
      setWeightInput(weight ? String(Number(weight.weight_kg)) : "");
      setLoading(false);
    });
  }, [today]);

  const totals = sumMacros(
    items.map((i) => (i.product ? computeMacros(i.product, i.quantity_g) : { calories: 0, protein: 0, carbs: 0, fat: 0 })),
  );

  // Group by meal_name
  const grouped: Record<string, DailyLogItem[]> = {};
  for (const i of items) {
    const k = i.meal_name ?? "Individual items";
    (grouped[k] ??= []).push(i);
  }

  async function saveWeight() {
    const normalizedInput = weightInput.trim().replace(",", ".");
    const weight = Number(normalizedInput);
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("Enter a valid weight");
      return;
    }

    const saved = await upsertWeightLog({ date: today, weight_kg: weight });
    setWeightLog(saved);
    setWeightInput(String(Number(saved.weight_kg)));
    setWeightOpen(false);
    toast.success("Weight logged");
  }

  return (
    <AppShell title="Today">
      <MacroSummaryCard macros={totals} label={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} />

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link
          to="/log"
          className="rounded-2xl bg-gradient-primary text-primary-foreground p-4 font-semibold shadow-glow flex flex-col gap-1"
        >
          <UtensilsCrossed className="h-5 w-5" />
          Log meal
        </Link>
        <Link
          to="/products/new"
          className="rounded-2xl border border-border bg-card p-4 font-semibold flex flex-col gap-1"
        >
          <Plus className="h-5 w-5 text-primary" />
          Add product
        </Link>
        <button
          onClick={() => {
            setWeightInput(weightLog ? String(Number(weightLog.weight_kg)) : "");
            setWeightOpen(true);
          }}
          className="col-span-2 rounded-2xl border border-border bg-card p-4 text-left flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <Scale className="h-5 w-5 text-primary" />
            </span>
            <span>
              <span className="block font-semibold">{weightLog ? "Update weight" : "Log weight"}</span>
              <span className="block text-xs text-muted-foreground">
                {weightLog ? `${Number(weightLog.weight_kg).toFixed(1)} kg today` : "Track body-weight progress"}
              </span>
            </span>
          </span>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">Logged today</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([name, list]) => (
              <div key={name}>
                <p className="text-sm font-medium mb-2">{name}</p>
                <div className="space-y-2">
                  {list.map((i) => {
                    const m = i.product ? computeMacros(i.product, i.quantity_g) : null;
                    return (
                      <div
                        key={i.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{i.product?.name ?? "Product"}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(i.quantity_g)} g
                            {m && (
                              <>
                                {" · "}P {fmtMacro(m.protein)} · C {fmtMacro(m.carbs)} · F {fmtMacro(m.fat)}
                              </>
                            )}
                          </p>
                        </div>
                        {m && <span className="text-primary font-semibold">{fmtCal(m.calories)} kcal</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={weightOpen} onClose={() => setWeightOpen(false)} title="Log weight">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5 ml-1">Weight</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="w-full h-12 rounded-xl bg-input px-4 pr-12 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 72.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kg</span>
            </div>
          </div>
          <button
            onClick={saveWeight}
            className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow"
          >
            Save weight
          </button>
        </div>
      </Sheet>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 rounded-2xl border border-dashed border-border">
      <p className="text-sm text-muted-foreground">Nothing logged yet today.</p>
      <Link to="/log" className="inline-block mt-3 text-primary font-medium">
        Log your first meal →
      </Link>
    </div>
  );
}
