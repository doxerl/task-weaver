-- Add missing balance sheet columns
ALTER TABLE yearly_balance_sheets
ADD COLUMN IF NOT EXISTS overdue_tax_payables NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS legal_reserves NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_loss NUMERIC DEFAULT 0;