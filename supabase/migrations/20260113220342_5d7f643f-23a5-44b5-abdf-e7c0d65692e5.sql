-- 2025 Sabit Giderler: Kira (₺30.000/ay) ve Yazılım/Abonelik (₺50.000/ay)
-- is_commercial = false (KDV yok), net gider olarak kaydedilecek

INSERT INTO bank_transactions (
  user_id, transaction_date, description, amount, 
  category_id, is_commercial, is_manually_categorized, 
  is_income, is_excluded
)
SELECT 
  (SELECT id FROM profiles LIMIT 1),
  data.transaction_date::date,
  data.description,
  data.amount,
  (SELECT id FROM transaction_categories WHERE code = data.category_code LIMIT 1),
  false,
  true,
  false,
  false
FROM (VALUES
  -- Kira Giderleri (₺30.000/ay)
  ('2025-01-01', 'Ofis Kirası - Ocak 2025', -30000.00, 'KIRA_OUT'),
  ('2025-02-01', 'Ofis Kirası - Şubat 2025', -30000.00, 'KIRA_OUT'),
  ('2025-03-01', 'Ofis Kirası - Mart 2025', -30000.00, 'KIRA_OUT'),
  ('2025-04-01', 'Ofis Kirası - Nisan 2025', -30000.00, 'KIRA_OUT'),
  ('2025-05-01', 'Ofis Kirası - Mayıs 2025', -30000.00, 'KIRA_OUT'),
  ('2025-06-01', 'Ofis Kirası - Haziran 2025', -30000.00, 'KIRA_OUT'),
  ('2025-07-01', 'Ofis Kirası - Temmuz 2025', -30000.00, 'KIRA_OUT'),
  ('2025-08-01', 'Ofis Kirası - Ağustos 2025', -30000.00, 'KIRA_OUT'),
  ('2025-09-01', 'Ofis Kirası - Eylül 2025', -30000.00, 'KIRA_OUT'),
  ('2025-10-01', 'Ofis Kirası - Ekim 2025', -30000.00, 'KIRA_OUT'),
  ('2025-11-01', 'Ofis Kirası - Kasım 2025', -30000.00, 'KIRA_OUT'),
  ('2025-12-01', 'Ofis Kirası - Aralık 2025', -30000.00, 'KIRA_OUT'),
  
  -- Yazılım/Abonelik Giderleri (₺50.000/ay)
  ('2025-01-01', 'Yazılım Abonelikleri - Ocak 2025', -50000.00, 'YAZILIM'),
  ('2025-02-01', 'Yazılım Abonelikleri - Şubat 2025', -50000.00, 'YAZILIM'),
  ('2025-03-01', 'Yazılım Abonelikleri - Mart 2025', -50000.00, 'YAZILIM'),
  ('2025-04-01', 'Yazılım Abonelikleri - Nisan 2025', -50000.00, 'YAZILIM'),
  ('2025-05-01', 'Yazılım Abonelikleri - Mayıs 2025', -50000.00, 'YAZILIM'),
  ('2025-06-01', 'Yazılım Abonelikleri - Haziran 2025', -50000.00, 'YAZILIM'),
  ('2025-07-01', 'Yazılım Abonelikleri - Temmuz 2025', -50000.00, 'YAZILIM'),
  ('2025-08-01', 'Yazılım Abonelikleri - Ağustos 2025', -50000.00, 'YAZILIM'),
  ('2025-09-01', 'Yazılım Abonelikleri - Eylül 2025', -50000.00, 'YAZILIM'),
  ('2025-10-01', 'Yazılım Abonelikleri - Ekim 2025', -50000.00, 'YAZILIM'),
  ('2025-11-01', 'Yazılım Abonelikleri - Kasım 2025', -50000.00, 'YAZILIM'),
  ('2025-12-01', 'Yazılım Abonelikleri - Aralık 2025', -50000.00, 'YAZILIM')
) AS data(transaction_date, description, amount, category_code);