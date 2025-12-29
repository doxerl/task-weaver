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
          deviation_minutes: number | null
          end_at: string
          id: string
          linked_github: Json | null
          linked_plan_item_id: string | null
          match_method: string | null
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
          deviation_minutes?: number | null
          end_at: string
          id?: string
          linked_github?: Json | null
          linked_plan_item_id?: string | null
          match_method?: string | null
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
          deviation_minutes?: number | null
          end_at?: string
          id?: string
          linked_github?: Json | null
          linked_plan_item_id?: string | null
          match_method?: string | null
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
      day_metrics: {
        Row: {
          actual_count: number
          actual_minutes: number
          avg_deviation_minutes: number | null
          completed_count: number
          completion_rate: number | null
          created_at: string
          date: string
          focus_score: number | null
          id: string
          planned_count: number
          planned_minutes: number
          skipped_count: number
          unplanned_count: number
          updated_at: string
          user_id: string
          within_tolerance_count: number
        }
        Insert: {
          actual_count?: number
          actual_minutes?: number
          avg_deviation_minutes?: number | null
          completed_count?: number
          completion_rate?: number | null
          created_at?: string
          date: string
          focus_score?: number | null
          id?: string
          planned_count?: number
          planned_minutes?: number
          skipped_count?: number
          unplanned_count?: number
          updated_at?: string
          user_id: string
          within_tolerance_count?: number
        }
        Update: {
          actual_count?: number
          actual_minutes?: number
          avg_deviation_minutes?: number | null
          completed_count?: number
          completion_rate?: number | null
          created_at?: string
          date?: string
          focus_score?: number | null
          id?: string
          planned_count?: number
          planned_minutes?: number
          skipped_count?: number
          unplanned_count?: number
          updated_at?: string
          user_id?: string
          within_tolerance_count?: number
        }
        Relationships: []
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
      estimation_history: {
        Row: {
          actual_minutes: number | null
          category: string | null
          created_at: string | null
          deviation_minutes: number | null
          deviation_percent: number | null
          estimated_minutes: number
          id: string
          plan_item_id: string | null
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          category?: string | null
          created_at?: string | null
          deviation_minutes?: number | null
          deviation_percent?: number | null
          estimated_minutes: number
          id?: string
          plan_item_id?: string | null
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          category?: string | null
          created_at?: string | null
          deviation_minutes?: number | null
          deviation_percent?: number | null
          estimated_minutes?: number
          id?: string
          plan_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimation_history_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      estimation_stats: {
        Row: {
          avg_deviation_percent: number | null
          calibration_score: number | null
          category: string
          id: string
          last_updated: string | null
          total_actual_minutes: number | null
          total_estimated_minutes: number | null
          total_tasks: number | null
          user_id: string
        }
        Insert: {
          avg_deviation_percent?: number | null
          calibration_score?: number | null
          category: string
          id?: string
          last_updated?: string | null
          total_actual_minutes?: number | null
          total_estimated_minutes?: number | null
          total_tasks?: number | null
          user_id: string
        }
        Update: {
          avg_deviation_percent?: number | null
          calibration_score?: number | null
          category?: string
          id?: string
          last_updated?: string | null
          total_actual_minutes?: number | null
          total_estimated_minutes?: number | null
          total_tasks?: number | null
          user_id?: string
        }
        Relationships: []
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
          carry_over_count: number | null
          created_at: string
          deviation_reason: string | null
          end_at: string
          energy_requirement: string | null
          estimated_duration_minutes: number | null
          frozen_at: string | null
          id: string
          last_carried_at: string | null
          linked_github: Json | null
          location: string | null
          notes: string | null
          original_planned_date: string | null
          priority: string | null
          source: string | null
          start_at: string
          status: string | null
          suggested_duration_minutes: number | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carry_over_count?: number | null
          created_at?: string
          deviation_reason?: string | null
          end_at: string
          energy_requirement?: string | null
          estimated_duration_minutes?: number | null
          frozen_at?: string | null
          id?: string
          last_carried_at?: string | null
          linked_github?: Json | null
          location?: string | null
          notes?: string | null
          original_planned_date?: string | null
          priority?: string | null
          source?: string | null
          start_at: string
          status?: string | null
          suggested_duration_minutes?: number | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carry_over_count?: number | null
          created_at?: string
          deviation_reason?: string | null
          end_at?: string
          energy_requirement?: string | null
          estimated_duration_minutes?: number | null
          frozen_at?: string | null
          id?: string
          last_carried_at?: string | null
          linked_github?: Json | null
          location?: string | null
          notes?: string | null
          original_planned_date?: string | null
          priority?: string | null
          source?: string | null
          start_at?: string
          status?: string | null
          suggested_duration_minutes?: number | null
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
      weekly_retrospectives: {
        Row: {
          auto_suggestions: Json | null
          carried_over_count: number | null
          category_distribution: Json | null
          completion_rate: number | null
          created_at: string | null
          day_performance: Json | null
          deep_work_ratio: number | null
          estimation_accuracy: number | null
          focus_achievement: Json | null
          id: string
          next_week_changes: string[] | null
          plan_volatility_score: number | null
          selected_action: string | null
          top_deviation_reasons: Json | null
          total_carry_over_minutes: number | null
          updated_at: string | null
          user_id: string
          week_start: string
          what_was_hard: string[] | null
          what_worked: string[] | null
          zombie_tasks: string[] | null
        }
        Insert: {
          auto_suggestions?: Json | null
          carried_over_count?: number | null
          category_distribution?: Json | null
          completion_rate?: number | null
          created_at?: string | null
          day_performance?: Json | null
          deep_work_ratio?: number | null
          estimation_accuracy?: number | null
          focus_achievement?: Json | null
          id?: string
          next_week_changes?: string[] | null
          plan_volatility_score?: number | null
          selected_action?: string | null
          top_deviation_reasons?: Json | null
          total_carry_over_minutes?: number | null
          updated_at?: string | null
          user_id: string
          week_start: string
          what_was_hard?: string[] | null
          what_worked?: string[] | null
          zombie_tasks?: string[] | null
        }
        Update: {
          auto_suggestions?: Json | null
          carried_over_count?: number | null
          category_distribution?: Json | null
          completion_rate?: number | null
          created_at?: string | null
          day_performance?: Json | null
          deep_work_ratio?: number | null
          estimation_accuracy?: number | null
          focus_achievement?: Json | null
          id?: string
          next_week_changes?: string[] | null
          plan_volatility_score?: number | null
          selected_action?: string | null
          top_deviation_reasons?: Json | null
          total_carry_over_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          week_start?: string
          what_was_hard?: string[] | null
          what_worked?: string[] | null
          zombie_tasks?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_retrospectives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
