import { ChevronLeft, ChevronRight } from "lucide-react";

function shift(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pretty(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function DateSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-1.5">
      <button
        onClick={() => onChange(shift(value, -1))}
        className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="text-center">
        <p className="font-display font-semibold">{pretty(value)}</p>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-[10px] uppercase tracking-wider text-muted-foreground bg-transparent text-center focus:outline-none"
        />
      </div>
      <button
        onClick={() => onChange(shift(value, 1))}
        className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
