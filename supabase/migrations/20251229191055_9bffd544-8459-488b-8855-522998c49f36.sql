-- Önce updated_at trigger fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Weekly Retrospectives tablosu
CREATE TABLE public.weekly_retrospectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  
  -- Manuel girişler (3 soru)
  what_worked TEXT[] DEFAULT '{}',
  what_was_hard TEXT[] DEFAULT '{}',
  next_week_changes TEXT[] DEFAULT '{}',
  
  -- Otomatik hesaplanan metrikler
  completion_rate DECIMAL(5,2),
  estimation_accuracy DECIMAL(5,2),
  plan_volatility_score INTEGER DEFAULT 0,
  deep_work_ratio DECIMAL(5,2),
  
  -- Detaylı analizler
  top_deviation_reasons JSONB DEFAULT '{}',
  category_distribution JSONB DEFAULT '{}',
  focus_achievement JSONB DEFAULT '{}',
  day_performance JSONB DEFAULT '{}',
  
  -- Taşıma analizi
  carried_over_count INTEGER DEFAULT 0,
  zombie_tasks UUID[] DEFAULT '{}',
  total_carry_over_minutes INTEGER DEFAULT 0,
  
  -- Öneriler
  auto_suggestions JSONB DEFAULT '[]',
  selected_action TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, week_start)
);

-- RLS policies
ALTER TABLE public.weekly_retrospectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly_retrospectives" 
  ON public.weekly_retrospectives FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly_retrospectives" 
  ON public.weekly_retrospectives FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly_retrospectives" 
  ON public.weekly_retrospectives FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly_retrospectives" 
  ON public.weekly_retrospectives FOR DELETE 
  USING (auth.uid() = user_id);

-- plan_items tablosuna yeni kolonlar
ALTER TABLE public.plan_items ADD COLUMN IF NOT EXISTS carry_over_count INTEGER DEFAULT 0;
ALTER TABLE public.plan_items ADD COLUMN IF NOT EXISTS original_planned_date DATE;
ALTER TABLE public.plan_items ADD COLUMN IF NOT EXISTS last_carried_at TIMESTAMP WITH TIME ZONE;

-- updated_at trigger
CREATE TRIGGER update_weekly_retrospectives_updated_at
  BEFORE UPDATE ON public.weekly_retrospectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();