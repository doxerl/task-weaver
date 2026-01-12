-- 1. KATEGORİLER
CREATE TABLE transaction_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME','EXPENSE','PARTNER','FINANCING','INVESTMENT','EXCLUDED')),
  color VARCHAR(7) DEFAULT '#6b7280',
  icon VARCHAR(50) DEFAULT '💰',
  keywords TEXT[] DEFAULT '{}',
  vendor_patterns TEXT[] DEFAULT '{}',
  is_financing BOOLEAN DEFAULT FALSE,
  is_excluded BOOLEAN DEFAULT FALSE,
  affects_partner_account BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BANKA DOSYALARI
CREATE TABLE uploaded_bank_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL,
  file_size INTEGER,
  file_url TEXT,
  bank_name VARCHAR(100),
  period_start DATE,
  period_end DATE,
  total_transactions INTEGER DEFAULT 0,
  processing_status VARCHAR(20) DEFAULT 'pending',
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BANKA İŞLEMLERİ
CREATE TABLE bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID REFERENCES uploaded_bank_files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  row_number INTEGER,
  raw_date TEXT,
  raw_description TEXT,
  raw_amount TEXT,
  transaction_date DATE,
  description TEXT,
  amount DECIMAL(15,2),
  balance DECIMAL(15,2),
  category_id UUID REFERENCES transaction_categories(id),
  ai_suggested_category_id UUID REFERENCES transaction_categories(id),
  ai_confidence DECIMAL(3,2) DEFAULT 0,
  is_manually_categorized BOOLEAN DEFAULT FALSE,
  is_income BOOLEAN,
  is_excluded BOOLEAN DEFAULT FALSE,
  reference_no VARCHAR(100),
  counterparty VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FİŞ/FATURALAR
CREATE TABLE receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_type VARCHAR(10),
  file_url TEXT,
  thumbnail_url TEXT,
  ocr_raw_text TEXT,
  ocr_confidence DECIMAL(3,2) DEFAULT 0,
  vendor_name VARCHAR(200),
  vendor_tax_no VARCHAR(20),
  receipt_date DATE,
  receipt_no VARCHAR(100),
  total_amount DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'TRY',
  category_id UUID REFERENCES transaction_categories(id),
  ai_suggested_category_id UUID REFERENCES transaction_categories(id),
  is_manually_categorized BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(20) DEFAULT 'pending',
  is_verified BOOLEAN DEFAULT FALSE,
  is_included_in_report BOOLEAN DEFAULT FALSE,
  linked_bank_transaction_id UUID REFERENCES bank_transactions(id),
  month INTEGER,
  year INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RAPORLAR
CREATE TABLE financial_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_name VARCHAR(200),
  report_year INTEGER,
  report_month INTEGER,
  total_income DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  total_receipt_expenses DECIMAL(15,2),
  operating_profit DECIMAL(15,2),
  profit_margin DECIMAL(5,2),
  partner_withdrawals DECIMAL(15,2),
  partner_deposits DECIMAL(15,2),
  net_partner_balance DECIMAL(15,2),
  total_financing_in DECIMAL(15,2),
  report_data JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İNDEKSLER
CREATE INDEX idx_transaction_categories_user ON transaction_categories(user_id);
CREATE INDEX idx_bank_transactions_user ON bank_transactions(user_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_category ON bank_transactions(category_id);
CREATE INDEX idx_receipts_user ON receipts(user_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);
CREATE INDEX idx_financial_reports_user ON financial_reports(user_id);

-- RLS
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_bank_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- transaction_categories policies (system kategoriler herkes görebilir)
CREATE POLICY "Users can view own or system categories" ON transaction_categories FOR SELECT USING (auth.uid() = user_id OR is_system = true);
CREATE POLICY "Users can insert own categories" ON transaction_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON transaction_categories FOR UPDATE USING (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can delete own categories" ON transaction_categories FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- uploaded_bank_files policies
CREATE POLICY "Users can view own bank files" ON uploaded_bank_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank files" ON uploaded_bank_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank files" ON uploaded_bank_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank files" ON uploaded_bank_files FOR DELETE USING (auth.uid() = user_id);

-- bank_transactions policies
CREATE POLICY "Users can view own bank transactions" ON bank_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank transactions" ON bank_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank transactions" ON bank_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank transactions" ON bank_transactions FOR DELETE USING (auth.uid() = user_id);

-- receipts policies
CREATE POLICY "Users can view own receipts" ON receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own receipts" ON receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own receipts" ON receipts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own receipts" ON receipts FOR DELETE USING (auth.uid() = user_id);

-- financial_reports policies
CREATE POLICY "Users can view own financial reports" ON financial_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financial reports" ON financial_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financial reports" ON financial_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financial reports" ON financial_reports FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('finance-files', 'finance-files', true);

-- Storage policies
CREATE POLICY "Users can upload own finance files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can read own finance files" ON storage.objects FOR SELECT USING (
  bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own finance files" ON storage.objects FOR DELETE USING (
  bucket_id = 'finance-files' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Seed system categories (user_id NULL for system categories)
INSERT INTO transaction_categories (user_id, name, code, type, color, icon, keywords, vendor_patterns, is_system, is_financing, is_excluded, affects_partner_account, sort_order) VALUES
-- GELİR
(NULL, 'SBT Tracker', 'SBT', 'INCOME', '#10b981', '📊', ARRAY['SBT','KARBON','CARBON','EMİSYON'], ARRAY[]::text[], true, false, false, false, 1),
(NULL, 'Leadership Denetim', 'L&S', 'INCOME', '#3b82f6', '🔍', ARRAY['LEADERSHIP','L&S','DENETİM'], ARRAY['LEADERSHIP'], true, false, false, false, 2),
(NULL, 'Danışmanlık', 'DANIS', 'INCOME', '#6366f1', '💼', ARRAY['DANIŞMANLIK','HİZMET BEDELİ'], ARRAY[]::text[], true, false, false, false, 3),
(NULL, 'ZDHC InCheck', 'ZDHC', 'INCOME', '#ec4899', '✅', ARRAY['ZDHC','INCHECK'], ARRAY[]::text[], true, false, false, false, 4),
(NULL, 'Döviz Satışı', 'DOVIZ_IN', 'INCOME', '#06b6d4', '💱', ARRAY['DÖVİZ SATIŞ'], ARRAY[]::text[], true, false, false, false, 5),
-- GİDER
(NULL, 'Seyahat', 'SEYAHAT', 'EXPENSE', '#ef4444', '✈️', ARRAY['SEYAHAT','UÇAK','OTEL'], ARRAY['SANTA TURİZM','THY','PEGASUS'], true, false, false, false, 10),
(NULL, 'Fuar/Reklam', 'FUAR', 'EXPENSE', '#f97316', '🎪', ARRAY['FUAR','STAND','REKLAM','KARTVİZİT'], ARRAY[]::text[], true, false, false, false, 11),
(NULL, 'HGS/Ulaşım', 'HGS', 'EXPENSE', '#14b8a6', '🚗', ARRAY['HGS','OGS','YAKIT','BENZİN'], ARRAY['OPET','SHELL','BP'], true, false, false, false, 12),
(NULL, 'Sigorta', 'SIGORTA', 'EXPENSE', '#64748b', '🛡️', ARRAY['SİGORTA','KASKO'], ARRAY[]::text[], true, false, false, false, 13),
(NULL, 'Telekomünikasyon', 'TELEKOM', 'EXPENSE', '#94a3b8', '📱', ARRAY['TURKCELL','VODAFONE','TÜRK TELEKOM'], ARRAY[]::text[], true, false, false, false, 14),
(NULL, 'Banka Kesintisi', 'BANKA', 'EXPENSE', '#cbd5e1', '🏦', ARRAY['KESİNTİ','KOMİSYON','MASRAF'], ARRAY[]::text[], true, false, false, false, 15),
(NULL, 'Ofis/Kırtasiye', 'OFIS', 'EXPENSE', '#a78bfa', '🖨️', ARRAY['KIRTASİYE','TONER','KAĞIT'], ARRAY[]::text[], true, false, false, false, 16),
(NULL, 'Yemek/İkram', 'YEMEK', 'EXPENSE', '#fb923c', '🍽️', ARRAY['YEMEK','RESTORAN','CAFE'], ARRAY[]::text[], true, false, false, false, 17),
(NULL, 'Kredi Ödeme', 'KREDI_OUT', 'EXPENSE', '#ef4444', '💳', ARRAY['KREDİ TAHS','TAKSİT'], ARRAY[]::text[], true, false, false, false, 18),
(NULL, 'Döviz Alış', 'DOVIZ_OUT', 'EXPENSE', '#3b82f6', '💱', ARRAY['DÖVİZ ALIŞ'], ARRAY[]::text[], true, false, false, false, 19),
-- YATIRIM
(NULL, 'Araç Yatırımı', 'ARAC', 'INVESTMENT', '#dc2626', '🚘', ARRAY['TOGG','ARAÇ','OTOMOBİL'], ARRAY[]::text[], true, false, false, false, 30),
-- FİNANSMAN
(NULL, 'Kredi Kullanım', 'KREDI_IN', 'FINANCING', '#1d4ed8', '🏦', ARRAY['KREDİ KULLANIM','TİCARİ KREDİ'], ARRAY[]::text[], true, true, false, false, 40),
-- ORTAK CARİ
(NULL, 'Ortağa Ödeme', 'ORTAK_OUT', 'PARTNER', '#fbbf24', '👤', ARRAY['BORÇ'], ARRAY['EMRE AKÇAOĞLU'], true, false, false, true, 50),
(NULL, 'Ortaktan Tahsilat', 'ORTAK_IN', 'PARTNER', '#22c55e', '👤', ARRAY[]::text[], ARRAY['EMRE AKÇAOĞLU'], true, false, false, true, 51),
-- HARİÇ
(NULL, 'Hariç Tut', 'EXCLUDED', 'EXCLUDED', '#9ca3af', '🚫', ARRAY['DEPOZİTO','TEMİNAT','VİRMAN'], ARRAY[]::text[], true, false, true, false, 99);