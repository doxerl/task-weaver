-- Fix: 2025 Personel Giderleri - user_id olmadan ekle (sonra güncellenir)
-- Ayrıca payroll_accruals tablosu oluştur

-- 1. Önce eski hatalı kayıtları temizle (eğer varsa)
DELETE FROM bank_transactions 
WHERE description LIKE 'Personel Brüt Ücret - % 2025' 
   OR description LIKE 'İşveren SGK+İşsizlik Primi - % 2025';

-- 2. PERSONEL_ISVEREN kategorisini ekle (yoksa)
INSERT INTO transaction_categories (
  code, name, type, account_code, account_subcode, 
  parent_category_id, depth, cost_center, is_system, is_active, is_kkeg, is_financing, is_excluded
)
SELECT 
  'PERSONEL_ISVEREN', 
  'İşveren SGK+İşsizlik Primi', 
  'expense', 
  '632', 
  '632.01.05',
  (SELECT id FROM transaction_categories WHERE code = 'PERSONEL' LIMIT 1),
  1,
  'ADMIN',
  true, true, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE code = 'PERSONEL_ISVEREN');

-- 3. Payroll Accruals tablosu (Bilanço bordro tahakkukları)
CREATE TABLE IF NOT EXISTS payroll_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  -- Brüt ve İşveren Primi (P&L referans)
  gross_salary DECIMAL(15,2) DEFAULT 0,
  employer_contribution DECIMAL(15,2) DEFAULT 0,
  
  -- 335 Personele Borçlar
  net_payable DECIMAL(15,2) DEFAULT 0,
  
  -- 360 Ödenecek Vergi ve Fonlar
  income_tax_payable DECIMAL(15,2) DEFAULT 0,
  stamp_tax_payable DECIMAL(15,2) DEFAULT 0,
  
  -- 361 Ödenecek SGK
  employee_sgk_payable DECIMAL(15,2) DEFAULT 0,
  employer_sgk_payable DECIMAL(15,2) DEFAULT 0,
  unemployment_payable DECIMAL(15,2) DEFAULT 0,
  
  -- Ödeme durumu
  is_net_paid BOOLEAN DEFAULT false,
  is_tax_paid BOOLEAN DEFAULT false,
  is_sgk_paid BOOLEAN DEFAULT false,
  
  net_paid_date DATE,
  tax_paid_date DATE,
  sgk_paid_date DATE,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, year, month)
);

-- RLS policies for payroll_accruals
ALTER TABLE payroll_accruals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payroll accruals" 
ON payroll_accruals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payroll accruals" 
ON payroll_accruals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payroll accruals" 
ON payroll_accruals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payroll accruals" 
ON payroll_accruals FOR DELETE 
USING (auth.uid() = user_id);