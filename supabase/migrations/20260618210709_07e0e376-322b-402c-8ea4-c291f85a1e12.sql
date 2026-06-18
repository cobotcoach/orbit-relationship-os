
CREATE TABLE public.business_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  owner_summary TEXT,
  ai_synthesis TEXT,
  ai_synthesised_at TIMESTAMPTZ,
  blockers TEXT[] DEFAULT '{}',
  next_action TEXT,
  confidence_score INT DEFAULT 5,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.business_sections TO anon, authenticated, service_role;
ALTER TABLE public.business_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.business_sections FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.weekly_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_starting DATE NOT NULL,
  section_slug TEXT NOT NULL,
  commitment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT ALL ON public.weekly_commitments TO anon, authenticated, service_role;
ALTER TABLE public.weekly_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.weekly_commitments FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  section_slug TEXT NOT NULL,
  decision TEXT NOT NULL,
  reasoning TEXT,
  alternatives TEXT,
  made_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_at DATE
);
GRANT ALL ON public.decisions TO anon, authenticated, service_role;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON public.decisions FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.business_sections (slug, title, emoji, status, confidence_score) VALUES
('monetisation', 'Monetisation', '💰', 'active', 5),
('build', 'Platform Build', '🏗️', 'active', 7),
('sales', 'Sales & Partners', '🤝', 'active', 4),
('content', 'Content & Marketing', '📣', 'active', 5),
('launch', 'Launch Plan', '🚀', 'active', 6),
('legal', 'Legal & Compliance', '⚖️', 'blocked', 3),
('mindset', 'Clarity & Mindset', '🧠', 'active', 5);
