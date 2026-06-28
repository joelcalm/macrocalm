import { ChevronLeft, ChevronRight } from "lucide-react";

function shift(dateStr: string, days: number) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateValue(d);
}

function pretty(dateStr: string) {
  const d = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function DateSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const today = todayValue();
  const canGoForward = value < today;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-2.5 shadow-card">
      <button
        type="button"
        onClick={() => onChange(shift(value, -1))}
        className="h-14 w-14 rounded-xl flex items-center justify-center bg-secondary hover:bg-secondary/80 active:scale-[0.98]"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <div className="text-center px-3">
        <p className="font-display text-2xl font-semibold leading-tight">{pretty(value)}</p>
        <input
          type="date"
          value={value}
          max={today}
          onChange={(e) => onChange(e.target.value > today ? today : e.target.value)}
          className="mt-1 text-sm text-muted-foreground bg-transparent text-center focus:outline-none"
        />
      </div>
      <button
        type="button"
        disabled={!canGoForward}
        onClick={() => {
          if (canGoForward) onChange(shift(value, 1));
        }}
        className="h-14 w-14 rounded-xl flex items-center justify-center bg-secondary hover:bg-secondary/80 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-secondary disabled:active:scale-100"
        aria-label="Next day"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}

function parseDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayValue() {
  return formatDateValue(new Date());
}
