ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY invoice_id
           ORDER BY created_at, id
         ) - 1 AS rn
  FROM public.invoice_items
)
UPDATE public.invoice_items i
   SET position = ranked.rn
  FROM ranked
 WHERE ranked.id = i.id
   AND i.position = 0;

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_position
  ON public.invoice_items (invoice_id, position);