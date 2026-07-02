# Workout Data And Hermes Export

Workout plans and completion logs live in Supabase.

- `workout_plans` stores per-user plan metadata, version, status, week start, and goal context.
- `workout_day_plans`, `workout_blocks`, and `workout_exercise_plans` store the immutable planned routine.
- `workout_session_logs` stores what happened on a date for a planned day.
- `workout_exercise_logs` stores planned-vs-actual exercise completion, flexible actual fields, set checklist data, and notes.

The app seeds the current active plan from `src/lib/workouts/currentPlanSeed.ts` the first time a user opens Workout without an active plan. The human-readable reference plan is `docs/workout-plan-current.md`.

Hermes should use `exportWorkoutWeekForHermes(userId, weekStartDate)` from `src/lib/workouts/hermesExport.ts` to build weekly review context. The function returns JSON with the active plan, all planned sessions, actual logs, skipped/partial work, and user notes.

Scheduling is intentionally not implemented in MacroCalm. Hermes owns cron/scheduling and can later create a draft next-week plan by inserting a new `workout_plans` row with `status = 'draft'`; user review/activation can be added on top of the existing `active | draft | archived` plan status model.
