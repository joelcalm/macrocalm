ALTER TABLE public.products
ADD COLUMN category TEXT NOT NULL DEFAULT 'other'
CHECK (category IN ('fruits', 'vegetables', 'meats', 'dairy', 'other'));

CREATE INDEX products_user_category_idx ON public.products(user_id, category);
