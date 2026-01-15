-- Add new fields to financial_settings for 2024 opening balances
ALTER TABLE financial_settings
ADD COLUMN IF NOT EXISTS opening_bank_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS partner_payables numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_provision numeric DEFAULT 0;