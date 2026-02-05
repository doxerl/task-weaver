-- Add investment configuration columns to simulation_scenarios table
ALTER TABLE public.simulation_scenarios
ADD COLUMN IF NOT EXISTS focus_projects text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS focus_project_plan text DEFAULT '',
ADD COLUMN IF NOT EXISTS investment_allocation jsonb DEFAULT '{"product": 40, "marketing": 30, "hiring": 20, "operations": 10}'::jsonb,
ADD COLUMN IF NOT EXISTS deal_config jsonb DEFAULT NULL;