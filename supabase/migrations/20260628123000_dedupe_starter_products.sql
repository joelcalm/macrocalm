WITH duplicate_starters AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, lower(trim(name)), category
      ORDER BY created_at, id
    ) AS duplicate_rank
  FROM public.products
  WHERE brand = 'Common foods'
    AND source_type = 'manual'
    AND notes = 'Common raw food nutrition values per 100 g.'
)
DELETE FROM public.products
USING duplicate_starters
WHERE products.id = duplicate_starters.id
  AND duplicate_starters.duplicate_rank > 1;

CREATE UNIQUE INDEX products_unique_common_foods_idx
ON public.products (user_id, lower(trim(name)), category)
WHERE brand = 'Common foods'
  AND source_type = 'manual'
  AND notes = 'Common raw food nutrition values per 100 g.';
