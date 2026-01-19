-- Add columns for focus project settings persistence
ALTER TABLE scenario_ai_analyses
ADD COLUMN IF NOT EXISTS focus_projects TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS focus_project_plan TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS investment_allocation JSONB DEFAULT '{"product": 40, "marketing": 30, "hiring": 20, "operations": 10}'::jsonb;