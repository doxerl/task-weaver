-- Add columns for edited projections
ALTER TABLE scenario_ai_analyses
ADD COLUMN IF NOT EXISTS edited_revenue_projection JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS edited_expense_projection JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS projection_user_edited BOOLEAN DEFAULT false;