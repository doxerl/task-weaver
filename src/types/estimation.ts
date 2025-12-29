export interface EstimationStats {
  id: string;
  user_id: string;
  category: string;
  total_tasks: number;
  total_estimated_minutes: number;
  total_actual_minutes: number;
  avg_deviation_percent: number | null;
  calibration_score: number | null;
  last_updated: string;
}

export interface EstimationHistory {
  id: string;
  user_id: string;
  plan_item_id: string | null;
  category: string | null;
  estimated_minutes: number;
  actual_minutes: number | null;
  deviation_minutes: number | null;
  deviation_percent: number | null;
  created_at: string;
}

export interface DurationSuggestion {
  suggested_minutes: number | null;
  personal_bias_percent: number | null;
  confidence: 'low' | 'medium' | 'high';
  sample_size: number;
  message: string | null;
  category_stats: {
    total_tasks: number;
    avg_estimated: number;
    avg_actual: number;
  } | null;
}
