-- Unique constraint ekle (aynı kullanıcı için aynı işlem tekrar edilemesin)
ALTER TABLE bank_transactions 
ADD CONSTRAINT unique_user_transaction 
UNIQUE (user_id, transaction_date, description, amount);