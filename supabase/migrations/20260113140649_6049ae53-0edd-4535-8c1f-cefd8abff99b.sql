-- Add receipt_subtype column for slip/invoice distinction
ALTER TABLE receipts 
ADD COLUMN receipt_subtype VARCHAR(20) DEFAULT 'slip';

-- Update existing received documents based on file type and content
UPDATE receipts 
SET receipt_subtype = CASE 
  -- PDF files are typically invoices
  WHEN file_type ILIKE '%pdf%' THEN 'invoice'
  -- XML files are e-invoices
  WHEN file_name ILIKE '%.xml' THEN 'invoice'
  -- GIB numbered documents are invoices
  WHEN receipt_no ILIKE 'GIB%' THEN 'invoice'
  -- Files with 'fatura' in name are invoices
  WHEN file_name ILIKE '%fatura%' THEN 'invoice'
  -- Everything else is a slip
  ELSE 'slip'
END
WHERE document_type = 'received';

-- Add index for better query performance
CREATE INDEX idx_receipts_subtype ON receipts(receipt_subtype) WHERE document_type = 'received';