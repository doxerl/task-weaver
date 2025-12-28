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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actual_entries: {
        Row: {
          confidence: number | null
          created_at: string
          end_at: string
          id: string
          linked_github: Json | null
          linked_plan_item_id: string | null
          notes: string | null
          source: string | null
          start_at: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          end_at: string
          id?: string
          linked_github?: Json | null
          linked_plan_item_id?: string | null
          notes?: string | null
          source?: string | null
          start_at: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          end_at?: string
          id?: string
          linked_github?: Json | null
          linked_plan_item_id?: string | null
          notes?: string | null
          source?: string | null
          start_at?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "actual_entries_linked_plan_item_id_fkey"
            columns: ["linked_plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      command_events: {
        Row: {
          ai_json_output: Json | null
          ai_parse_ok: boolean | null
          apply_status: string | null
          clarifying_questions: Json | null
          context: Json | null
          created_at: string
          diff_summary: Json | null
          error: string | null
          id: string
          normalized_text: string | null
          raw_transcript: string | null
          source: string | null
          task: string | null
          user_id: string
          warnings: Json | null
        }
        Insert: {
          ai_json_output?: Json | null
          ai_parse_ok?: boolean | null
          apply_status?: string | null
          clarifying_questions?: Json | null
          context?: Json | null
          created_at?: string
          diff_summary?: Json | null
          error?: string | null
          id?: string
          normalized_text?: string | null
          raw_transcript?: string | null
          source?: string | null
          task?: string | null
          user_id: string
          warnings?: Json | null
        }
        Update: {
          ai_json_output?: Json | null
          ai_parse_ok?: boolean | null
          apply_status?: string | null
          clarifying_questions?: Json | null
          context?: Json | null
          created_at?: string
          diff_summary?: Json | null
          error?: string | null
          id?: string
          normalized_text?: string | null
          raw_transcript?: string | null
          source?: string | null
          task?: string | null
          user_id?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "command_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      day_reviews: {
        Row: {
          created_at: string
          date: string
          id: string
          review_json: Json
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          review_json: Json
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          review_json?: Json
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      github_work_items_cache: {
        Row: {
          assignees: string[] | null
          id: string
          labels: string[] | null
          number: number
          owner: string
          provider: string | null
          raw: Json | null
          repo: string
          state: string
          title: string
          type: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          assignees?: string[] | null
          id?: string
          labels?: string[] | null
          number: number
          owner: string
          provider?: string | null
          raw?: Json | null
          repo: string
          state: string
          title: string
          type: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          assignees?: string[] | null
          id?: string
          labels?: string[] | null
          number?: number
          owner?: string
          provider?: string | null
          raw?: Json | null
          repo?: string
          state?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "github_work_items_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations_github: {
        Row: {
          connected_at: string
          id: string
          mode: string | null
          scopes: string[] | null
          token_encrypted: string
          token_last4: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          id?: string
          mode?: string | null
          scopes?: string[] | null
          token_encrypted: string
          token_last4?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          id?: string
          mode?: string | null
          scopes?: string[] | null
          token_encrypted?: string
          token_last4?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_github_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          created_at: string
          end_at: string
          id: string
          linked_github: Json | null
          location: string | null
          notes: string | null
          priority: string | null
          source: string | null
          start_at: string
          status: string | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          linked_github?: Json | null
          location?: string | null
          notes?: string | null
          priority?: string | null
          source?: string | null
          start_at: string
          status?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          linked_github?: Json | null
          location?: string | null
          notes?: string | null
          priority?: string | null
          source?: string | null
          start_at?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          locale: string | null
          timezone: string | null
          updated_at: string
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          locale?: string | null
          timezone?: string | null
          updated_at?: string
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          locale?: string | null
          timezone?: string | null
          updated_at?: string
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: []
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
