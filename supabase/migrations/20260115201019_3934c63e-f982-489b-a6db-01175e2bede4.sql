-- Kasa açılış değeri için yeni alan ekle
ALTER TABLE financial_settings 
ADD COLUMN IF NOT EXISTS opening_cash_on_hand NUMERIC DEFAULT 0;

-- Resmi açılış değerlerini güncelle
UPDATE financial_settings 
SET 
  opening_cash_on_hand = 33118.55,
  opening_bank_balance = 68194.77,
  updated_at = now()
WHERE user_id = '8de85cec-cb06-4d8f-aa41-72f22c04eae1';