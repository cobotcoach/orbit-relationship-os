CREATE TABLE public.captures_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  original_filename TEXT,
  raw_text TEXT NOT NULL,
  char_count INT,
  routed_to TEXT,
  routed_id UUID,
  mode TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.captures_log TO anon, authenticated;
GRANT ALL ON public.captures_log TO service_role;
ALTER TABLE public.captures_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.captures_log FOR ALL USING (true) WITH CHECK (true);