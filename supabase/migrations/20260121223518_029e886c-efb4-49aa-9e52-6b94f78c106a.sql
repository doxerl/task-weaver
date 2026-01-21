-- Add TL-equivalent columns for domestic invoices with foreign currency
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS subtotal_try numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS vat_amount_try numeric;

-- Update existing domestic foreign-currency invoices using stored exchange rate
UPDATE receipts 
SET 
  subtotal_try = subtotal * exchange_rate_used,
  vat_amount_try = vat_amount * exchange_rate_used
WHERE 
  is_foreign_invoice = false 
  AND currency IS NOT NULL 
  AND currency != 'TRY' 
  AND exchange_rate_used IS NOT NULL
  AND subtotal IS NOT NULL
  AND subtotal_try IS NULL;