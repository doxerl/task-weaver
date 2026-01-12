-- Add VAT separation columns to bank_transactions
ALTER TABLE bank_transactions 
ADD COLUMN IF NOT EXISTS net_amount numeric,
ADD COLUMN IF NOT EXISTS vat_amount numeric,
ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS is_commercial boolean DEFAULT true;

-- Create receipt_transaction_matches table for multiple matches support
CREATE TABLE IF NOT EXISTS receipt_transaction_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id uuid REFERENCES receipts(id) ON DELETE CASCADE,
  bank_transaction_id uuid REFERENCES bank_transactions(id) ON DELETE CASCADE,
  match_type text CHECK (match_type IN ('full', 'partial', 'vat_only')) DEFAULT 'full',
  matched_amount numeric NOT NULL,
  is_auto_suggested boolean DEFAULT false,
  is_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
  UNIQUE(receipt_id, bank_transaction_id)
);

-- Enable RLS on the new table
ALTER TABLE receipt_transaction_matches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for receipt_transaction_matches
CREATE POLICY "Users can view own receipt matches" 
ON receipt_transaction_matches 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own receipt matches" 
ON receipt_transaction_matches 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipt matches" 
ON receipt_transaction_matches 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipt matches" 
ON receipt_transaction_matches 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_receipt_matches_receipt_id ON receipt_transaction_matches(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_matches_transaction_id ON receipt_transaction_matches(bank_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_is_commercial ON bank_transactions(is_commercial) WHERE is_commercial = true;