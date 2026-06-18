import { supabase } from "@/integrations/supabase/client";
import type { Contact, Activity, Action, Quote, AppEvent, LoanEquipment, SupportTicket, IntelligenceItem, SmartTopic, Idea, FocusItem, CaptureLogEntry } from "./types";

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
};

