-- Add scenario_type column for positive/negative classification
ALTER TABLE public.simulation_scenarios 
ADD COLUMN IF NOT EXISTS scenario_type text DEFAULT 'positive';

-- Add version column for tracking scenario versions
ALTER TABLE public.simulation_scenarios 
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Add check constraint for scenario_type
ALTER TABLE public.simulation_scenarios 
ADD CONSTRAINT simulation_scenarios_scenario_type_check 
CHECK (scenario_type IN ('positive', 'negative'));

-- Update existing scenarios to have version 1 if null
UPDATE public.simulation_scenarios 
SET version = 1 
WHERE version IS NULL;