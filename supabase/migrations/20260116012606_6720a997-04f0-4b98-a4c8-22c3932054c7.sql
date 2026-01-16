-- Create table for storing AI analysis results
CREATE TABLE public.scenario_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_a_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE,
  scenario_b_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('scenario_comparison', 'investor_pitch')),
  
  -- Scenario comparison analysis results
  insights JSONB,
  recommendations JSONB,
  quarterly_analysis JSONB,
  
  -- Investor pitch analysis results
  investor_analysis JSONB,
  deal_config JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one record per scenario pair per analysis type per user
  UNIQUE(user_id, scenario_a_id, scenario_b_id, analysis_type)
);

-- Enable RLS
ALTER TABLE public.scenario_ai_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own analyses"
  ON public.scenario_ai_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON public.scenario_ai_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.scenario_ai_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.scenario_ai_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_scenario_ai_analyses_updated_at
  BEFORE UPDATE ON public.scenario_ai_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();