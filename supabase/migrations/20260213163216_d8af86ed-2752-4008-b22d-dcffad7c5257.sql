DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'notifications',
    'lab_request_messages'
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