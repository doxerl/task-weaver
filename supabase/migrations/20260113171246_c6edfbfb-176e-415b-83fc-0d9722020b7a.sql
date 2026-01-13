-- Add new columns to financial_settings for detailed balance sheet
ALTER TABLE financial_settings 
ADD COLUMN IF NOT EXISTS unpaid_capital DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS legal_reserves DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_vat DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS personnel_payables DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_payables DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_security_payables DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deferred_tax_liabilities DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS calculated_vat_payable DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixtures_value DECIMAL(15,2) DEFAULT 0;

-- Add KKEG (Kanunen Kabul Edilmeyen Gider) category if not exists
INSERT INTO transaction_categories (
  code, name, type, color, icon, keywords, 
  is_active, is_system, is_excluded, is_financing, 
  affects_partner_account, sort_order
)
SELECT 
  'KKEG', 
  'Kanunen Kabul Edilmeyen Gider', 
  'EXPENSE', 
  '#f97316', 
  '⚠️', 
  ARRAY['KKEG', 'KANUNEN KABUL EDİLMEYEN', 'GİDER GÖSTERİLEMEYEN'],
  true, true, false, false, false, 220
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_categories WHERE code = 'KKEG'
);