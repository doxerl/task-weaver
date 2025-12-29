-- Kategori bazlı tahmin istatistikleri
CREATE TABLE public.estimation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  total_estimated_minutes INTEGER DEFAULT 0,
  total_actual_minutes INTEGER DEFAULT 0,
  avg_deviation_percent DECIMAL(5,2),
  calibration_score INTEGER CHECK (calibration_score BETWEEN 0 AND 100),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Her görev için tahmin geçmişi
CREATE TABLE public.estimation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_item_id UUID REFERENCES public.plan_items(id) ON DELETE CASCADE,
  category TEXT,
  estimated_minutes INTEGER NOT NULL,
  actual_minutes INTEGER,
  deviation_minutes INTEGER,
  deviation_percent DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- plan_items tablosuna yeni kolonlar
ALTER TABLE public.plan_items 
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS suggested_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS deviation_reason TEXT,
  ADD COLUMN IF NOT EXISTS energy_requirement TEXT CHECK (energy_requirement IN ('high', 'medium', 'low'));

-- RLS Policies for estimation_stats
ALTER TABLE public.estimation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estimation_stats" 
  ON public.estimation_stats FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own estimation_stats" 
  ON public.estimation_stats FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own estimation_stats" 
  ON public.estimation_stats FOR UPDATE 
  USING (auth.uid() = user_id);

-- RLS Policies for estimation_history
ALTER TABLE public.estimation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estimation_history" 
  ON public.estimation_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own estimation_history" 
  ON public.estimation_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_estimation_stats_user_category ON public.estimation_stats(user_id, category);
CREATE INDEX idx_estimation_history_user_category ON public.estimation_history(user_id, category);
CREATE INDEX idx_estimation_history_plan_item ON public.estimation_history(plan_item_id);