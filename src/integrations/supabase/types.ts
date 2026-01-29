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
          calculated_vat_payable: number | null
          cash_on_hand: number | null
          created_at: string | null
          deferred_tax_liabilities: number | null
          depreciation_method: string | null
          equipment_purchase_date: string | null
          equipment_useful_life_years: number | null
          equipment_value: number | null
          fiscal_year_start: number | null
          fixtures_purchase_date: string | null
          fixtures_useful_life_years: number | null
          fixtures_value: number | null
          id: string
          inventory_value: number | null
          legal_reserves: number | null
          notes: string | null
          opening_bank_balance: number | null
          opening_cash_on_hand: number | null
          other_vat: number | null
          paid_capital: number | null
          partner_payables: number | null
          partner_receivables_capital: number | null
          personnel_payables: number | null
          retained_earnings: number | null
          social_security_payables: number | null
          tax_payables: number | null
          tax_provision: number | null
          trade_payables: number | null
          trade_receivables: number | null
          unpaid_capital: number | null
          updated_at: string | null
          user_id: string
          vehicles_purchase_date: string | null
          vehicles_useful_life_years: number | null
          vehicles_value: number | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          bank_loans?: number | null
          calculated_vat_payable?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          deferred_tax_liabilities?: number | null
          depreciation_method?: string | null
          equipment_purchase_date?: string | null
          equipment_useful_life_years?: number | null
          equipment_value?: number | null
          fiscal_year_start?: number | null
          fixtures_purchase_date?: string | null
          fixtures_useful_life_years?: number | null
          fixtures_value?: number | null
          id?: string
          inventory_value?: number | null
          legal_reserves?: number | null
          notes?: string | null
          opening_bank_balance?: number | null
          opening_cash_on_hand?: number | null
          other_vat?: number | null
          paid_capital?: number | null
          partner_payables?: number | null
          partner_receivables_capital?: number | null
          personnel_payables?: number | null
          retained_earnings?: number | null
          social_security_payables?: number | null
          tax_payables?: number | null
          tax_provision?: number | null
          trade_payables?: number | null
          trade_receivables?: number | null
          unpaid_capital?: number | null
          updated_at?: string | null
          user_id: string
          vehicles_purchase_date?: string | null
          vehicles_useful_life_years?: number | null
          vehicles_value?: number | null
        }
        Update: {
          accumulated_depreciation?: number | null
          bank_loans?: number | null
          calculated_vat_payable?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          deferred_tax_liabilities?: number | null
          depreciation_method?: string | null
          equipment_purchase_date?: string | null
          equipment_useful_life_years?: number | null
          equipment_value?: number | null
          fiscal_year_start?: number | null
          fixtures_purchase_date?: string | null
          fixtures_useful_life_years?: number | null
          fixtures_value?: number | null
          id?: string
          inventory_value?: number | null
          legal_reserves?: number | null
          notes?: string | null
          opening_bank_balance?: number | null
          opening_cash_on_hand?: number | null
          other_vat?: number | null
          paid_capital?: number | null
          partner_payables?: number | null
          partner_receivables_capital?: number | null
          personnel_payables?: number | null
          retained_earnings?: number | null
          social_security_payables?: number | null
          tax_payables?: number | null
          tax_provision?: number | null
          trade_payables?: number | null
          trade_receivables?: number | null
          unpaid_capital?: number | null
          updated_at?: string | null
          user_id?: string
          vehicles_purchase_date?: string | null
          vehicles_useful_life_years?: number | null
          vehicles_value?: number | null
        }
        Relationships: []
      }
      fixed_expense_definitions: {
        Row: {
          category_id: string | null
          created_at: string | null
          end_date: string | null
          expense_name: string
          expense_type: string
          id: string
          installment_months: number | null
          installments_paid: number | null
          is_active: boolean | null
          monthly_amount: number | null
          notes: string | null
          start_date: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          end_date?: string | null
          expense_name: string
          expense_type?: string
          id?: string
          installment_months?: number | null
          installments_paid?: number | null
          is_active?: boolean | null
          monthly_amount?: number | null
          notes?: string | null
          start_date?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          end_date?: string | null
          expense_name?: string
          expense_type?: string
          id?: string
          installment_months?: number | null
          installments_paid?: number | null
          is_active?: boolean | null
          monthly_amount?: number | null
          notes?: string | null
          start_date?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expense_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
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
      monthly_exchange_rates: {
        Row: {
          created_at: string | null
          currency_pair: string
          id: string
          month: number
          rate: number
          source: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          currency_pair?: string
          id?: string
          month: number
          rate: number
          source?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          currency_pair?: string
          id?: string
          month?: number
          rate?: number
          source?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      official_trial_balances: {
        Row: {
          accounts: Json
          approved_at: string | null
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_approved: boolean | null
          month: number | null
          notes: string | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          accounts?: Json
          approved_at?: string | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_approved?: boolean | null
          month?: number | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          accounts?: Json
          approved_at?: string | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_approved?: boolean | null
          month?: number | null
          notes?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      payroll_accruals: {
        Row: {
          created_at: string | null
          employee_sgk_payable: number | null
          employer_contribution: number | null
          employer_sgk_payable: number | null
          gross_salary: number | null
          id: string
          income_tax_payable: number | null
          is_net_paid: boolean | null
          is_sgk_paid: boolean | null
          is_tax_paid: boolean | null
          month: number
          net_paid_date: string | null
          net_payable: number | null
          notes: string | null
          sgk_paid_date: string | null
          stamp_tax_payable: number | null
          tax_paid_date: string | null
          unemployment_payable: number | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_sgk_payable?: number | null
          employer_contribution?: number | null
          employer_sgk_payable?: number | null
          gross_salary?: number | null
          id?: string
          income_tax_payable?: number | null
          is_net_paid?: boolean | null
          is_sgk_paid?: boolean | null
          is_tax_paid?: boolean | null
          month: number
          net_paid_date?: string | null
          net_payable?: number | null
          notes?: string | null
          sgk_paid_date?: string | null
          stamp_tax_payable?: number | null
          tax_paid_date?: string | null
          unemployment_payable?: number | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          employee_sgk_payable?: number | null
          employer_contribution?: number | null
          employer_sgk_payable?: number | null
          gross_salary?: number | null
          id?: string
          income_tax_payable?: number | null
          is_net_paid?: boolean | null
          is_sgk_paid?: boolean | null
          is_tax_paid?: boolean | null
          month?: number
          net_paid_date?: string | null
          net_payable?: number | null
          notes?: string | null
          sgk_paid_date?: string | null
          stamp_tax_payable?: number | null
          tax_paid_date?: string | null
          unemployment_payable?: number | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
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
          amount_try: number | null
          buyer_address: string | null
          buyer_name: string | null
          buyer_tax_no: string | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          document_type: string | null
          exchange_rate_used: number | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_foreign_invoice: boolean | null
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
          original_amount: number | null
          original_currency: string | null
          processing_status: string | null
          receipt_date: string | null
          receipt_no: string | null
          receipt_subtype: string | null
          seller_address: string | null
          seller_name: string | null
          seller_tax_no: string | null
          stamp_tax_amount: number | null
          subtotal: number | null
          subtotal_try: number | null
          tax_amount: number | null
          thumbnail_url: string | null
          total_amount: number | null
          user_id: string | null
          vat_amount: number | null
          vat_amount_try: number | null
          vat_rate: number | null
          vendor_name: string | null
          vendor_tax_no: string | null
          withholding_tax_amount: number | null
          withholding_tax_rate: number | null
          year: number | null
        }
        Insert: {
          ai_suggested_category_id?: string | null
          amount_try?: number | null
          buyer_address?: string | null
          buyer_name?: string | null
          buyer_tax_no?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          document_type?: string | null
          exchange_rate_used?: number | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_foreign_invoice?: boolean | null
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
          original_amount?: number | null
          original_currency?: string | null
          processing_status?: string | null
          receipt_date?: string | null
          receipt_no?: string | null
          receipt_subtype?: string | null
          seller_address?: string | null
          seller_name?: string | null
          seller_tax_no?: string | null
          stamp_tax_amount?: number | null
          subtotal?: number | null
          subtotal_try?: number | null
          tax_amount?: number | null
          thumbnail_url?: string | null
          total_amount?: number | null
          user_id?: string | null
          vat_amount?: number | null
          vat_amount_try?: number | null
          vat_rate?: number | null
          vendor_name?: string | null
          vendor_tax_no?: string | null
          withholding_tax_amount?: number | null
          withholding_tax_rate?: number | null
          year?: number | null
        }
        Update: {
          ai_suggested_category_id?: string | null
          amount_try?: number | null
          buyer_address?: string | null
          buyer_name?: string | null
          buyer_tax_no?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          document_type?: string | null
          exchange_rate_used?: number | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_foreign_invoice?: boolean | null
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
          original_amount?: number | null
          original_currency?: string | null
          processing_status?: string | null
          receipt_date?: string | null
          receipt_no?: string | null
          receipt_subtype?: string | null
          seller_address?: string | null
          seller_name?: string | null
          seller_tax_no?: string | null
          stamp_tax_amount?: number | null
          subtotal?: number | null
          subtotal_try?: number | null
          tax_amount?: number | null
          thumbnail_url?: string | null
          total_amount?: number | null
          user_id?: string | null
          vat_amount?: number | null
          vat_amount_try?: number | null
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
      scenario_ai_analyses: {
        Row: {
          analysis_type: string
          created_at: string | null
          deal_config: Json | null
          deal_config_snapshot: Json | null
          deal_score: number | null
          edited_expense_projection: Json | null
          edited_revenue_projection: Json | null
          focus_project_plan: string | null
          focus_projects: string[] | null
          id: string
          insights: Json | null
          investment_allocation: Json | null
          investor_analysis: Json | null
          next_year_projection: Json | null
          pitch_deck: Json | null
          projection_user_edited: boolean | null
          quarterly_analysis: Json | null
          recommendations: Json | null
          scenario_a_data_hash: string | null
          scenario_a_id: string | null
          scenario_b_data_hash: string | null
          scenario_b_id: string | null
          updated_at: string | null
          user_id: string
          valuation_verdict: string | null
        }
        Insert: {
          analysis_type: string
          created_at?: string | null
          deal_config?: Json | null
          deal_config_snapshot?: Json | null
          deal_score?: number | null
          edited_expense_projection?: Json | null
          edited_revenue_projection?: Json | null
          focus_project_plan?: string | null
          focus_projects?: string[] | null
          id?: string
          insights?: Json | null
          investment_allocation?: Json | null
          investor_analysis?: Json | null
          next_year_projection?: Json | null
          pitch_deck?: Json | null
          projection_user_edited?: boolean | null
          quarterly_analysis?: Json | null
          recommendations?: Json | null
          scenario_a_data_hash?: string | null
          scenario_a_id?: string | null
          scenario_b_data_hash?: string | null
          scenario_b_id?: string | null
          updated_at?: string | null
          user_id: string
          valuation_verdict?: string | null
        }
        Update: {
          analysis_type?: string
          created_at?: string | null
          deal_config?: Json | null
          deal_config_snapshot?: Json | null
          deal_score?: number | null
          edited_expense_projection?: Json | null
          edited_revenue_projection?: Json | null
          focus_project_plan?: string | null
          focus_projects?: string[] | null
          id?: string
          insights?: Json | null
          investment_allocation?: Json | null
          investor_analysis?: Json | null
          next_year_projection?: Json | null
          pitch_deck?: Json | null
          projection_user_edited?: boolean | null
          quarterly_analysis?: Json | null
          recommendations?: Json | null
          scenario_a_data_hash?: string | null
          scenario_a_id?: string | null
          scenario_b_data_hash?: string | null
          scenario_b_id?: string | null
          updated_at?: string | null
          user_id?: string
          valuation_verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenario_ai_analyses_scenario_a_id_fkey"
            columns: ["scenario_a_id"]
            isOneToOne: false
            referencedRelation: "simulation_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_ai_analyses_scenario_b_id_fkey"
            columns: ["scenario_b_id"]
            isOneToOne: false
            referencedRelation: "simulation_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_analysis_history: {
        Row: {
          analysis_type: string
          created_at: string | null
          deal_config: Json | null
          id: string
          insights: Json | null
          investor_analysis: Json | null
          quarterly_analysis: Json | null
          recommendations: Json | null
          scenario_a_data_hash: string | null
          scenario_a_id: string | null
          scenario_b_data_hash: string | null
          scenario_b_id: string | null
          user_id: string
        }
        Insert: {
          analysis_type: string
          created_at?: string | null
          deal_config?: Json | null
          id?: string
          insights?: Json | null
          investor_analysis?: Json | null
          quarterly_analysis?: Json | null
          recommendations?: Json | null
          scenario_a_data_hash?: string | null
          scenario_a_id?: string | null
          scenario_b_data_hash?: string | null
          scenario_b_id?: string | null
          user_id: string
        }
        Update: {
          analysis_type?: string
          created_at?: string | null
          deal_config?: Json | null
          id?: string
          insights?: Json | null
          investor_analysis?: Json | null
          quarterly_analysis?: Json | null
          recommendations?: Json | null
          scenario_a_data_hash?: string | null
          scenario_a_id?: string | null
          scenario_b_data_hash?: string | null
          scenario_b_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_analysis_history_scenario_a_id_fkey"
            columns: ["scenario_a_id"]
            isOneToOne: false
            referencedRelation: "simulation_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_analysis_history_scenario_b_id_fkey"
            columns: ["scenario_b_id"]
            isOneToOne: false
            referencedRelation: "simulation_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_scenarios: {
        Row: {
          assumed_exchange_rate: number | null
          base_year: number | null
          created_at: string | null
          description: string | null
          expenses: Json | null
          id: string
          investments: Json | null
          is_default: boolean | null
          name: string
          notes: string | null
          revenues: Json | null
          scenario_type: string | null
          target_year: number | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          assumed_exchange_rate?: number | null
          base_year?: number | null
          created_at?: string | null
          description?: string | null
          expenses?: Json | null
          id?: string
          investments?: Json | null
          is_default?: boolean | null
          name: string
          notes?: string | null
          revenues?: Json | null
          scenario_type?: string | null
          target_year?: number | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          assumed_exchange_rate?: number | null
          base_year?: number | null
          created_at?: string | null
          description?: string | null
          expenses?: Json | null
          id?: string
          investments?: Json | null
          is_default?: boolean | null
          name?: string
          notes?: string | null
          revenues?: Json | null
          scenario_type?: string | null
          target_year?: number | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          account_code: string | null
          account_subcode: string | null
          affects_partner_account: boolean | null
          code: string
          color: string | null
          cost_center: string | null
          created_at: string | null
          depreciation_rate: number | null
          depth: number | null
          expense_behavior: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_excluded: boolean | null
          is_financing: boolean | null
          is_kkeg: boolean | null
          is_system: boolean | null
          keywords: string[] | null
          match_priority: number | null
          name: string
          parent_category_id: string | null
          sort_order: number | null
          type: string
          useful_life_years: number | null
          user_id: string | null
          vendor_patterns: string[] | null
          vuk_code: string | null
        }
        Insert: {
          account_code?: string | null
          account_subcode?: string | null
          affects_partner_account?: boolean | null
          code: string
          color?: string | null
          cost_center?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          depth?: number | null
          expense_behavior?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_excluded?: boolean | null
          is_financing?: boolean | null
          is_kkeg?: boolean | null
          is_system?: boolean | null
          keywords?: string[] | null
          match_priority?: number | null
          name: string
          parent_category_id?: string | null
          sort_order?: number | null
          type: string
          useful_life_years?: number | null
          user_id?: string | null
          vendor_patterns?: string[] | null
          vuk_code?: string | null
        }
        Update: {
          account_code?: string | null
          account_subcode?: string | null
          affects_partner_account?: boolean | null
          code?: string
          color?: string | null
          cost_center?: string | null
          created_at?: string | null
          depreciation_rate?: number | null
          depth?: number | null
          expense_behavior?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_excluded?: boolean | null
          is_financing?: boolean | null
          is_kkeg?: boolean | null
          is_system?: boolean | null
          keywords?: string[] | null
          match_priority?: number | null
          name?: string
          parent_category_id?: string | null
          sort_order?: number | null
          type?: string
          useful_life_years?: number | null
          user_id?: string | null
          vendor_patterns?: string[] | null
          vuk_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
        ]
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
      yearly_balance_sheets: {
        Row: {
          accumulated_depreciation: number | null
          bank_balance: number | null
          bank_loans: number | null
          cash_on_hand: number | null
          created_at: string | null
          current_loss: number | null
          current_profit: number | null
          deferred_tax_liabilities: number | null
          equipment: number | null
          file_name: string | null
          file_url: string | null
          fixtures: number | null
          id: string
          inventory: number | null
          is_locked: boolean | null
          legal_reserves: number | null
          notes: string | null
          other_vat: number | null
          overdue_tax_payables: number | null
          paid_capital: number | null
          partner_payables: number | null
          partner_receivables: number | null
          personnel_payables: number | null
          raw_accounts: Json | null
          retained_earnings: number | null
          short_term_loan_debt: number | null
          social_security_payables: number | null
          source: string | null
          tax_payables: number | null
          tax_provision: number | null
          total_assets: number | null
          total_liabilities: number | null
          trade_payables: number | null
          trade_receivables: number | null
          unpaid_capital: number | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
          vat_payable: number | null
          vat_receivable: number | null
          vehicles: number | null
          year: number
        }
        Insert: {
          accumulated_depreciation?: number | null
          bank_balance?: number | null
          bank_loans?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          current_loss?: number | null
          current_profit?: number | null
          deferred_tax_liabilities?: number | null
          equipment?: number | null
          file_name?: string | null
          file_url?: string | null
          fixtures?: number | null
          id?: string
          inventory?: number | null
          is_locked?: boolean | null
          legal_reserves?: number | null
          notes?: string | null
          other_vat?: number | null
          overdue_tax_payables?: number | null
          paid_capital?: number | null
          partner_payables?: number | null
          partner_receivables?: number | null
          personnel_payables?: number | null
          raw_accounts?: Json | null
          retained_earnings?: number | null
          short_term_loan_debt?: number | null
          social_security_payables?: number | null
          source?: string | null
          tax_payables?: number | null
          tax_provision?: number | null
          total_assets?: number | null
          total_liabilities?: number | null
          trade_payables?: number | null
          trade_receivables?: number | null
          unpaid_capital?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
          vat_payable?: number | null
          vat_receivable?: number | null
          vehicles?: number | null
          year: number
        }
        Update: {
          accumulated_depreciation?: number | null
          bank_balance?: number | null
          bank_loans?: number | null
          cash_on_hand?: number | null
          created_at?: string | null
          current_loss?: number | null
          current_profit?: number | null
          deferred_tax_liabilities?: number | null
          equipment?: number | null
          file_name?: string | null
          file_url?: string | null
          fixtures?: number | null
          id?: string
          inventory?: number | null
          is_locked?: boolean | null
          legal_reserves?: number | null
          notes?: string | null
          other_vat?: number | null
          overdue_tax_payables?: number | null
          paid_capital?: number | null
          partner_payables?: number | null
          partner_receivables?: number | null
          personnel_payables?: number | null
          raw_accounts?: Json | null
          retained_earnings?: number | null
          short_term_loan_debt?: number | null
          social_security_payables?: number | null
          source?: string | null
          tax_payables?: number | null
          tax_provision?: number | null
          total_assets?: number | null
          total_liabilities?: number | null
          trade_payables?: number | null
          trade_receivables?: number | null
          unpaid_capital?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
          vat_payable?: number | null
          vat_receivable?: number | null
          vehicles?: number | null
          year?: number
        }
        Relationships: []
      }
      yearly_income_statements: {
        Row: {
          commission_expenses: number | null
          commission_income: number | null
          corporate_tax: number | null
          cost_of_goods_sold: number | null
          cost_of_merchandise_sold: number | null
          cost_of_services_sold: number | null
          created_at: string | null
          deferred_tax_expense: number | null
          dividend_income: number | null
          file_name: string | null
          file_url: string | null
          fx_gain: number | null
          fx_loss: number | null
          general_admin_expenses: number | null
          gross_profit: number | null
          gross_sales_domestic: number | null
          gross_sales_export: number | null
          gross_sales_other: number | null
          id: string
          interest_income: number | null
          is_locked: boolean | null
          long_term_finance_exp: number | null
          marketing_expenses: number | null
          net_profit: number | null
          net_sales: number | null
          notes: string | null
          operating_profit: number | null
          other_expenses: number | null
          other_extraordinary_exp: number | null
          other_extraordinary_income: number | null
          other_income: number | null
          prior_period_expenses: number | null
          prior_period_income: number | null
          provisions_expense: number | null
          raw_accounts: Json | null
          rd_expenses: number | null
          revaluation_gain: number | null
          revaluation_loss: number | null
          sales_discounts: number | null
          sales_returns: number | null
          short_term_finance_exp: number | null
          source: string | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          commission_expenses?: number | null
          commission_income?: number | null
          corporate_tax?: number | null
          cost_of_goods_sold?: number | null
          cost_of_merchandise_sold?: number | null
          cost_of_services_sold?: number | null
          created_at?: string | null
          deferred_tax_expense?: number | null
          dividend_income?: number | null
          file_name?: string | null
          file_url?: string | null
          fx_gain?: number | null
          fx_loss?: number | null
          general_admin_expenses?: number | null
          gross_profit?: number | null
          gross_sales_domestic?: number | null
          gross_sales_export?: number | null
          gross_sales_other?: number | null
          id?: string
          interest_income?: number | null
          is_locked?: boolean | null
          long_term_finance_exp?: number | null
          marketing_expenses?: number | null
          net_profit?: number | null
          net_sales?: number | null
          notes?: string | null
          operating_profit?: number | null
          other_expenses?: number | null
          other_extraordinary_exp?: number | null
          other_extraordinary_income?: number | null
          other_income?: number | null
          prior_period_expenses?: number | null
          prior_period_income?: number | null
          provisions_expense?: number | null
          raw_accounts?: Json | null
          rd_expenses?: number | null
          revaluation_gain?: number | null
          revaluation_loss?: number | null
          sales_discounts?: number | null
          sales_returns?: number | null
          short_term_finance_exp?: number | null
          source?: string | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          commission_expenses?: number | null
          commission_income?: number | null
          corporate_tax?: number | null
          cost_of_goods_sold?: number | null
          cost_of_merchandise_sold?: number | null
          cost_of_services_sold?: number | null
          created_at?: string | null
          deferred_tax_expense?: number | null
          dividend_income?: number | null
          file_name?: string | null
          file_url?: string | null
          fx_gain?: number | null
          fx_loss?: number | null
          general_admin_expenses?: number | null
          gross_profit?: number | null
          gross_sales_domestic?: number | null
          gross_sales_export?: number | null
          gross_sales_other?: number | null
          id?: string
          interest_income?: number | null
          is_locked?: boolean | null
          long_term_finance_exp?: number | null
          marketing_expenses?: number | null
          net_profit?: number | null
          net_sales?: number | null
          notes?: string | null
          operating_profit?: number | null
          other_expenses?: number | null
          other_extraordinary_exp?: number | null
          other_extraordinary_income?: number | null
          other_income?: number | null
          prior_period_expenses?: number | null
          prior_period_income?: number | null
          provisions_expense?: number | null
          raw_accounts?: Json | null
          rd_expenses?: number | null
          revaluation_gain?: number | null
          revaluation_loss?: number | null
          sales_discounts?: number | null
          sales_returns?: number | null
          short_term_finance_exp?: number | null
          source?: string | null
          updated_at?: string | null
          user_id?: string
          year?: number
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
