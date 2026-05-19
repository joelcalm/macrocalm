import type { MealTemplate } from "@/lib/supabaseQueries";
import { Link } from "@tanstack/react-router";
import { ChevronRight, UtensilsCrossed } from "lucide-react";

export function MealTemplateCard({ template }: { template: MealTemplate }) {
  return (
    <Link
      to="/meals/$mealId"
      params={{ mealId: template.id }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:border-primary/50"
    >
      <div className="h-11 w-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
        <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{template.name}</p>
        {template.description && (
          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
