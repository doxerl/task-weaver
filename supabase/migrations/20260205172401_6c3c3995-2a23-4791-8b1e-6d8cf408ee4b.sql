-- Add new columns to simulation_scenarios for Cap Table, Working Capital, Sensitivity and Cash Flow data
ALTER TABLE simulation_scenarios
ADD COLUMN IF NOT EXISTS cap_table_entries jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS future_rounds jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS working_capital_config jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sensitivity_results jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cash_flow_analysis jsonb DEFAULT NULL;