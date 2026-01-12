-- Add new columns to receipts table for enhanced invoice tracking

-- Document type: received (expense) or issued (income)
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS document_type VARCHAR(20) DEFAULT 'received';

-- Seller (issuer) information
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS seller_name VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS seller_tax_no VARCHAR(20);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS seller_address TEXT;

-- Buyer (recipient) information
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS buyer_tax_no VARCHAR(20);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS buyer_address TEXT;

-- Detailed tax breakdown
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS subtotal NUMERIC;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS vat_rate NUMERIC;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS vat_amount NUMERIC;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS withholding_tax_rate NUMERIC;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS withholding_tax_amount NUMERIC;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS stamp_tax_amount NUMERIC;

-- Bank transaction matching
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS match_status VARCHAR(20) DEFAULT 'unmatched';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS match_confidence NUMERIC DEFAULT 0;

-- Add index for document type filtering
CREATE INDEX IF NOT EXISTS idx_receipts_document_type ON receipts(document_type);
CREATE INDEX IF NOT EXISTS idx_receipts_match_status ON receipts(match_status);