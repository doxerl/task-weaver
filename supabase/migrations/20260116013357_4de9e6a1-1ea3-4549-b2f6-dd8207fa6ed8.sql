-- Analiz geçmişi tablosu (tarihsel karşılaştırma için)
CREATE TABLE public.scenario_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_a_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE,
  scenario_b_id UUID REFERENCES public.simulation_scenarios(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('scenario_comparison', 'investor_pitch')),
  
  -- Analiz sonuçları
  insights JSONB,
  recommendations JSONB,
  quarterly_analysis JSONB,
  investor_analysis JSONB,
  deal_config JSONB,
  
  -- Senaryo snapshot (analiz anındaki durum - değişiklik algılama için)
  scenario_a_data_hash TEXT,
  scenario_b_data_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.scenario_analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" 
  ON public.scenario_analysis_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" 
  ON public.scenario_analysis_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" 
  ON public.scenario_analysis_history 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for fast queries
CREATE INDEX idx_analysis_history_user_scenarios 
  ON public.scenario_analysis_history(user_id, scenario_a_id, scenario_b_id, analysis_type, created_at DESC);

-- scenario_ai_analyses tablosuna hash kolonları ekle (mevcut analiz için değişiklik algılama)
ALTER TABLE public.scenario_ai_analyses 
  ADD COLUMN IF NOT EXISTS scenario_a_data_hash TEXT,
  ADD COLUMN IF NOT EXISTS scenario_b_data_hash TEXT;