DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'horses',
    'horse_ownership',
    'horse_vaccinations',
    'vet_visits',
    'vet_events',
    'vet_treatments',
    'vet_medications',
    'vet_followups',
    'lab_requests',
    'lab_samples',
    'lab_results',
    'invoices',
    'invoice_items',
    'expenses',
    'ledger_entries',
    'horse_orders',
    'horse_order_events',
    'horse_movements',
    'housing_units',
    'housing_unit_occupants'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'Publication "supabase_realtime" does not exist';
  END IF;

  FOREACH tbl IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE 'Added table "%" to supabase_realtime', tbl;
    ELSE
      RAISE NOTICE 'Table "%" already in supabase_realtime (skipped)', tbl;
    END IF;
  END LOOP;
END $$;