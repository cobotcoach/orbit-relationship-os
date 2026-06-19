export type ContactType = "partner" | "prospect" | "ecosystem";

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  type: ContactType;
  folder: string;
  industry: string | null;
  health_score: number;
  last_contact_date: string | null;
  tags: string[];
  mode_tags: string[];
  notes: string | null;
  urgent: boolean;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  contact_id: string;
  kind: string;
  summary: string;
  details: string | null;
  sentiment: string | null;
  occurred_at: string;
  created_at: string;
}

export interface Action {
  id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  urgency: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "done" | "deferred" | "open";
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface IntelligenceItem {
  id: string;
  source: string;
  raw_input: string;
  summary: string | null;
  topics: string[];
  sentiment: string | null;
  urgency: string | null;
  contact_ids: string[];
  extracted: Record<string, unknown>;
  created_at: string;
}

export type IdeaMode = "cobot_coach" | "wild";
export type IdeaStatus = "new" | "reviewing" | "active" | "parked" | "done";

export interface Idea {
  id: string;
  raw_text: string;
  title: string | null;
  summary: string | null;
  mode: IdeaMode | string;
  energy_score: number;
  status: IdeaStatus | string;
  tags: string[];
  source: string;
  created_at: string;
  updated_at: string;
}

export interface FocusItem {
  id: string;
  title: string;
  why: string | null;
  linked_idea_id: string | null;
  linked_contact_id: string | null;
  priority: number;
  date: string;
  status: "pending" | "done" | "deferred" | string;
  created_at: string;
  updated_at: string;
}

export const IDEA_MODES: { value: IdeaMode; label: string; emoji: string; color: string }[] = [
  { value: "cobot_coach", label: "Cobot Coach", emoji: "🟠", color: "amber" },
  { value: "wild", label: "Wild Ideas", emoji: "🟣", color: "purple" },
];

export type TopicStatus = "waiting_on_them" | "waiting_on_you" | "active" | "stalled" | "resolved";

export interface SmartTopic {
  id: string;
  title: string;
  contact_id: string | null;
  status: TopicStatus;
  last_update: string | null;
  opened_at: string;
  last_activity: string;
  next_action: string | null;
  source: "manual" | "inbox" | "plaud" | string;
  mode: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CONTACT_TYPES: { value: ContactType; label: string; description: string }[] = [
  { value: "partner", label: "Partners", description: "SI integrators — your commercial targets" },
  { value: "prospect", label: "Prospects", description: "Manufacturers — potential platform users" },
  { value: "ecosystem", label: "Ecosystem", description: "Suppliers, robot makers, others" },
];

export const FOLDERS_BY_TYPE: Record<ContactType, { value: string; label: string }[]> = {
  partner: [
    { value: "approached", label: "Approached" },
    { value: "interested", label: "Interested" },
    { value: "committed", label: "Committed" },
    { value: "live", label: "Live" },
  ],
  prospect: [
    { value: "warm", label: "Warm" },
    { value: "cold", label: "Cold" },
  ],
  ecosystem: [
    { value: "default", label: "All" },
  ],
};

export interface CaptureLogEntry {
  id: string;
  source: string;
  original_filename: string | null;
  raw_text: string;
  char_count: number | null;
  routed_to: string | null;
  routed_id: string | null;
  mode: string | null;
  status: string;
  error_text: string | null;
  created_at: string;
}

export interface BusinessSection {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  status: "active" | "parked" | "blocked" | string;
  owner_summary: string | null;
  ai_synthesis: string | null;
  ai_synthesised_at: string | null;
  blockers: string[] | null;
  next_action: string | null;
  confidence_score: number | null;
  last_updated: string;
  drive_doc_id: string | null;
  drive_doc_url: string | null;
  drive_synced_at: string | null;
  drive_doc_content: string | null;
}

export interface WeeklyCommitment {
  id: string;
  week_starting: string;
  section_slug: string;
  commitment: string;
  status: "pending" | "done" | "missed" | "carried" | string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Decision {
  id: string;
  title: string;
  section_slug: string;
  decision: string;
  reasoning: string | null;
  alternatives: string | null;
  made_at: string;
  review_at: string | null;
}

export interface MissionChat {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}
