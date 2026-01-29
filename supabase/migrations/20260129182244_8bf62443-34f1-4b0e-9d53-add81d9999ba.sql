-- Add file upload and parsing columns to yearly_balance_sheets
ALTER TABLE yearly_balance_sheets 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS uploaded_at timestamptz,
ADD COLUMN IF NOT EXISTS raw_accounts jsonb;