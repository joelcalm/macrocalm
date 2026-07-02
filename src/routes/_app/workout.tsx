import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DateSelector } from "@/components/DateSelector";
import { Textarea } from "@/components/ui/textarea";
import {
  getWorkoutDayCode,
  getWorkoutWeekDates,
  getWorkoutWeekStart,
  todayMadridDateValue,
} from "@/lib/workouts/dates";
import {
  getWorkoutWeekData,
  saveWorkoutSession,
  type WorkoutExercisePlanWithLog,
  type WorkoutExerciseStatus,
  type WorkoutSessionLogWithExercises,
  type WorkoutSessionStatus,
  type WorkoutWeekData,
} from "@/lib/workouts/workoutQueries";
import { getErrorMessage } from "@/lib/utils";
import { Check, Loader2, Save, SkipForward } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/workout")({
  component: WorkoutPage,
});

type ExerciseDraft = {
  status: WorkoutExerciseStatus;
  actualSets: string;
  actualReps: string;
  actualDuration: string;
  actualLoad: string;
  actualVariation: string;
  completedSetCount: string;
  setChecklist: boolean[];
  notes: string;
};

type SessionDraft = {
  status: WorkoutSessionStatus;
  notes: string;
};

const sessionStatuses: { value: WorkoutSessionStatus; label: string }[] = [
  { value: "completed", label: "Done" },
  { value: "partially_completed", label: "Partial" },
  { value: "skipped", label: "Skipped" },
];

const exerciseStatuses: { value: WorkoutExerciseStatus; label: string }[] = [
  { value: "completed", label: "Done" },
  { value: "partial", label: "Partial" },
  { value: "skipped", label: "Skipped" },
];

function WorkoutPage() {
  const [date, setDate] = useState(() => todayMadridDateValue());
  const [data, setData] = useState<WorkoutWeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(() => emptySessionDraft());
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>({});

  const weekStartDate = useMemo(() => getWorkoutWeekStart(date), [date]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWorkoutWeekData(date)
      .then((nextData) => {
        if (!cancelled) setData(nextData);
      })
      .catch((error: unknown) => {
        if (!cancelled) toast.error(getErrorMessage(error, "Could not load workout"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const selectedDay = useMemo(() => {
    if (!data) return null;
    const dayCode = getWorkoutDayCode(date);
    return data.plan.days.find((day) => day.day_of_week === dayCode) ?? null;
  }, [data, date]);

  const selectedSession = useMemo(() => {
    if (!data || !selectedDay) return null;
    return (
      data.sessionLogs.find(
        (session) => session.date === date && session.day_plan_id === selectedDay.id,
      ) ?? null
    );
  }, [data, selectedDay, date]);

  const selectedExercises = useMemo(() => {
    return selectedDay?.blocks.flatMap((block) => block.exercises) ?? [];
  }, [selectedDay]);

  useEffect(() => {
    if (!selectedDay) return;
    setSessionDraft(buildSessionDraft(selectedSession));

    const nextDrafts: Record<string, ExerciseDraft> = {};
    for (const exercise of selectedExercises) {
      const log =
        selectedSession?.exercise_logs.find((item) => item.exercise_plan_id === exercise.id) ??
        null;
      nextDrafts[exercise.id] = buildExerciseDraft(exercise, log);
    }
    setExerciseDrafts(nextDrafts);
  }, [selectedDay, selectedSession, selectedExercises]);

  async function save() {
    if (!data || !selectedDay) return;

    setSaving(true);
    try {
      await saveWorkoutSession({
        date,
        planId: data.plan.id,
        dayPlanId: selectedDay.id,
        status: sessionDraft.status,
        durationMinutes: null,
        rpe: null,
        notes: sessionDraft.notes,
        exerciseLogs: selectedExercises.map((exercise) => {
          const draft = exerciseDrafts[exercise.id] ?? buildExerciseDraft(exercise, null);
          return {
            exercisePlanId: exercise.id,
            status: draft.status,
            actualSets: draft.actualSets,
            actualReps: draft.actualReps,
            actualDuration: draft.actualDuration,
            actualLoad: draft.actualLoad,
            actualVariation: draft.actualVariation,
            completedSetCount: parseOptionalNumber(draft.completedSetCount),
            setChecklist: draft.setChecklist,
            notes: draft.notes,
          };
        }),
      });

      const refreshed = await getWorkoutWeekData(date);
      setData(refreshed);
      toast.success("Workout saved");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not save workout"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Workout">
      <DateSelector value={date} onChange={setDate} />

      <div className="mt-4">
        <WeeklyOverview
          selectedDate={date}
          weekStartDate={weekStartDate}
          sessionLogs={data?.sessionLogs ?? []}
          onSelectDate={setDate}
        />
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workout…
        </div>
      ) : !data || !selectedDay ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No workout plan found for this day.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {selectedDay.day_of_week} · {selectedDay.category}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">{selectedDay.title}</h2>
                {selectedDay.cap_text && (
                  <p className="mt-1 text-sm text-muted-foreground">{selectedDay.cap_text}</p>
                )}
              </div>
            </div>
            {selectedDay.notes && (
              <p className="mt-3 text-sm text-muted-foreground">{selectedDay.notes}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {sessionStatuses.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setSessionDraft((prev) => ({ ...prev, status: status.value }))}
                  className={statusButtonClass(sessionDraft.status === status.value)}
                >
                  {status.label}
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <Textarea
                value={sessionDraft.notes}
                onChange={(event) =>
                  setSessionDraft((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Session note..."
                className="min-h-16 rounded-xl bg-input text-sm"
              />
            </label>
          </section>

          {selectedDay.blocks.map((block) => (
            <section key={block.id}>
              <div className="mb-2 px-1">
                <h3 className="font-display text-base font-semibold">{block.title}</h3>
                {block.notes && <p className="mt-1 text-xs text-muted-foreground">{block.notes}</p>}
              </div>
              {block.exercises.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Notes-only block.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {block.exercises.map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      draft={exerciseDrafts[exercise.id] ?? buildExerciseDraft(exercise, null)}
                      onChange={(nextDraft) =>
                        setExerciseDrafts((prev) => ({ ...prev, [exercise.id]: nextDraft }))
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          ))}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="sticky bottom-24 z-10 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save workout"}
          </button>
        </div>
      )}
    </AppShell>
  );
}

function WeeklyOverview({
  selectedDate,
  weekStartDate,
  sessionLogs,
  onSelectDate,
}: {
  selectedDate: string;
  weekStartDate: string;
  sessionLogs: WorkoutSessionLogWithExercises[];
  onSelectDate: (date: string) => void;
}) {
  const weekDates = getWorkoutWeekDates(weekStartDate);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekDates.map(({ dayCode, date }) => {
        const status =
          sessionLogs.find((session) => session.date === date)?.status ?? "not_started";
        return (
          <button
            type="button"
            key={date}
            onClick={() => onSelectDate(date)}
            className={[
              "min-w-0 rounded-xl border p-2 text-center transition-colors",
              selectedDate === date
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <span className="block text-[10px] font-semibold">{dayCode.slice(0, 3)}</span>
            <span className="mt-1 block text-xs">{Number(date.slice(-2))}</span>
            <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${dotClass(status)}`} />
          </button>
        );
      })}
    </div>
  );
}

function ExerciseCard({
  exercise,
  draft,
  onChange,
}: {
  exercise: WorkoutExercisePlanWithLog;
  draft: ExerciseDraft;
  onChange: (draft: ExerciseDraft) => void;
}) {
  const plannedSetCount = parseExactSetCount(exercise.planned_sets);

  function setStatus(status: WorkoutExerciseStatus) {
    onChange({
      ...draft,
      status,
      completedSetCount:
        status === "completed" && plannedSetCount
          ? String(plannedSetCount)
          : draft.completedSetCount,
      setChecklist:
        status === "completed" && plannedSetCount
          ? Array.from({ length: plannedSetCount }, () => true)
          : draft.setChecklist,
    });
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold leading-tight">{exercise.name}</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">{plannedPrescription(exercise)}</div>
        </div>
        {draft.status === "skipped" ? (
          <SkipForward className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : draft.status === "completed" ? (
          <Check className="h-4 w-4 shrink-0 text-primary" />
        ) : null}
      </div>

      {(exercise.planned_rest || exercise.notes) && (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {exercise.planned_rest && <p>Rest: {exercise.planned_rest}</p>}
          {exercise.notes && <p>{exercise.notes}</p>}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {exerciseStatuses.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => setStatus(status.value)}
            className={statusButtonClass(draft.status === status.value)}
          >
            {status.label}
          </button>
        ))}
      </div>

      {plannedSetCount ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: plannedSetCount }, (_, index) => {
              const checked = Boolean(draft.setChecklist[index]);
              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    const nextChecklist = Array.from({ length: plannedSetCount }, (_, itemIndex) =>
                      itemIndex === index
                        ? !draft.setChecklist[itemIndex]
                        : Boolean(draft.setChecklist[itemIndex]),
                    );
                    const completed = nextChecklist.filter(Boolean).length;
                    onChange({
                      ...draft,
                      setChecklist: nextChecklist,
                      completedSetCount: completed ? String(completed) : "",
                      status:
                        completed === plannedSetCount
                          ? "completed"
                          : completed > 0
                            ? "partial"
                            : draft.status,
                    });
                  }}
                  className={[
                    "h-9 w-9 rounded-xl border text-sm font-semibold",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-muted-foreground",
                  ].join(" ")}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <label className="mt-3 block">
        <Textarea
          value={draft.notes}
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
          placeholder="Note if different, skipped, easier/harder, pain, felt strong..."
          className="min-h-14 rounded-xl bg-input text-sm"
        />
      </label>
    </article>
  );
}

function buildSessionDraft(session: WorkoutSessionLogWithExercises | null): SessionDraft {
  return {
    status: session?.status ?? "not_started",
    notes: session?.notes ?? "",
  };
}

function buildExerciseDraft(
  exercise: WorkoutExercisePlanWithLog,
  log: WorkoutExercisePlanWithLog["log"],
): ExerciseDraft {
  const plannedSetCount = parseExactSetCount(exercise.planned_sets);
  const checklist = Array.isArray(log?.set_checklist)
    ? log.set_checklist.map(Boolean)
    : plannedSetCount
      ? Array.from({ length: plannedSetCount }, () => false)
      : [];

  return {
    status: log?.status ?? "not_started",
    actualSets: log?.actual_sets ?? "",
    actualReps: log?.actual_reps ?? "",
    actualDuration: log?.actual_duration ?? "",
    actualLoad: log?.actual_load ?? "",
    actualVariation: log?.actual_variation ?? "",
    completedSetCount: log?.completed_set_count == null ? "" : String(log.completed_set_count),
    setChecklist: plannedSetCount
      ? Array.from({ length: plannedSetCount }, (_, index) => Boolean(checklist[index]))
      : checklist,
    notes: log?.notes ?? "",
  };
}

function emptySessionDraft(): SessionDraft {
  return {
    status: "not_started",
    notes: "",
  };
}

function plannedPrescription(exercise: WorkoutExercisePlanWithLog) {
  const parts = [
    exercise.planned_sets ? `${exercise.planned_sets} sets` : null,
    exercise.planned_reps ? `${exercise.planned_reps} reps` : null,
    exercise.planned_duration ? exercise.planned_duration : null,
    exercise.planned_tempo ? exercise.planned_tempo : null,
    exercise.planned_variation ? exercise.planned_variation : null,
  ].filter(Boolean);

  if (!parts.length) {
    return <span className="text-xs text-muted-foreground">Open prescription</span>;
  }

  return parts.map((part) => (
    <span key={part} className="rounded-lg bg-secondary px-2 py-1 text-xs text-muted-foreground">
      {part}
    </span>
  ));
}

function parseExactSetCount(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const count = Number(trimmed);
  return Number.isFinite(count) && count > 0 && count <= 12 ? count : null;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function statusButtonClass(active: boolean) {
  return [
    "h-9 rounded-xl px-3 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "bg-secondary text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function dotClass(status: WorkoutSessionStatus) {
  if (status === "completed") return "bg-primary";
  if (status === "partially_completed" || status === "in_progress") return "bg-amber-300";
  if (status === "skipped") return "bg-destructive";
  return "bg-muted-foreground/40";
}
