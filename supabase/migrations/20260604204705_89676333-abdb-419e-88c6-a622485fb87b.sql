
-- Contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  type TEXT NOT NULL, -- channel_partner, end_user, prospect, ecosystem_partner, distributor, internal
  folder TEXT NOT NULL, -- e.g. active, onboarding_1, onboarding_2, onboarding_3, onboarding_4, lapsed, enterprise, sme, hot, warm, cold, default
  industry TEXT,
  health_score INT NOT NULL DEFAULT 50,
  last_contact_date TIMESTAMPTZ,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  urgent BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_type ON public.contacts(type);
CREATE INDEX idx_contacts_folder ON public.contacts(folder);

-- Activities (timeline)
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- note, call, email, meeting, intelligence, system
  summary TEXT NOT NULL,
  details TEXT,
  sentiment TEXT, -- positive, neutral, negative
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activities_contact ON public.activities(contact_id, occurred_at DESC);

-- Actions (open tasks)
CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, done
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_actions_contact ON public.actions(contact_id);
CREATE INDEX idx_actions_status ON public.actions(status);

-- Quotes
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_ref TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company TEXT,
  products TEXT,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  stage TEXT NOT NULL DEFAULT 'prospect', -- prospect, quoted, negotiating, won, lost
  channel TEXT NOT NULL DEFAULT 'direct', -- partner, direct, distributor
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotes_contact ON public.quotes(contact_id);
CREATE INDEX idx_quotes_stage ON public.quotes(stage);

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL, -- attend, exhibit, host, sponsor
  status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, active, complete
  notes TEXT,
  linked_contact_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loan equipment
CREATE TABLE public.loan_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT NOT NULL,
  product_name TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  date_out DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status TEXT NOT NULL DEFAULT 'on_loan', -- on_loan, returned, missing
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  equipment_serial TEXT,
  issue TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved
  assigned_to TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intelligence feed
CREATE TABLE public.intelligence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'inbox', -- inbox, email, transcript, comms
  raw_input TEXT NOT NULL,
  summary TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  sentiment TEXT,
  urgency TEXT,
  contact_ids UUID[] NOT NULL DEFAULT '{}',
  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_intelligence_created ON public.intelligence_items(created_at DESC);

-- Grants (single-operator tool, no auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_equipment TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_items TO anon, authenticated;
GRANT ALL ON public.contacts, public.activities, public.actions, public.quotes,
  public.events, public.loan_equipment, public.support_tickets, public.intelligence_items TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.loan_equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.intelligence_items FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed Jamie Ross
INSERT INTO public.contacts (name, company, role, type, folder, health_score, urgent, last_contact_date, tags, notes)
VALUES (
  'Jamie Ross', 'JTR Automation', 'Director', 'channel_partner', 'active', 85, true, now() - interval '2 days',
  ARRAY['cobot','welding','UKCA'],
  'Competing for cobot MIG welding project. UKCA compliance is the key differentiator vs Chinese competitor. High-value opportunity.'
);
