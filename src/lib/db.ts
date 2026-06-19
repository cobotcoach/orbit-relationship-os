import { supabase } from "@/integrations/supabase/client";
import type { Contact, Activity, Action, IntelligenceItem, SmartTopic, Idea, FocusItem, CaptureLogEntry, BusinessSection, WeeklyCommitment, Decision, MissionChat } from "./types";

// Legacy table row shims (tables retained in DB but no longer surfaced in UI).
type Quote = { id: string; contact_id: string | null; value: number; stage: string; [k: string]: unknown };
type AppEvent = { id: string; [k: string]: unknown };
type LoanEquipment = { id: string; contact_id: string | null; status: string; [k: string]: unknown };
type SupportTicket = { id: string; contact_id: string | null; [k: string]: unknown };

function mondayISO(d = new Date()) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

export const db = {
  contacts: {
    list: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from("contacts").select("*").order("urgent", { ascending: false }).order("updated_at", { ascending: false });
      if (error) throw error; return (data ?? []) as Contact[];
    },
    get: async (id: string): Promise<Contact | null> => {
      const { data, error } = await supabase.from("contacts").select("*").eq("id", id).maybeSingle();
      if (error) throw error; return data as Contact | null;
    },
    insert: async (c: Partial<Contact>): Promise<Contact> => {
      const { data, error } = await supabase.from("contacts").insert(c as never).select().single();
      if (error) throw error; return data as Contact;
    },
    update: async (id: string, patch: Partial<Contact>): Promise<void> => {
      const { error } = await supabase.from("contacts").update(patch as never).eq("id", id);
      if (error) throw error;
    },
  },
  activities: {
    forContact: async (contact_id: string): Promise<Activity[]> => {
      const { data, error } = await supabase.from("activities").select("*").eq("contact_id", contact_id).order("occurred_at", { ascending: false });
      if (error) throw error; return (data ?? []) as Activity[];
    },
    insert: async (a: Partial<Activity>): Promise<void> => {
      const { error } = await supabase.from("activities").insert(a as never);
      if (error) throw error;
    },
  },
  actions: {
    list: async (): Promise<Action[]> => {
      const { data, error } = await supabase.from("actions").select("*").order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as Action[];
    },
    forContact: async (contact_id: string): Promise<Action[]> => {
      const { data, error } = await supabase.from("actions").select("*").eq("contact_id", contact_id).order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as Action[];
    },
    insert: async (a: Partial<Action>): Promise<void> => {
      const { error } = await supabase.from("actions").insert(a as never);
      if (error) throw error;
    },
    update: async (id: string, patch: Partial<Action>): Promise<void> => {
      const { error } = await supabase.from("actions").update(patch as never).eq("id", id);
      if (error) throw error;
    },
  },
  quotes: {
    list: async (): Promise<Quote[]> => {
      const { data, error } = await supabase.from("quotes").select("*").order("updated_at", { ascending: false });
      if (error) throw error; return (data ?? []) as Quote[];
    },
    forContact: async (contact_id: string): Promise<Quote[]> => {
      const { data, error } = await supabase.from("quotes").select("*").eq("contact_id", contact_id);
      if (error) throw error; return (data ?? []) as Quote[];
    },
    insert: async (q: Partial<Quote>): Promise<void> => {
      const { error } = await supabase.from("quotes").insert(q as never);
      if (error) throw error;
    },
  },
  events: {
    list: async (): Promise<AppEvent[]> => {
      const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
      if (error) throw error; return (data ?? []) as AppEvent[];
    },
    insert: async (e: Partial<AppEvent>): Promise<void> => {
      const { error } = await supabase.from("events").insert(e as never);
      if (error) throw error;
    },
  },
  loans: {
    list: async (): Promise<LoanEquipment[]> => {
      const { data, error } = await supabase.from("loan_equipment").select("*").order("date_out", { ascending: false });
      if (error) throw error; return (data ?? []) as LoanEquipment[];
    },
    insert: async (l: Partial<LoanEquipment>): Promise<void> => {
      const { error } = await supabase.from("loan_equipment").insert(l as never);
      if (error) throw error;
    },
    update: async (id: string, patch: Partial<LoanEquipment>): Promise<void> => {
      const { error } = await supabase.from("loan_equipment").update(patch as never).eq("id", id);
      if (error) throw error;
    },
  },
  tickets: {
    list: async (): Promise<SupportTicket[]> => {
      const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as SupportTicket[];
    },
    forContact: async (contact_id: string): Promise<SupportTicket[]> => {
      const { data, error } = await supabase.from("support_tickets").select("*").eq("contact_id", contact_id);
      if (error) throw error; return (data ?? []) as SupportTicket[];
    },
    insert: async (t: Partial<SupportTicket>): Promise<void> => {
      const { error } = await supabase.from("support_tickets").insert(t as never);
      if (error) throw error;
    },
  },
  intel: {
    list: async (): Promise<IntelligenceItem[]> => {
      const { data, error } = await supabase.from("intelligence_items").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return (data ?? []) as IntelligenceItem[];
    },
    insert: async (i: Partial<IntelligenceItem>): Promise<IntelligenceItem> => {
      const { data, error } = await supabase.from("intelligence_items").insert(i as never).select().single();
      if (error) throw error; return data as IntelligenceItem;
    },
  },
  topics: {
    list: async (): Promise<SmartTopic[]> => {
      const { data, error } = await supabase.from("smart_topics").select("*").order("last_activity", { ascending: false });
      if (error) throw error; return (data ?? []) as SmartTopic[];
    },
    forContact: async (contact_id: string): Promise<SmartTopic[]> => {
      const { data, error } = await supabase.from("smart_topics").select("*").eq("contact_id", contact_id).order("last_activity", { ascending: false });
      if (error) throw error; return (data ?? []) as SmartTopic[];
    },
    insert: async (t: Partial<SmartTopic>): Promise<SmartTopic> => {
      const { data, error } = await supabase.from("smart_topics").insert(t as never).select().single();
      if (error) throw error; return data as SmartTopic;
    },
    update: async (id: string, patch: Partial<SmartTopic>): Promise<void> => {
      const { error } = await supabase.from("smart_topics").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from("smart_topics").delete().eq("id", id);
      if (error) throw error;
    },
  },
  ideas: {
    list: async (): Promise<Idea[]> => {
      const { data, error } = await supabase.from("ideas").select("*").order("created_at", { ascending: false });
      if (error) throw error; return (data ?? []) as Idea[];
    },
    insert: async (i: Partial<Idea>): Promise<Idea> => {
      const { data, error } = await supabase.from("ideas").insert(i as never).select().single();
      if (error) throw error; return data as Idea;
    },
    update: async (id: string, patch: Partial<Idea>): Promise<void> => {
      const { error } = await supabase.from("ideas").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    remove: async (id: string): Promise<void> => {
      const { error } = await supabase.from("ideas").delete().eq("id", id);
      if (error) throw error;
    },
  },
  focus: {
    list: async (): Promise<FocusItem[]> => {
      const { data, error } = await supabase.from("focus_items").select("*").order("date", { ascending: false }).order("priority", { ascending: true });
      if (error) throw error; return (data ?? []) as FocusItem[];
    },
    today: async (): Promise<FocusItem[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from("focus_items").select("*").eq("date", today).order("priority", { ascending: true });
      if (error) throw error; return (data ?? []) as FocusItem[];
    },
    insert: async (f: Partial<FocusItem>): Promise<FocusItem> => {
      const { data, error } = await supabase.from("focus_items").insert(f as never).select().single();
      if (error) throw error; return data as FocusItem;
    },
    update: async (id: string, patch: Partial<FocusItem>): Promise<void> => {
      const { error } = await supabase.from("focus_items").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    clearForDate: async (date: string): Promise<void> => {
      const { error } = await supabase.from("focus_items").delete().eq("date", date);
      if (error) throw error;
    },
  },
  log: {
    list: async (): Promise<CaptureLogEntry[]> => {
      const { data, error } = await supabase.from("captures_log").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error; return (data ?? []) as CaptureLogEntry[];
    },
    insert: async (entry: Partial<CaptureLogEntry>): Promise<CaptureLogEntry> => {
      const { data, error } = await supabase.from("captures_log").insert(entry as never).select().single();
      if (error) throw error; return data as CaptureLogEntry;
    },
    update: async (id: string, patch: Partial<CaptureLogEntry>): Promise<void> => {
      const { error } = await supabase.from("captures_log").update(patch as never).eq("id", id);
      if (error) throw error;
    },
  },
  sections: {
    list: async (): Promise<BusinessSection[]> => {
      const { data, error } = await supabase.from("business_sections").select("*").order("slug");
      if (error) throw error; return (data ?? []) as BusinessSection[];
    },
    get: async (slug: string): Promise<BusinessSection | null> => {
      const { data, error } = await supabase.from("business_sections").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error; return data as BusinessSection | null;
    },
    update: async (slug: string, patch: Partial<BusinessSection>): Promise<void> => {
      const { error } = await supabase.from("business_sections").update({ ...patch, last_updated: new Date().toISOString() } as never).eq("slug", slug);
      if (error) throw error;
    },
  },
  commitments: {
    thisWeek: async (): Promise<WeeklyCommitment[]> => {
      const { data, error } = await supabase.from("weekly_commitments").select("*").eq("week_starting", mondayISO()).order("created_at");
      if (error) throw error; return (data ?? []) as WeeklyCommitment[];
    },
    lastWeek: async (): Promise<WeeklyCommitment[]> => {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - 7);
      const { data, error } = await supabase.from("weekly_commitments").select("*").eq("week_starting", mondayISO(d)).order("created_at");
      if (error) throw error; return (data ?? []) as WeeklyCommitment[];
    },
    insert: async (c: Partial<WeeklyCommitment>): Promise<WeeklyCommitment> => {
      const payload = { week_starting: mondayISO(), ...c } as never;
      const { data, error } = await supabase.from("weekly_commitments").insert(payload).select().single();
      if (error) throw error; return data as WeeklyCommitment;
    },
    update: async (id: string, patch: Partial<WeeklyCommitment>): Promise<void> => {
      const { error } = await supabase.from("weekly_commitments").update(patch as never).eq("id", id);
      if (error) throw error;
    },
  },
  decisions: {
    list: async (sectionSlug?: string): Promise<Decision[]> => {
      let q = supabase.from("decisions").select("*").order("made_at", { ascending: false });
      if (sectionSlug) q = q.eq("section_slug", sectionSlug);
      const { data, error } = await q;
      if (error) throw error; return (data ?? []) as Decision[];
    },
    insert: async (d: Partial<Decision>): Promise<Decision> => {
      const { data, error } = await supabase.from("decisions").insert(d as never).select().single();
      if (error) throw error; return data as Decision;
    },
  },
  missionChats: {
    list: async (limit = 50): Promise<MissionChat[]> => {
      const { data, error } = await supabase.from("mission_chats" as never).select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error; return ((data ?? []) as MissionChat[]).reverse();
    },
    insert: async (q: string, a: string): Promise<void> => {
      const { error } = await supabase.from("mission_chats" as never).insert({ question: q, answer: a } as never);
      if (error) throw error;
    },
  },
};

export { mondayISO };


