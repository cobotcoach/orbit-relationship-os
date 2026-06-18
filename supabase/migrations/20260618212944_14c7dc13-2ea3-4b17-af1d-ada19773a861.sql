ALTER TABLE public.business_sections
  ADD COLUMN IF NOT EXISTS drive_doc_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS drive_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS drive_doc_content TEXT;