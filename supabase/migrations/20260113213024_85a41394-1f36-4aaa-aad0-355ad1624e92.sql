-- Add parent-child relationship for hierarchical categories
ALTER TABLE transaction_categories 
ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES transaction_categories(id);

ALTER TABLE transaction_categories 
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;

-- Create index for faster hierarchical queries
CREATE INDEX IF NOT EXISTS idx_transaction_categories_parent 
ON transaction_categories(parent_category_id);

-- Add unique constraint on code column for ON CONFLICT to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_categories_code_unique 
ON transaction_categories(code);