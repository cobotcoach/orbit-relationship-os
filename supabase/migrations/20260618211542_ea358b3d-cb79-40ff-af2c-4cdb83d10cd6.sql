-- Replace business_sections seed and add mission_chats table
DELETE FROM public.business_sections;

INSERT INTO public.business_sections (slug, title, emoji, status, confidence_score, next_action, blockers) VALUES
('vision', 'Vision & Value Proposition', '🎯', 'active', 7,
'Write a single crisp paragraph that defines what Cobot Coach is, who it is for, and why it exists — in plain English with no jargon',
ARRAY['Messaging is scattered across 20+ documents and chats — no single canonical statement exists']),
('market', 'Market & Opportunity', '📊', 'active', 8,
'Consolidate the 70/20/10 market data and £58k labour value stat into a single reference document',
ARRAY[]::TEXT[]),
('monetisation', 'Monetisation & Pricing', '💰', 'blocked', 3,
'Make a firm decision: free launch now or Founding Partner fee from day one — and write it down as a logged decision',
ARRAY['Three conflicting models exist simultaneously: £10-15k Founding Partner fee vs £300/month vs free launch', 'No decision has been formally made and recorded', 'Stripe not yet integrated']),
('product', 'Product & Platform', '🏗️', 'active', 7,
'Fix the 4 dead CTA buttons on solution detail pages — this is the only launch blocker in the build',
ARRAY['All 4 solution CTA buttons are dead — no onClick handlers', 'No enquiry flow exists meaning integrators cannot receive leads', 'Privacy Policy and Terms pages 404']),
('brand', 'Brand & Identity', '✨', 'active', 7,
'Define the brand voice in one page — what Cobot Coach sounds like, what it never says, and the 3 words that describe it',
ARRAY[]::TEXT[]),
('messaging', 'Messaging & Positioning', '💬', 'blocked', 4,
'Pick one core message and use it consistently — current messaging is spread across 20+ docs, chats and voice notes',
ARRAY['No single canonical messaging document exists', 'Value proposition differs between manufacturer-facing and integrator-facing materials', 'Neutrality/independence narrative needs clarifying given employment at Dobot']),
('gtm', 'Go-To-Market Strategy', '🗺️', 'active', 5,
'Write the July launch sequence: who gets contacted, in what order, with what message, on what date',
ARRAY['No written GTM plan exists', 'Employment conflict of interest not yet resolved for approaching Dobot SI contacts']),
('sales', 'Sales & Partner Pipeline', '🤝', 'active', 5,
'Send the first outreach message to Jamie Ross at JTR Automation this week',
ARRAY['Conflict of interest: JTR, Labman and Astech are all current Dobot channel partners', 'No partner commercial page on the website', 'No clear offer until monetisation decision is made']),
('content', 'Content & Marketing', '📣', 'active', 5,
'Publish one piece of content this week — LinkedIn post using the race-to-value narrative',
ARRAY['No content published yet', 'No content calendar or plan']),
('legal', 'Legal & Compliance', '⚖️', 'blocked', 2,
'Draft Privacy Policy and Terms of Service this week — can be template-based, then solicitor reviewed',
ARRAY['No Privacy Policy — legal blocker for UK GDPR', 'No Terms of Service — needed before any partner signs up', 'No Cookie consent banner — UK PECR requirement', 'ICO registration likely required (£40-60/yr)', 'Partner terms needed before founding partners upload content']),
('financial', 'Financial Model & Runway', '📈', 'active', 6,
'Confirm the minimum revenue needed to replace current Dobot salary and map it against the chosen monetisation model',
ARRAY['Monetisation model undecided which makes financial modelling meaningless', 'Min £115k turnover needed to match current take-home — not yet mapped to any scenario']),
('mindset', 'Founder Clarity & Risks', '🧠', 'active', 4,
'Write down the three things causing the most doubt and the factual answer to each one',
ARRAY['Employment conflict of interest causing paralysis on outreach', 'Monetisation uncertainty undermining confidence', 'Ideas scattered across too many places — no single source of truth until now']);

-- Mission Control chat history
CREATE TABLE public.mission_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_chats TO anon, authenticated;
GRANT ALL ON public.mission_chats TO service_role;

ALTER TABLE public.mission_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access to mission_chats" ON public.mission_chats
FOR ALL USING (true) WITH CHECK (true);