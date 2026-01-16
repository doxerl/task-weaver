-- Add new columns to scenario_ai_analyses for unified analysis caching
ALTER TABLE public.scenario_ai_analyses
ADD COLUMN IF NOT EXISTS deal_score INTEGER,
ADD COLUMN IF NOT EXISTS valuation_verdict TEXT,
ADD COLUMN IF NOT EXISTS pitch_deck JSONB,
ADD COLUMN IF NOT EXISTS next_year_projection JSONB,
ADD COLUMN IF NOT EXISTS deal_config_snapshot JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.scenario_ai_analyses.deal_score IS 'AI deal score 1-10';
COMMENT ON COLUMN public.scenario_ai_analyses.valuation_verdict IS 'Valuation verdict: premium, fair, or cheap';
COMMENT ON COLUMN public.scenario_ai_analyses.pitch_deck IS 'AI generated pitch deck slides JSON';
COMMENT ON COLUMN public.scenario_ai_analyses.next_year_projection IS 'AI generated next year projection JSON';
COMMENT ON COLUMN public.scenario_ai_analyses.deal_config_snapshot IS 'Deal configuration at time of analysis';