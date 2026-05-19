import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MacroSummaryCard } from "@/components/MacroSummaryCard";
import { listDailyLogItems, type DailyLogItem } from "@/lib/supabaseQueries";
import { computeMacros, sumMacros, fmtCal, fmtMacro } from "@/lib/nutrition";
import { Plus, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDailyLogItems(today).then((d) => {
      setItems(d);
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
