-- Add columns for foreign invoice support
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS is_foreign_invoice boolean DEFAULT false;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS original_currency text;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS original_amount numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS exchange_rate_used numeric;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS amount_try numeric;

-- Add comment for clarity
COMMENT ON COLUMN receipts.is_foreign_invoice IS 'True if invoice is from a foreign seller (no VAT applies)';
COMMENT ON COLUMN receipts.original_currency IS 'Original currency of the invoice (USD, EUR, etc.)';
COMMENT ON COLUMN receipts.original_amount IS 'Original amount in foreign currency';
COMMENT ON COLUMN receipts.exchange_rate_used IS 'Exchange rate used for TRY conversion';
COMMENT ON COLUMN receipts.amount_try IS 'Amount converted to TRY';