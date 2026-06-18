export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          urgency: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          urgency?: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          contact_id: string
          created_at: string
          details: string | null
          id: string
          kind: string
          occurred_at: string
          sentiment: string | null
          summary: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          details?: string | null
          id?: string
          kind: string
          occurred_at?: string
          sentiment?: string | null
          summary: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          sentiment?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          folder: string
          health_score: number
          id: string
          industry: string | null
          last_contact_date: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          tags: string[]
          type: string
          updated_at: string
          urgent: boolean
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          folder: string
          health_score?: number
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tags?: string[]
          type: string
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          folder?: string
          health_score?: number
          id?: string
          industry?: string | null
          last_contact_date?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tags?: string[]
          type?: string
          updated_at?: string
          urgent?: boolean
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          linked_contact_ids: string[]
          name: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          linked_contact_ids?: string[]
          name: string
          notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          linked_contact_ids?: string[]
          name?: string
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      focus_items: {
        Row: {
          created_at: string
          date: string
          id: string
          linked_contact_id: string | null
          linked_idea_id: string | null
          priority: number
          status: string
          title: string
          updated_at: string
          why: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          linked_contact_id?: string | null
          linked_idea_id?: string | null
          priority?: number
          status?: string
          title: string
          updated_at?: string
          why?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          linked_contact_id?: string | null
          linked_idea_id?: string | null
          priority?: number
          status?: string
          title?: string
          updated_at?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "focus_items_linked_contact_id_fkey"
            columns: ["linked_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_items_linked_idea_id_fkey"
            columns: ["linked_idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          category: string
          created_at: string
          energy_score: number
          id: string
          raw_text: string
          source: string
          status: string
          summary: string | null
          tags: string[]
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          energy_score?: number
          id?: string
          raw_text: string
          source?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          energy_score?: number
          id?: string
          raw_text?: string
          source?: string
          status?: string
          summary?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      intelligence_items: {
        Row: {
          contact_ids: string[]
          created_at: string
          extracted: Json
          id: string
          raw_input: string
          sentiment: string | null
          source: string
          summary: string | null
          topics: string[]
          urgency: string | null
        }
        Insert: {
          contact_ids?: string[]
          created_at?: string
          extracted?: Json
          id?: string
          raw_input: string
          sentiment?: string | null
          source?: string
          summary?: string | null
          topics?: string[]
          urgency?: string | null
        }
        Update: {
          contact_ids?: string[]
          created_at?: string
          extracted?: Json
          id?: string
          raw_input?: string
          sentiment?: string | null
          source?: string
          summary?: string | null
          topics?: string[]
          urgency?: string | null
        }
        Relationships: []
      }
      loan_equipment: {
        Row: {
          actual_return_date: string | null
          contact_id: string | null
          created_at: string
          date_out: string
          expected_return_date: string | null
          id: string
          notes: string | null
          product_name: string
          serial_number: string
          status: string
        }
        Insert: {
          actual_return_date?: string | null
          contact_id?: string | null
          created_at?: string
          date_out?: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          product_name: string
          serial_number: string
          status?: string
        }
        Update: {
          actual_return_date?: string | null
          contact_id?: string | null
          created_at?: string
          date_out?: string
          expected_return_date?: string | null
          id?: string
          notes?: string | null
          product_name?: string
          serial_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_equipment_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          channel: string
          company: string | null
          contact_id: string | null
          created_at: string
          id: string
          notes: string | null
          products: string | null
          quote_date: string
          quote_ref: string
          stage: string
          updated_at: string
          value: number
        }
        Insert: {
          channel?: string
          company?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          products?: string | null
          quote_date?: string
          quote_ref: string
          stage?: string
          updated_at?: string
          value?: number
        }
        Update: {
          channel?: string
          company?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          products?: string | null
          quote_date?: string
          quote_ref?: string
          stage?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_topics: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          last_activity: string
          last_update: string | null
          next_action: string | null
          notes: string | null
          opened_at: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          last_activity?: string
          last_update?: string | null
          next_action?: string | null
          notes?: string | null
          opened_at?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          last_activity?: string
          last_update?: string | null
          next_action?: string | null
          notes?: string | null
          opened_at?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_topics_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          equipment_serial: string | null
          id: string
          issue: string
          priority: string
          resolution_notes: string | null
          status: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          equipment_serial?: string | null
          id?: string
          issue: string
          priority?: string
          resolution_notes?: string | null
          status?: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          equipment_serial?: string | null
          id?: string
          issue?: string
          priority?: string
          resolution_notes?: string | null
          status?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
