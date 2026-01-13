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
      balance_sheet_items: {
        Row: {
          amount: number | null
          as_of_date: string
          category: string
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          subcategory: string
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          amount?: number | null
          as_of_date: string
          category: string
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          subcategory: string
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          amount?: number | null
          as_of_date?: string
          category?: string
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          subcategory?: string
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      bank_import_sessions: {
        Row: {
          ai_cost_usd: number | null
          ai_tokens_used: number | null
          approved_at: string | null
          categorized_count: number | null
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          detected_bank: string | null
          file_hash: string | null
          file_id: string | null
          file_name: string
          id: string
          low_confidence_count: number | null
          status: string
          total_expense: number | null
          total_income: number | null
          total_transactions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_cost_usd?: number | null
          ai_tokens_used?: number | null
          approved_at?: string | null
          categorized_count?: number | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          detected_bank?: string | null
          file_hash?: string | null
          file_id?: string | null
          file_name: string
          id?: string
          low_confidence_count?: number | null
          status?: string
          total_expense?: number | null
          total_income?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_cost_usd?: number | null
          ai_tokens_used?: number | null
          approved_at?: string | null
          categorized_count?: number | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          detected_bank?: string | null
          file_hash?: string | null
          file_id?: string | null
          file_name?: string
          id?: string
          low_confidence_count?: number | null
          status?: string
          total_expense?: number | null
          total_income?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_import_sessions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_bank_files"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_import_transactions: {
        Row: {
          ai_affects_pnl: boolean | null
          ai_balance_impact: string | null
          ai_category_code: string | null
          ai_category_type: string | null
          ai_confidence: number | null
          ai_counterparty: string | null
          ai_reasoning: string | null
          amount: number
          balance: number | null
          channel: string | null
          counterparty: string | null
          created_at: string | null
          description: string
          final_category_id: string | null
          id: string
          needs_review: boolean | null
          original_amount: string | null
          original_date: string | null
          reference: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          row_number: number
          session_id: string
          transaction_date: string
          transaction_type: string | null
          updated_at: string | null
          user_category_id: string | null
          user_id: string
          user_modified: boolean | null
          user_notes: string | null
        }
        Insert: {
          ai_affects_pnl?: boolean | null
          ai_balance_impact?: string | null
          ai_category_code?: string | null
          ai_category_type?: string | null
          ai_confidence?: number | null
          ai_counterparty?: string | null
          ai_reasoning?: string | null
          amount: number
          balance?: number | null
          channel?: string | null
          counterparty?: string | null
          created_at?: string | null
          description: string
          final_category_id?: string | null
          id?: string
          needs_review?: boolean | null
          original_amount?: string | null
          original_date?: string | null
          reference?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          row_number: number
          session_id: string
          transaction_date: string
          transaction_type?: string | null
          updated_at?: string | null
          user_category_id?: string | null
          user_id: string
          user_modified?: boolean | null
          user_notes?: string | null
        }
        Update: {
          ai_affects_pnl?: boolean | null
          ai_balance_impact?: string | null
          ai_category_code?: string | null
          ai_category_type?: string | null
          ai_confidence?: number | null
          ai_counterparty?: string | null
          ai_reasoning?: string | null
          amount?: number
          balance?: number | null
          channel?: string | null
          counterparty?: string | null
          created_at?: string | null
          description?: string
          final_category_id?: string | null
          id?: string
          needs_review?: boolean | null
          original_amount?: string | null
          original_date?: string | null
          reference?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          row_number?: number
          session_id?: string
          transaction_date?: string
          transaction_type?: string | null
          updated_at?: string | null
          user_category_id?: string | null
          user_id?: string
          user_modified?: boolean | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_import_transactions_final_category_id_fkey"
            columns: ["final_category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_import_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bank_import_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_import_transactions_user_category_id_fkey"
            columns: ["user_category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          ai_confidence: number | null
          ai_suggested_category_id: string | null
          amount: number | null
          balance: number | null
          category_id: string | null
          counterparty: string | null
          created_at: string | null
          description: string | null
          file_id: string | null
          id: string
          is_commercial: boolean | null
          is_excluded: boolean | null
          is_income: boolean | null
          is_manually_categorized: boolean | null
          net_amount: number | null
          notes: string | null
          raw_amount: string | null
          raw_date: string | null
          raw_description: string | null
          reference_no: string | null
          row_number: number | null
          transaction_date: string | null
          user_id: string | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_suggested_category_id?: string | null
          amount?: number | null
          balance?: number | null
          category_id?: string | null
          counterparty?: string | null
          created_at?: string | null
          description?: string | null
          file_id?: string | null
          id?: string
          is_commercial?: boolean | null
          is_excluded?: boolean | null
          is_income?: boolean | null
          is_manually_categorized?: boolean | null
          net_amount?: number | null
          notes?: string | null
          raw_amount?: string | null
          raw_date?: string | null
          raw_description?: string | null
          reference_no?: string | null
          row_number?: number | null
          transaction_date?: string | null
          user_id?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          ai_confidence?: number | null
          ai_suggested_category_id?: string | null
          amount?: number | null
          balance?: number | null
          category_id?: string | null
          counterparty?: string | null
          created_at?: string | null
          description?: string | null
          file_id?: string | null
          id?: string
          is_commercial?: boolean | null
          is_excluded?: boolean | null
          is_income?: boolean | null
          is_manually_categorized?: boolean | null
          net_amount?: number | null
          notes?: string | null
          raw_amount?: string | null
          raw_date?: string | null
          raw_description?: string | null
          reference_no?: string | null
          row_number?: number | null
          transaction_date?: string | null
          user_id?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_ai_suggested_category_id_fkey"
            columns: ["ai_suggested_category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_bank_files"
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
      financial_reports: {
        Row: {
          created_at: string | null
          id: string
          net_partner_balance: number | null
          operating_profit: number | null
          partner_deposits: number | null
          partner_withdrawals: number | null
          pdf_url: string | null
          profit_margin: number | null
          report_data: Json | null
          report_month: number | null
          report_name: string | null
          report_year: number | null
          total_expenses: number | null
          total_financing_in: number | null
          total_income: number | null
          total_receipt_expenses: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          net_partner_balance?: number | null
          operating_profit?: number | null
          partner_deposits?: number | null
          partner_withdrawals?: number | null
          pdf_url?: string | null
          profit_margin?: number | null
          report_data?: Json | null
          report_month?: number | null
          report_name?: string | null
          report_year?: number | null
          total_expenses?: number | null
          total_financing_in?: number | null
          total_income?: number | null
          total_receipt_expenses?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          net_partner_balance?: number | null
          operating_profit?: number | null
          partner_deposits?: number | null
          partner_withdrawals?: number | null
          pdf_url?: string | null
          profit_margin?: number | null
          report_data?: Json | null
          report_month?: number | null
          report_name?: string | null
          report_year?: number | null
          total_expenses?: number | null
          total_financing_in?: number | null
          total_income?: number | null
          total_receipt_expenses?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_settings: {
        Row: {
          accumulated_depreciation: number | null
          bank_loans: number | null
          cash_on_hand: number | null
          created_at: string | null
          equipment_value: number | null
          fiscal_year_start: number | null
          id: string
          inventory_value: number | null
          notes: string | null
          paid_capital: number | null
          retained_earnings: number | null
          updated_at: string | null
          user_id: string
          vehicles_value: number | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          bank_loans?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          equipment_value?: number | null
          fiscal_year_start?: number | null
          id?: string
          inventory_value?: number | null
          notes?: string | null
          paid_capital?: number | null
          retained_earnings?: number | null
          updated_at?: string | null
          user_id: string
          vehicles_value?: number | null
        }
        Update: {
          accumulated_depreciation?: number | null
          bank_loans?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          equipment_value?: number | null
          fiscal_year_start?: number | null
          id?: string
          inventory_value?: number | null
          notes?: string | null
          paid_capital?: number | null
          retained_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          vehicles_value?: number | null
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
      receipt_transaction_matches: {
        Row: {
          bank_transaction_id: string | null
          created_at: string | null
          id: string
          is_auto_suggested: boolean | null
          is_confirmed: boolean | null
          match_type: string | null
          matched_amount: number
          receipt_id: string | null
          user_id: string
        }
        Insert: {
          bank_transaction_id?: string | null
          created_at?: string | null
          id?: string
          is_auto_suggested?: boolean | null
          is_confirmed?: boolean | null
          match_type?: string | null
          matched_amount: number
          receipt_id?: string | null
          user_id: string
        }
        Update: {
          bank_transaction_id?: string | null
          created_at?: string | null
          id?: string
          is_auto_suggested?: boolean | null
          is_confirmed?: boolean | null
          match_type?: string | null
          matched_amount?: number
          receipt_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_transaction_matches_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_transaction_matches_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          ai_suggested_category_id: string | null
          buyer_address: string | null
          buyer_name: string | null
          buyer_tax_no: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          document_type: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_included_in_report: boolean | null
          is_manually_categorized: boolean | null
          is_verified: boolean | null
          linked_bank_transaction_id: string | null
          match_confidence: number | null
          match_status: string | null
          month: number | null
          notes: string | null
          ocr_confidence: number | null
          ocr_raw_text: string | null
          processing_status: string | null
          receipt_date: string | null
          receipt_no: string | null
          seller_address: string | null
          seller_name: string | null
          seller_tax_no: string | null
          stamp_tax_amount: number | null
          subtotal: number | null
          tax_amount: number | null
          thumbnail_url: string | null
          total_amount: number | null
          user_id: string | null
          vat_amount: number | null
          vat_rate: number | null
          vendor_name: string | null
          vendor_tax_no: string | null
          withholding_tax_amount: number | null
          withholding_tax_rate: number | null
          year: number | null
        }
        Insert: {
          ai_suggested_category_id?: string | null
          buyer_address?: string | null
          buyer_name?: string | null
          buyer_tax_no?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          document_type?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_included_in_report?: boolean | null
          is_manually_categorized?: boolean | null
          is_verified?: boolean | null
          linked_bank_transaction_id?: string | null
          match_confidence?: number | null
          match_status?: string | null
          month?: number | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          processing_status?: string | null
          receipt_date?: string | null
          receipt_no?: string | null
          seller_address?: string | null
          seller_name?: string | null
          seller_tax_no?: string | null
          stamp_tax_amount?: number | null
          subtotal?: number | null
          tax_amount?: number | null
          thumbnail_url?: string | null
          total_amount?: number | null
          user_id?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          vendor_name?: string | null
          vendor_tax_no?: string | null
          withholding_tax_amount?: number | null
          withholding_tax_rate?: number | null
          year?: number | null
        }
        Update: {
          ai_suggested_category_id?: string | null
          buyer_address?: string | null
          buyer_name?: string | null
          buyer_tax_no?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          document_type?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_included_in_report?: boolean | null
          is_manually_categorized?: boolean | null
          is_verified?: boolean | null
          linked_bank_transaction_id?: string | null
          match_confidence?: number | null
          match_status?: string | null
          month?: number | null
          notes?: string | null
          ocr_confidence?: number | null
          ocr_raw_text?: string | null
          processing_status?: string | null
          receipt_date?: string | null
          receipt_no?: string | null
          seller_address?: string | null
          seller_name?: string | null
          seller_tax_no?: string | null
          stamp_tax_amount?: number | null
          subtotal?: number | null
          tax_amount?: number | null
          thumbnail_url?: string | null
          total_amount?: number | null
          user_id?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          vendor_name?: string | null
          vendor_tax_no?: string | null
          withholding_tax_amount?: number | null
          withholding_tax_rate?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_ai_suggested_category_id_fkey"
            columns: ["ai_suggested_category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_linked_bank_transaction_id_fkey"
            columns: ["linked_bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          affects_partner_account: boolean | null
          code: string
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_excluded: boolean | null
          is_financing: boolean | null
          is_system: boolean | null
          keywords: string[] | null
          match_priority: number | null
          name: string
          sort_order: number | null
          type: string
          user_id: string | null
          vendor_patterns: string[] | null
        }
        Insert: {
          affects_partner_account?: boolean | null
          code: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_excluded?: boolean | null
          is_financing?: boolean | null
          is_system?: boolean | null
          keywords?: string[] | null
          match_priority?: number | null
          name: string
          sort_order?: number | null
          type: string
          user_id?: string | null
          vendor_patterns?: string[] | null
        }
        Update: {
          affects_partner_account?: boolean | null
          code?: string
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_excluded?: boolean | null
          is_financing?: boolean | null
          is_system?: boolean | null
          keywords?: string[] | null
          match_priority?: number | null
          name?: string
          sort_order?: number | null
          type?: string
          user_id?: string | null
          vendor_patterns?: string[] | null
        }
        Relationships: []
      }
      uploaded_bank_files: {
        Row: {
          bank_name: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          period_end: string | null
          period_start: string | null
          processing_error: string | null
          processing_status: string | null
          total_transactions: number | null
          user_id: string | null
        }
        Insert: {
          bank_name?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          processing_error?: string | null
          processing_status?: string | null
          total_transactions?: number | null
          user_id?: string | null
        }
        Update: {
          bank_name?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          processing_error?: string | null
          processing_status?: string | null
          total_transactions?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_category_rules: {
        Row: {
          amount_condition: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          hit_count: number | null
          id: string
          is_active: boolean | null
          is_partner_rule: boolean | null
          last_hit_at: string | null
          partner_type: string | null
          pattern: string
          priority: number | null
          rule_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_condition?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          is_partner_rule?: boolean | null
          last_hit_at?: string | null
          partner_type?: string | null
          pattern: string
          priority?: number | null
          rule_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_condition?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          is_partner_rule?: boolean | null
          last_hit_at?: string | null
          partner_type?: string | null
          pattern?: string
          priority?: number | null
          rule_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quick_chips: {
        Row: {
          created_at: string
          default_hour: number | null
          duration: number
          id: string
          label: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_hour?: number | null
          duration?: number
          id?: string
          label: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_hour?: number | null
          duration?: number
          id?: string
          label?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quick_chips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
