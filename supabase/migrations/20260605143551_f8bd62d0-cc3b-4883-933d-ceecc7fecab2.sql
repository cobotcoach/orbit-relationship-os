
CREATE TABLE public.smart_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_update TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_action TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_topics TO anon, authenticated;
GRANT ALL ON public.smart_topics TO service_role;
ALTER TABLE public.smart_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.smart_topics FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER smart_topics_touch BEFORE UPDATE ON public.smart_topics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX smart_topics_contact_id_idx ON public.smart_topics(contact_id);
CREATE INDEX smart_topics_status_idx ON public.smart_topics(status);
