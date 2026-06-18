export type ContactType =
  | "channel_partner"
  | "end_user"
  | "prospect"
  | "ecosystem_partner"
  | "distributor"
  | "internal";

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

export interface Quote {
  id: string;
  quote_ref: string;
  contact_id: string | null;
  company: string | null;
  products: string | null;
  value: number;
  stage: "prospect" | "quoted" | "negotiating" | "won" | "lost";
  channel: "partner" | "direct" | "distributor";
  quote_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppEvent {
  id: string;
  name: string;
  event_date: string;
  event_type: "attend" | "exhibit" | "host" | "sponsor";
  status: "upcoming" | "active" | "complete";
  notes: string | null;
  linked_contact_ids: string[];
  created_at: string;
}

export interface LoanEquipment {
  id: string;
  serial_number: string;
  product_name: string;
  contact_id: string | null;
  date_out: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: "on_loan" | "returned" | "missing";
  notes: string | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  contact_id: string | null;
  equipment_serial: string | null;
  issue: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved";
  assigned_to: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
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

export type IdeaMode = "dobot" | "cobot_coach" | "life" | "wild";
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
  { value: "dobot", label: "Dobot", emoji: "🔵", color: "blue" },
  { value: "cobot_coach", label: "Cobot Coach", emoji: "🟠", color: "orange" },
  { value: "life", label: "Life", emoji: "🟢", color: "green" },
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
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "channel_partner", label: "Channel Partners" },
  { value: "end_user", label: "End Users" },
  { value: "prospect", label: "Prospects" },
  { value: "ecosystem_partner", label: "Ecosystem Partners" },
  { value: "distributor", label: "Distributors" },
  { value: "internal", label: "Internal" },
];

export const FOLDERS_BY_TYPE: Record<ContactType, { value: string; label: string }[]> = {
  channel_partner: [
    { value: "active", label: "Active" },
    { value: "onboarding_1", label: "Onboarding · Stage 1" },
    { value: "onboarding_2", label: "Onboarding · Stage 2" },
    { value: "onboarding_3", label: "Onboarding · Stage 3" },
    { value: "onboarding_4", label: "Onboarding · Stage 4" },
    { value: "lapsed", label: "Lapsed" },
  ],
  end_user: [
    { value: "enterprise", label: "Enterprise" },
    { value: "sme", label: "SME" },
  ],
  prospect: [
    { value: "hot", label: "Hot" },
    { value: "warm", label: "Warm" },
    { value: "cold", label: "Cold" },
  ],
  ecosystem_partner: [{ value: "default", label: "All" }],
  distributor: [{ value: "default", label: "All" }],
  internal: [{ value: "default", label: "All" }],
};
