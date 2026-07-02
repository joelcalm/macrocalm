import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { CURRENT_WORKOUT_PLAN_SEED } from "@/lib/workouts/currentPlanSeed";
import {
  getWorkoutWeekDates,
  getWorkoutWeekStart,
  todayMadridDateValue,
} from "@/lib/workouts/dates";

export type WorkoutPlan = Database["public"]["Tables"]["workout_plans"]["Row"];
export type WorkoutDayPlan = Database["public"]["Tables"]["workout_day_plans"]["Row"];
export type WorkoutBlock = Database["public"]["Tables"]["workout_blocks"]["Row"];
export type WorkoutExercisePlan = Database["public"]["Tables"]["workout_exercise_plans"]["Row"];
export type WorkoutSessionLog = Database["public"]["Tables"]["workout_session_logs"]["Row"];
export type WorkoutExerciseLog = Database["public"]["Tables"]["workout_exercise_logs"]["Row"];

export type WorkoutSessionStatus = WorkoutSessionLog["status"];
export type WorkoutExerciseStatus = WorkoutExerciseLog["status"];

export type WorkoutExercisePlanWithLog = WorkoutExercisePlan & {
  log: WorkoutExerciseLog | null;
};

export type WorkoutBlockWithExercises = WorkoutBlock & {
  exercises: WorkoutExercisePlanWithLog[];
};

export type WorkoutDayPlanWithBlocks = WorkoutDayPlan & {
  blocks: WorkoutBlockWithExercises[];
};

export type WorkoutPlanWithDays = WorkoutPlan & {
  days: WorkoutDayPlanWithBlocks[];
};

export type WorkoutSessionLogWithExercises = WorkoutSessionLog & {
  exercise_logs: WorkoutExerciseLog[];
};

export type WorkoutWeekData = {
  plan: WorkoutPlanWithDays;
  weekStartDate: string;
  weekDates: { dayCode: string; date: string }[];
  sessionLogs: WorkoutSessionLogWithExercises[];
};

export type SaveWorkoutExerciseLogInput = {
  exercisePlanId: string;
  status: WorkoutExerciseStatus;
  actualSets?: string | null;
  actualReps?: string | null;
  actualDuration?: string | null;
  actualLoad?: string | null;
  actualVariation?: string | null;
  completedSetCount?: number | null;
  setChecklist?: boolean[];
  notes?: string | null;
};

export type SaveWorkoutSessionInput = {
  date: string;
  planId: string;
  dayPlanId: string;
  status: WorkoutSessionStatus;
  durationMinutes?: number | null;
  rpe?: number | null;
  notes?: string | null;
  exerciseLogs: SaveWorkoutExerciseLogInput[];
};

export async function getWorkoutWeekData(date = todayMadridDateValue()): Promise<WorkoutWeekData> {
  const plan = await ensureCurrentWorkoutPlan();
  const weekStartDate = getWorkoutWeekStart(date);
  const weekDates = getWorkoutWeekDates(weekStartDate);
  const weekEndDate = weekDates[weekDates.length - 1].date;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_session_logs")
    .select("*")
    .eq("user_id", userData.user.id)
    .gte("date", weekStartDate)
    .lte("date", weekEndDate)
    .order("date", { ascending: true });

  if (sessionsError) throw sessionsError;

  const sessionRows = (sessions ?? []) as WorkoutSessionLog[];
  const sessionIds = sessionRows.map((session) => session.id);
  let exerciseLogs: WorkoutExerciseLog[] = [];

  if (sessionIds.length) {
    const { data, error } = await supabase
      .from("workout_exercise_logs")
      .select("*")
      .in("session_log_id", sessionIds);
    if (error) throw error;
    exerciseLogs = (data ?? []) as WorkoutExerciseLog[];
  }

  return {
    plan: attachLogsToPlan(plan, sessionRows, exerciseLogs),
    weekStartDate,
    weekDates,
    sessionLogs: sessionRows.map((session) => ({
      ...session,
      exercise_logs: exerciseLogs.filter((log) => log.session_log_id === session.id),
    })),
  };
}

export async function saveWorkoutSession(input: SaveWorkoutSessionInput) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const { data: session, error: sessionError } = await supabase
    .from("workout_session_logs")
    .upsert(
      {
        user_id: userData.user.id,
        date: input.date,
        plan_id: input.planId,
        day_plan_id: input.dayPlanId,
        status: input.status,
        duration_minutes: input.durationMinutes ?? null,
        rpe: input.rpe ?? null,
        notes: emptyToNull(input.notes),
      },
      { onConflict: "user_id,date,day_plan_id" },
    )
    .select("*")
    .single();

  if (sessionError) throw sessionError;

  const rows = input.exerciseLogs.map((log) => ({
    session_log_id: session.id,
    exercise_plan_id: log.exercisePlanId,
    status: log.status,
    actual_sets: emptyToNull(log.actualSets),
    actual_reps: emptyToNull(log.actualReps),
    actual_duration: emptyToNull(log.actualDuration),
    actual_load: emptyToNull(log.actualLoad),
    actual_variation: emptyToNull(log.actualVariation),
    completed_set_count: log.completedSetCount ?? null,
    set_checklist: (log.setChecklist ?? []) as Json,
    notes: emptyToNull(log.notes),
  }));

  if (rows.length) {
    const { error } = await supabase
      .from("workout_exercise_logs")
      .upsert(rows, { onConflict: "session_log_id,exercise_plan_id" });
    if (error) throw error;
  }

  return session as WorkoutSessionLog;
}

export async function ensureCurrentWorkoutPlan(): Promise<WorkoutPlanWithDays> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");

  const { data: active, error: activeError } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (activeError) throw activeError;

  if (active) {
    const details = await getWorkoutPlanDetails(active.id);
    if (
      active.seed_key === CURRENT_WORKOUT_PLAN_SEED.seedKey &&
      details.days.length < CURRENT_WORKOUT_PLAN_SEED.days.length
    ) {
      await upsertSeedChildren(active.id);
      return getWorkoutPlanDetails(active.id);
    }

    return details;
  }

  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .insert({
      user_id: userData.user.id,
      seed_key: CURRENT_WORKOUT_PLAN_SEED.seedKey,
      name: CURRENT_WORKOUT_PLAN_SEED.name,
      version: CURRENT_WORKOUT_PLAN_SEED.version,
      status: "active",
      week_start_date: getWorkoutWeekStart(todayMadridDateValue()),
      goal_context: CURRENT_WORKOUT_PLAN_SEED.goalContext as Json,
    })
    .select("*")
    .single();

  if (planError) throw planError;

  await upsertSeedChildren(plan.id);
  return getWorkoutPlanDetails(plan.id);
}

async function upsertSeedChildren(planId: string) {
  for (const day of CURRENT_WORKOUT_PLAN_SEED.days) {
    const { data: dayRow, error: dayError } = await supabase
      .from("workout_day_plans")
      .upsert(
        {
          plan_id: planId,
          seed_key: day.seedKey,
          day_of_week: day.dayOfWeek,
          day_order: day.dayOrder,
          title: day.title,
          category: day.category,
          cap_text: day.capText,
          notes: day.notes ?? null,
        },
        { onConflict: "plan_id,seed_key" },
      )
      .select("*")
      .single();

    if (dayError) throw dayError;

    for (const [blockIndex, block] of day.blocks.entries()) {
      const { data: blockRow, error: blockError } = await supabase
        .from("workout_blocks")
        .upsert(
          {
            day_plan_id: dayRow.id,
            seed_key: block.seedKey,
            title: block.title,
            block_type: block.blockType,
            display_order: blockIndex + 1,
            notes: block.notes ?? null,
          },
          { onConflict: "day_plan_id,seed_key" },
        )
        .select("*")
        .single();

      if (blockError) throw blockError;

      if (block.exercises.length) {
        const { error: exerciseError } = await supabase.from("workout_exercise_plans").upsert(
          block.exercises.map((exercise, exerciseIndex) => ({
            block_id: blockRow.id,
            seed_key: exercise.seedKey,
            display_order: exerciseIndex + 1,
            name: exercise.name,
            planned_sets: exercise.plannedSets ?? null,
            planned_reps: exercise.plannedReps ?? null,
            planned_duration: exercise.plannedDuration ?? null,
            planned_rest: exercise.plannedRest ?? null,
            planned_tempo: exercise.plannedTempo ?? null,
            planned_variation: exercise.plannedVariation ?? null,
            notes: exercise.notes ?? null,
          })),
          { onConflict: "block_id,seed_key" },
        );

        if (exerciseError) throw exerciseError;
      }
    }
  }
}

async function getWorkoutPlanDetails(planId: string): Promise<WorkoutPlanWithDays> {
  const { data: plan, error: planError } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (planError) throw planError;

  const { data: days, error: daysError } = await supabase
    .from("workout_day_plans")
    .select("*")
    .eq("plan_id", planId)
    .order("day_order", { ascending: true });
  if (daysError) throw daysError;

  const dayRows = (days ?? []) as WorkoutDayPlan[];
  const dayIds = dayRows.map((day) => day.id);

  let blockRows: WorkoutBlock[] = [];
  if (dayIds.length) {
    const { data: blocks, error: blocksError } = await supabase
      .from("workout_blocks")
      .select("*")
      .in("day_plan_id", dayIds)
      .order("display_order", { ascending: true });
    if (blocksError) throw blocksError;
    blockRows = (blocks ?? []) as WorkoutBlock[];
  }

  const blockIds = blockRows.map((block) => block.id);
  let exerciseRows: WorkoutExercisePlan[] = [];
  if (blockIds.length) {
    const { data: exercises, error: exercisesError } = await supabase
      .from("workout_exercise_plans")
      .select("*")
      .in("block_id", blockIds)
      .order("display_order", { ascending: true });
    if (exercisesError) throw exercisesError;
    exerciseRows = (exercises ?? []) as WorkoutExercisePlan[];
  }

  return {
    ...(plan as WorkoutPlan),
    days: dayRows.map((day) => ({
      ...day,
      blocks: blockRows
        .filter((block) => block.day_plan_id === day.id)
        .map((block) => ({
          ...block,
          exercises: exerciseRows
            .filter((exercise) => exercise.block_id === block.id)
            .map((exercise) => ({ ...exercise, log: null })),
        })),
    })),
  };
}

function attachLogsToPlan(
  plan: WorkoutPlanWithDays,
  sessions: WorkoutSessionLog[],
  exerciseLogs: WorkoutExerciseLog[],
): WorkoutPlanWithDays {
  const selectedSessionByDayPlanId = new Map(
    sessions.map((session) => [session.day_plan_id, session]),
  );

  return {
    ...plan,
    days: plan.days.map((day) => {
      const session = selectedSessionByDayPlanId.get(day.id);
      return {
        ...day,
        blocks: day.blocks.map((block) => ({
          ...block,
          exercises: block.exercises.map((exercise) => ({
            ...exercise,
            log: session
              ? (exerciseLogs.find(
                  (log) =>
                    log.session_log_id === session.id && log.exercise_plan_id === exercise.id,
                ) ?? null)
              : null,
          })),
        })),
      };
    }),
  };
}

function emptyToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
