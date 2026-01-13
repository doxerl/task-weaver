-- 2025 Personel Giderleri - 12 ay × 2 kategori (Brüt Ücret + İşveren Primi)
-- is_commercial = false (KDV uygulanmaz - bordro kalemi)

-- Önce PERSONEL_ISVEREN kategorisi ekle (İşveren SGK+İşsizlik Primi için)
INSERT INTO transaction_categories (
  code, name, type, account_code, account_subcode, 
  parent_category_id, depth, cost_center, is_system, is_active, is_kkeg, is_financing, is_excluded
)
SELECT 
  'PERSONEL_ISVEREN', 
  'İşveren SGK+İşsizlik Primi', 
  'EXPENSE', 
  '632', 
  '632.01.05',
  id,
  1,
  'ADMIN',
  true, true, false, false, false
FROM transaction_categories 
WHERE code = 'PERSONEL'
ON CONFLICT (code) DO NOTHING;

-- 2025 Personel Giderleri Insert
INSERT INTO bank_transactions (
  transaction_date, description, amount, category_id, 
  is_commercial, is_manually_categorized, is_income, is_excluded,
  user_id
)
SELECT 
  data.transaction_date::date,
  data.description,
  data.amount,
  (SELECT id FROM transaction_categories WHERE code = data.category_code LIMIT 1),
  false,  -- is_commercial = false (KDV yok)
  true,   -- is_manually_categorized
  false,  -- is_income = false (gider)
  false,  -- is_excluded = false
  auth.uid()
FROM (VALUES
  -- Ocak 2025
  ('2025-01-15', 'Personel Brüt Ücret - Ocak 2025', -104136.63, 'PERSONEL_UCRET'),
  ('2025-01-15', 'İşveren SGK+İşsizlik Primi - Ocak 2025', -23691.08, 'PERSONEL_ISVEREN'),
  
  -- Şubat 2025
  ('2025-02-15', 'Personel Brüt Ücret - Şubat 2025', -107632.40, 'PERSONEL_UCRET'),
  ('2025-02-15', 'İşveren SGK+İşsizlik Primi - Şubat 2025', -24486.37, 'PERSONEL_ISVEREN'),
  
  -- Mart 2025
  ('2025-03-15', 'Personel Brüt Ücret - Mart 2025', -114175.37, 'PERSONEL_UCRET'),
  ('2025-03-15', 'İşveren SGK+İşsizlik Primi - Mart 2025', -25974.90, 'PERSONEL_ISVEREN'),
  
  -- Nisan 2025
  ('2025-04-15', 'Personel Brüt Ücret - Nisan 2025', -122856.92, 'PERSONEL_UCRET'),
  ('2025-04-15', 'İşveren SGK+İşsizlik Primi - Nisan 2025', -27952.95, 'PERSONEL_ISVEREN'),
  
  -- Mayıs 2025
  ('2025-05-15', 'Personel Brüt Ücret - Mayıs 2025', -128705.74, 'PERSONEL_UCRET'),
  ('2025-05-15', 'İşveren SGK+İşsizlik Primi - Mayıs 2025', -29283.56, 'PERSONEL_ISVEREN'),
  
  -- Haziran 2025
  ('2025-06-15', 'Personel Brüt Ücret - Haziran 2025', -131102.41, 'PERSONEL_UCRET'),
  ('2025-06-15', 'İşveren SGK+İşsizlik Primi - Haziran 2025', -29828.80, 'PERSONEL_ISVEREN'),
  
  -- Temmuz 2025
  ('2025-07-15', 'Personel Brüt Ücret - Temmuz 2025', -133870.94, 'PERSONEL_UCRET'),
  ('2025-07-15', 'İşveren SGK+İşsizlik Primi - Temmuz 2025', -30458.64, 'PERSONEL_ISVEREN'),
  
  -- Ağustos 2025
  ('2025-08-15', 'Personel Brüt Ücret - Ağustos 2025', -136122.23, 'PERSONEL_UCRET'),
  ('2025-08-15', 'İşveren SGK+İşsizlik Primi - Ağustos 2025', -30970.81, 'PERSONEL_ISVEREN'),
  
  -- Eylül 2025
  ('2025-09-15', 'Personel Brüt Ücret - Eylül 2025', -137913.36, 'PERSONEL_UCRET'),
  ('2025-09-15', 'İşveren SGK+İşsizlik Primi - Eylül 2025', -31378.29, 'PERSONEL_ISVEREN'),
  
  -- Ekim 2025
  ('2025-10-15', 'Personel Brüt Ücret - Ekim 2025', -139714.18, 'PERSONEL_UCRET'),
  ('2025-10-15', 'İşveren SGK+İşsizlik Primi - Ekim 2025', -31787.47, 'PERSONEL_ISVEREN'),
  
  -- Kasım 2025
  ('2025-11-15', 'Personel Brüt Ücret - Kasım 2025', -141303.22, 'PERSONEL_UCRET'),
  ('2025-11-15', 'İşveren SGK+İşsizlik Primi - Kasım 2025', -32149.98, 'PERSONEL_ISVEREN'),
  
  -- Aralık 2025
  ('2025-12-15', 'Personel Brüt Ücret - Aralık 2025', -157367.28, 'PERSONEL_UCRET'),
  ('2025-12-15', 'İşveren SGK+İşsizlik Primi - Aralık 2025', -35801.06, 'PERSONEL_ISVEREN')
) AS data(transaction_date, description, amount, category_code)
WHERE auth.uid() IS NOT NULL;