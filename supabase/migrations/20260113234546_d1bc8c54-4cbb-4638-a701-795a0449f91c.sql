-- Create simulation_scenarios table for saving growth simulation scenarios
CREATE TABLE public.simulation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_year INTEGER DEFAULT 2025,
  target_year INTEGER DEFAULT 2026,
  assumed_exchange_rate NUMERIC DEFAULT 45,
  revenues JSONB DEFAULT '[]',
  expenses JSONB DEFAULT '[]',
  investments JSONB DEFAULT '[]',
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.simulation_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scenarios" 
ON public.simulation_scenarios 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scenarios" 
ON public.simulation_scenarios 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenarios" 
ON public.simulation_scenarios 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenarios" 
ON public.simulation_scenarios 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_simulation_scenarios_updated_at
BEFORE UPDATE ON public.simulation_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();