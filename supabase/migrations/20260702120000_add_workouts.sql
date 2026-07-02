CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_key TEXT,
  name TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  week_start_date DATE,
  goal_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, seed_key, version)
);

CREATE INDEX workout_plans_user_status_idx ON public.workout_plans(user_id, status);
CREATE UNIQUE INDEX workout_plans_one_active_per_user_idx
  ON public.workout_plans(user_id)
  WHERE status = 'active';

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own workout plans select" ON public.workout_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own workout plans insert" ON public.workout_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own workout plans update" ON public.workout_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own workout plans delete" ON public.workout_plans
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER workout_plans_updated
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workout_day_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  seed_key TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')),
  day_order INTEGER NOT NULL CHECK (day_order BETWEEN 1 AND 7),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  cap_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, seed_key),
  UNIQUE(plan_id, day_of_week)
);

CREATE INDEX workout_day_plans_plan_order_idx ON public.workout_day_plans(plan_id, day_order);

ALTER TABLE public.workout_day_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own workout days select" ON public.workout_day_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

CREATE POLICY "own workout days insert" ON public.workout_day_plans FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

CREATE POLICY "own workout days update" ON public.workout_day_plans FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

CREATE POLICY "own workout days delete" ON public.workout_day_plans FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

CREATE TRIGGER workout_day_plans_updated
  BEFORE UPDATE ON public.workout_day_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_plan_id UUID NOT NULL REFERENCES public.workout_day_plans(id) ON DELETE CASCADE,
  seed_key TEXT NOT NULL,
  title TEXT NOT NULL,
  block_type TEXT,
  display_order INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(day_plan_id, seed_key)
);

CREATE INDEX workout_blocks_day_order_idx ON public.workout_blocks(day_plan_id, display_order);

ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own workout blocks select" ON public.workout_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_day_plans d
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE d.id = day_plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout blocks insert" ON public.workout_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_day_plans d
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE d.id = day_plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout blocks update" ON public.workout_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_day_plans d
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE d.id = day_plan_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_day_plans d
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE d.id = day_plan_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout blocks delete" ON public.workout_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_day_plans d
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE d.id = day_plan_id AND p.user_id = auth.uid()
    )
  );

CREATE TRIGGER workout_blocks_updated
  BEFORE UPDATE ON public.workout_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workout_exercise_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
  seed_key TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  planned_sets TEXT,
  planned_reps TEXT,
  planned_duration TEXT,
  planned_rest TEXT,
  planned_tempo TEXT,
  planned_variation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(block_id, seed_key)
);

CREATE INDEX workout_exercise_plans_block_order_idx ON public.workout_exercise_plans(block_id, display_order);

ALTER TABLE public.workout_exercise_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own workout exercise plans select" ON public.workout_exercise_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_blocks b
      JOIN public.workout_day_plans d ON d.id = b.day_plan_id
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE b.id = block_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout exercise plans insert" ON public.workout_exercise_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_blocks b
      JOIN public.workout_day_plans d ON d.id = b.day_plan_id
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE b.id = block_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout exercise plans update" ON public.workout_exercise_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_blocks b
      JOIN public.workout_day_plans d ON d.id = b.day_plan_id
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE b.id = block_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workout_blocks b
      JOIN public.workout_day_plans d ON d.id = b.day_plan_id
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE b.id = block_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout exercise plans delete" ON public.workout_exercise_plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.workout_blocks b
      JOIN public.workout_day_plans d ON d.id = b.day_plan_id
      JOIN public.workout_plans p ON p.id = d.plan_id
      WHERE b.id = block_id AND p.user_id = auth.uid()
    )
  );

CREATE TRIGGER workout_exercise_plans_updated
  BEFORE UPDATE ON public.workout_exercise_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workout_session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE RESTRICT,
  day_plan_id UUID NOT NULL REFERENCES public.workout_day_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'partially_completed', 'skipped')),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  rpe NUMERIC CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, day_plan_id)
);

CREATE INDEX workout_session_logs_user_date_idx ON public.workout_session_logs(user_id, date);
CREATE INDEX workout_session_logs_plan_idx ON public.workout_session_logs(plan_id);

ALTER TABLE public.workout_session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own workout sessions select" ON public.workout_session_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own workout sessions insert" ON public.workout_session_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.workout_day_plans d
      WHERE d.id = day_plan_id AND d.plan_id = workout_session_logs.plan_id
    )
  );

CREATE POLICY "own workout sessions update" ON public.workout_session_logs
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.workout_day_plans d
      WHERE d.id = day_plan_id AND d.plan_id = workout_session_logs.plan_id
    )
  );

CREATE POLICY "own workout sessions delete" ON public.workout_session_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER workout_session_logs_updated
  BEFORE UPDATE ON public.workout_session_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workout_exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_log_id UUID NOT NULL REFERENCES public.workout_session_logs(id) ON DELETE CASCADE,
  exercise_plan_id UUID NOT NULL REFERENCES public.workout_exercise_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'completed', 'partial', 'skipped')),
  actual_sets TEXT,
  actual_reps TEXT,
  actual_duration TEXT,
  actual_load TEXT,
  actual_variation TEXT,
  completed_set_count INTEGER CHECK (completed_set_count IS NULL OR completed_set_count >= 0),
  set_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_log_id, exercise_plan_id)
);

CREATE INDEX workout_exercise_logs_session_idx ON public.workout_exercise_logs(session_log_id);

ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own workout exercise logs select" ON public.workout_exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_session_logs s
      WHERE s.id = session_log_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout exercise logs insert" ON public.workout_exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_session_logs s
      WHERE s.id = session_log_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout exercise logs update" ON public.workout_exercise_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_session_logs s
      WHERE s.id = session_log_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_session_logs s
      WHERE s.id = session_log_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "own workout exercise logs delete" ON public.workout_exercise_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_session_logs s
      WHERE s.id = session_log_id AND s.user_id = auth.uid()
    )
  );

CREATE TRIGGER workout_exercise_logs_updated
  BEFORE UPDATE ON public.workout_exercise_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
