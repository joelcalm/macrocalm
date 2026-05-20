
-- Helper trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  calories_per_100g NUMERIC NOT NULL DEFAULT 0 CHECK (calories_per_100g >= 0),
  protein_per_100g NUMERIC NOT NULL DEFAULT 0 CHECK (protein_per_100g >= 0),
  carbs_per_100g NUMERIC NOT NULL DEFAULT 0 CHECK (carbs_per_100g >= 0),
  fat_per_100g NUMERIC NOT NULL DEFAULT 0 CHECK (fat_per_100g >= 0),
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual','photo')),
  source_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_user_idx ON public.products(user_id);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products select" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own products insert" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own products update" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own products delete" ON public.products FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- meal_templates
CREATE TABLE public.meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX meal_templates_user_idx ON public.meal_templates(user_id);
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mt select" ON public.meal_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own mt insert" ON public.meal_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own mt update" ON public.meal_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own mt delete" ON public.meal_templates FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER mt_updated BEFORE UPDATE ON public.meal_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- meal_template_items
CREATE TABLE public.meal_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_template_id UUID NOT NULL REFERENCES public.meal_templates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  default_quantity_g NUMERIC NOT NULL DEFAULT 100 CHECK (default_quantity_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mti_mt_idx ON public.meal_template_items(meal_template_id);
ALTER TABLE public.meal_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mti select" ON public.meal_template_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.meal_templates m WHERE m.id = meal_template_id AND m.user_id = auth.uid()));
CREATE POLICY "own mti insert" ON public.meal_template_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.meal_templates m WHERE m.id = meal_template_id AND m.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid())
  );
CREATE POLICY "own mti update" ON public.meal_template_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.meal_templates m WHERE m.id = meal_template_id AND m.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.meal_templates m WHERE m.id = meal_template_id AND m.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid())
  );
CREATE POLICY "own mti delete" ON public.meal_template_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.meal_templates m WHERE m.id = meal_template_id AND m.user_id = auth.uid()));
CREATE TRIGGER mti_updated BEFORE UPDATE ON public.meal_template_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- daily_logs
CREATE TABLE public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX daily_logs_user_idx ON public.daily_logs(user_id, date);
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dl select" ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own dl insert" ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own dl update" ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own dl delete" ON public.daily_logs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER dl_updated BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- daily_log_items
CREATE TABLE public.daily_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_g NUMERIC NOT NULL DEFAULT 100 CHECK (quantity_g >= 0),
  meal_template_id UUID REFERENCES public.meal_templates(id) ON DELETE SET NULL,
  meal_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dli_dl_idx ON public.daily_log_items(daily_log_id);
ALTER TABLE public.daily_log_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dli select" ON public.daily_log_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_logs d WHERE d.id = daily_log_id AND d.user_id = auth.uid()));
CREATE POLICY "own dli insert" ON public.daily_log_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.daily_logs d WHERE d.id = daily_log_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid())
    AND (
      meal_template_id IS NULL
      OR EXISTS (SELECT 1 FROM public.meal_templates m WHERE m.id = meal_template_id AND m.user_id = auth.uid())
    )
  );
CREATE POLICY "own dli update" ON public.daily_log_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.daily_logs d WHERE d.id = daily_log_id AND d.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.daily_logs d WHERE d.id = daily_log_id AND d.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid())
    AND (
      meal_template_id IS NULL
      OR EXISTS (SELECT 1 FROM public.meal_templates m WHERE m.id = meal_template_id AND m.user_id = auth.uid())
    )
  );
CREATE POLICY "own dli delete" ON public.daily_log_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.daily_logs d WHERE d.id = daily_log_id AND d.user_id = auth.uid()));
CREATE TRIGGER dli_updated BEFORE UPDATE ON public.daily_log_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('product-labels','product-labels', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "labels select own" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-labels' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "labels insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-labels' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "labels update own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-labels' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "labels delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-labels' AND auth.uid()::text = (storage.foldername(name))[1]);
