import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MealTemplateCard } from "@/components/MealTemplateCard";
import { listMealTemplates, type MealTemplate } from "@/lib/supabaseQueries";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/meals/")({
  component: MealsPage,
});

function MealsPage() {
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMealTemplates().then((t) => {
      setTemplates(t);
      setLoading(false);
    });
  }, []);

  return (
    <AppShell
      title="Meals"
      action={
        <Link
          to="/meals/new"
          className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-glow"
        >
          <Plus className="h-5 w-5" />
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground mb-4">
        Save reusable meals you eat often. Tap one to log it instantly.
      </p>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No meals yet.</p>
          <Link to="/meals/new" className="inline-block mt-3 text-primary font-medium">
            Create your first meal →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <MealTemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
