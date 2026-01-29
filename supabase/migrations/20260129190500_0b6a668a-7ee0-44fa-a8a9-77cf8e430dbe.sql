-- Add raw_accounts column to yearly_income_statements for storing parsed account data
ALTER TABLE yearly_income_statements
ADD COLUMN IF NOT EXISTS raw_accounts JSONB DEFAULT NULL;