-- Eski constraint'i kaldır
ALTER TABLE bank_transactions 
DROP CONSTRAINT IF EXISTS unique_user_transaction;

-- Yeni constraint: file_id + row_number bazlı
ALTER TABLE bank_transactions 
ADD CONSTRAINT unique_user_file_row 
UNIQUE (user_id, file_id, row_number);