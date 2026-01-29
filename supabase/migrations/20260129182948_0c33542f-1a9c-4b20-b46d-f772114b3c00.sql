-- Add file_name column to yearly_income_statements for tracking uploaded files
ALTER TABLE yearly_income_statements 
ADD COLUMN IF NOT EXISTS file_name text;