-- 2025 Sabit Muhasebe Gideri: ₺7.500/ay (Yıllık ₺90.000)
-- is_commercial = false (KDV yok), net gider

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
  'b4118ad1-b58e-4d85-834c-653c4ad545d0'::uuid,
  false,
  true,
  false,
  false
FROM (VALUES
  ('2025-01-05', 'Muhasebe Hizmeti - Ocak 2025', -7500.00),
  ('2025-02-05', 'Muhasebe Hizmeti - Şubat 2025', -7500.00),
  ('2025-03-05', 'Muhasebe Hizmeti - Mart 2025', -7500.00),
  ('2025-04-05', 'Muhasebe Hizmeti - Nisan 2025', -7500.00),
  ('2025-05-05', 'Muhasebe Hizmeti - Mayıs 2025', -7500.00),
  ('2025-06-05', 'Muhasebe Hizmeti - Haziran 2025', -7500.00),
  ('2025-07-05', 'Muhasebe Hizmeti - Temmuz 2025', -7500.00),
  ('2025-08-05', 'Muhasebe Hizmeti - Ağustos 2025', -7500.00),
  ('2025-09-05', 'Muhasebe Hizmeti - Eylül 2025', -7500.00),
  ('2025-10-05', 'Muhasebe Hizmeti - Ekim 2025', -7500.00),
  ('2025-11-05', 'Muhasebe Hizmeti - Kasım 2025', -7500.00),
  ('2025-12-05', 'Muhasebe Hizmeti - Aralık 2025', -7500.00)
) AS data(transaction_date, description, amount);