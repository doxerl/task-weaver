-- Add new columns for Uniform Chart of Accounts (Tekdüzen Hesap Planı)
ALTER TABLE transaction_categories 
ADD COLUMN IF NOT EXISTS account_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS account_subcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS cost_center VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_kkeg BOOLEAN DEFAULT false;

-- Update existing categories with account codes

-- INCOME categories (60x)
UPDATE transaction_categories SET account_code = '600', account_subcode = '600.01' WHERE code = 'SBT';
UPDATE transaction_categories SET account_code = '600', account_subcode = '600.02' WHERE code = 'L&S';
UPDATE transaction_categories SET account_code = '600', account_subcode = '600.03' WHERE code = 'ZDHC';
UPDATE transaction_categories SET account_code = '600', account_subcode = '600.04' WHERE code = 'DANIS';
UPDATE transaction_categories SET account_code = '600', account_subcode = '600.05' WHERE code = 'EGITIM_IN';
UPDATE transaction_categories SET account_code = '600', account_subcode = '600.06' WHERE code = 'RAPOR';
UPDATE transaction_categories SET account_code = '600', account_subcode = '600.07' WHERE code = 'BAYI';
UPDATE transaction_categories SET account_code = '602', account_subcode = '602.01' WHERE code = 'MASRAF';
UPDATE transaction_categories SET account_code = '602', account_subcode = '602.02' WHERE code = 'LISANS';
UPDATE transaction_categories SET account_code = '602', account_subcode = '602.99' WHERE code = 'DIGER_IN';
UPDATE transaction_categories SET account_code = '649', account_subcode = '649.01' WHERE code = 'KIRA_IN';
UPDATE transaction_categories SET account_code = '642', account_subcode = '642.01' WHERE code = 'FAIZ_IN';
UPDATE transaction_categories SET account_code = '646', account_subcode = '646.01' WHERE code = 'DOVIZ_IN';

-- Sales Returns (61x)
UPDATE transaction_categories SET account_code = '610', account_subcode = '610.01' WHERE code = 'IADE';

-- Cost of Sales (62x) - with cost center DELIVERY
UPDATE transaction_categories SET account_code = '622', account_subcode = '622.01', cost_center = 'DELIVERY' WHERE code = 'HARICI';

-- Operating Expenses - Marketing (631)
UPDATE transaction_categories SET account_code = '631', account_subcode = '631.01', cost_center = 'SALES' WHERE code = 'FUAR';

-- Operating Expenses - General Admin (632)
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.01', cost_center = 'ADMIN' WHERE code = 'PERSONEL';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.02', cost_center = 'ADMIN' WHERE code = 'KIRA_OUT';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.03', cost_center = 'ADMIN' WHERE code = 'HGS';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.04', cost_center = 'ADMIN' WHERE code = 'SEYAHAT';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.05', cost_center = 'ADMIN' WHERE code = 'TELEKOM';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.06', cost_center = 'ADMIN' WHERE code = 'SIGORTA';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.07', cost_center = 'ADMIN' WHERE code = 'OFIS';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.08', cost_center = 'ADMIN' WHERE code = 'MUHASEBE';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.09', cost_center = 'ADMIN' WHERE code = 'DANIS_OUT';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.10', cost_center = 'ADMIN' WHERE code = 'HUKUK';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.11', cost_center = 'ADMIN' WHERE code = 'YAZILIM';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.12', cost_center = 'ADMIN' WHERE code = 'EGITIM_OUT';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.13', cost_center = 'ADMIN' WHERE code = 'KARGO';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.14', cost_center = 'ADMIN', is_kkeg = true WHERE code = 'TEMSIL';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.15', cost_center = 'ADMIN' WHERE code = 'YEMEK';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.16', cost_center = 'ADMIN' WHERE code = 'BAKIM';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.17', cost_center = 'ADMIN' WHERE code = 'AIDAT';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.18', cost_center = 'ADMIN' WHERE code = 'YONL';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.99', cost_center = 'ADMIN' WHERE code = 'DIGER_OUT';
UPDATE transaction_categories SET account_code = '632', account_subcode = '632.20', cost_center = 'ADMIN' WHERE code = 'VERGI';

-- Other Operating Expenses (65x)
UPDATE transaction_categories SET account_code = '653', account_subcode = '653.01' WHERE code = 'BANKA';
UPDATE transaction_categories SET account_code = '656', account_subcode = '656.01' WHERE code = 'DOVIZ_OUT';

-- Finance Expenses (66x)
UPDATE transaction_categories SET account_code = '660', account_subcode = '660.01' WHERE code = 'FAIZ_OUT';
UPDATE transaction_categories SET account_code = '660', account_subcode = '660.02' WHERE code = 'FAKTORING';
UPDATE transaction_categories SET account_code = '660', account_subcode = '660.03' WHERE code = 'LEASING';

-- Extraordinary Expenses (68x)
UPDATE transaction_categories SET account_code = '689', account_subcode = '689.01', is_kkeg = true WHERE code = 'KKEG';

-- Investment categories (Balance sheet items - no income statement code)
UPDATE transaction_categories SET account_code = NULL WHERE code IN ('ARAC', 'EKIPMAN', 'GAYRIMENKUL', 'HISSE');

-- Credit categories (Balance sheet items - no income statement code)
UPDATE transaction_categories SET account_code = NULL WHERE code IN ('KREDI_IN', 'KREDI_OUT');

-- Partner categories (Balance sheet items - no income statement code)
UPDATE transaction_categories SET account_code = NULL WHERE code IN ('ORTAK_IN', 'ORTAK_OUT');

-- Insert new 622 sub-categories for detailed cost tracking (only if not exists)
INSERT INTO transaction_categories (code, name, type, account_code, account_subcode, cost_center, is_system, is_active, icon, color, sort_order)
SELECT 'SUBCONTRACTOR', 'Taşeron/Eğitmen', 'EXPENSE', '622', '622.02', 'DELIVERY', true, true, '👥', '#8B5CF6', 201
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE code = 'SUBCONTRACTOR' AND user_id IS NULL);

INSERT INTO transaction_categories (code, name, type, account_code, account_subcode, cost_center, is_system, is_active, icon, color, sort_order)
SELECT 'DELIVERY_TRAVEL', 'Teslimat Seyahati', 'EXPENSE', '622', '622.03', 'DELIVERY', true, true, '✈️', '#0EA5E9', 202
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE code = 'DELIVERY_TRAVEL' AND user_id IS NULL);

INSERT INTO transaction_categories (code, name, type, account_code, account_subcode, cost_center, is_system, is_active, icon, color, sort_order)
SELECT 'DELIVERY_TOOLS', 'Proje Araçları', 'EXPENSE', '622', '622.04', 'DELIVERY', true, true, '🛠️', '#F97316', 203
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE code = 'DELIVERY_TOOLS' AND user_id IS NULL);

INSERT INTO transaction_categories (code, name, type, account_code, account_subcode, cost_center, is_system, is_active, icon, color, sort_order)
SELECT 'MATERIAL_PRINT', 'Materyal/Baskı', 'EXPENSE', '622', '622.05', 'DELIVERY', true, true, '📄', '#10B981', 204
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE code = 'MATERIAL_PRINT' AND user_id IS NULL);

-- Insert CEZA category for penalties (659)
INSERT INTO transaction_categories (code, name, type, account_code, account_subcode, is_kkeg, is_system, is_active, icon, color, sort_order)
SELECT 'CEZA', 'Ceza/Tazminat', 'EXPENSE', '659', '659.01', true, true, true, '⚠️', '#EF4444', 650
WHERE NOT EXISTS (SELECT 1 FROM transaction_categories WHERE code = 'CEZA' AND user_id IS NULL);