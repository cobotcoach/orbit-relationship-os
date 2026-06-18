CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  energy_score INT NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'new',
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideas TO anon, authenticated;
GRANT ALL ON public.ideas TO service_role;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.ideas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER ideas_touch_updated_at BEFORE UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.focus_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  why TEXT,
  linked_idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
  linked_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  priority INT NOT NULL DEFAULT 2,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_items TO anon, authenticated;
GRANT ALL ON public.focus_items TO service_role;
ALTER TABLE public.focus_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.focus_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER focus_items_touch_updated_at BEFORE UPDATE ON public.focus_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();