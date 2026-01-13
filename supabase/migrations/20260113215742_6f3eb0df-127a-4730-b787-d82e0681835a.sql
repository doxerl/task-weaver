-- 2025 Personel Giderleri - Kullanıcı oturum açtığında tetiklenmek üzere
-- Şimdilik profiles tablosundan bir kullanıcı ID'si alarak ekliyoruz

-- İlk kullanıcıyı bul ve verileri ekle
DO $$
DECLARE
  v_user_id UUID;
  v_personel_ucret_id UUID;
  v_personel_isveren_id UUID;
BEGIN
  -- İlk kullanıcıyı al
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found, skipping personnel data insertion';
    RETURN;
  END IF;
  
  -- Kategori ID'lerini al
  SELECT id INTO v_personel_ucret_id FROM transaction_categories WHERE code = 'PERSONEL_UCRET' LIMIT 1;
  SELECT id INTO v_personel_isveren_id FROM transaction_categories WHERE code = 'PERSONEL_ISVEREN' LIMIT 1;
  
  IF v_personel_ucret_id IS NULL THEN
    SELECT id INTO v_personel_ucret_id FROM transaction_categories WHERE code = 'PERSONEL' LIMIT 1;
  END IF;
  
  IF v_personel_isveren_id IS NULL THEN
    SELECT id INTO v_personel_isveren_id FROM transaction_categories WHERE code = 'PERSONEL_SGK' LIMIT 1;
  END IF;
  
  -- 2025 Personel Giderleri - 12 ay
  -- Ocak
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-01-15', 'Personel Brüt Ücret - Ocak 2025', -104136.63, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-01-15', 'İşveren SGK+İşsizlik Primi - Ocak 2025', -23691.08, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Şubat
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-02-15', 'Personel Brüt Ücret - Şubat 2025', -107632.40, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-02-15', 'İşveren SGK+İşsizlik Primi - Şubat 2025', -24486.37, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Mart
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-03-15', 'Personel Brüt Ücret - Mart 2025', -114175.37, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-03-15', 'İşveren SGK+İşsizlik Primi - Mart 2025', -25974.90, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Nisan
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-04-15', 'Personel Brüt Ücret - Nisan 2025', -122856.92, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-04-15', 'İşveren SGK+İşsizlik Primi - Nisan 2025', -27952.95, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Mayıs
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-05-15', 'Personel Brüt Ücret - Mayıs 2025', -128705.74, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-05-15', 'İşveren SGK+İşsizlik Primi - Mayıs 2025', -29283.56, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Haziran
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-06-15', 'Personel Brüt Ücret - Haziran 2025', -131102.41, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-06-15', 'İşveren SGK+İşsizlik Primi - Haziran 2025', -29828.80, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Temmuz
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-07-15', 'Personel Brüt Ücret - Temmuz 2025', -133870.94, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-07-15', 'İşveren SGK+İşsizlik Primi - Temmuz 2025', -30458.64, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Ağustos
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-08-15', 'Personel Brüt Ücret - Ağustos 2025', -136122.23, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-08-15', 'İşveren SGK+İşsizlik Primi - Ağustos 2025', -30970.81, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Eylül
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-09-15', 'Personel Brüt Ücret - Eylül 2025', -137913.36, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-09-15', 'İşveren SGK+İşsizlik Primi - Eylül 2025', -31378.29, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Ekim
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-10-15', 'Personel Brüt Ücret - Ekim 2025', -139714.18, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-10-15', 'İşveren SGK+İşsizlik Primi - Ekim 2025', -31787.47, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Kasım
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-11-15', 'Personel Brüt Ücret - Kasım 2025', -141303.22, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-11-15', 'İşveren SGK+İşsizlik Primi - Kasım 2025', -32149.98, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- Aralık
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-12-15', 'Personel Brüt Ücret - Aralık 2025', -157367.28, v_personel_ucret_id, false, true, false, false, v_user_id);
  INSERT INTO bank_transactions (transaction_date, description, amount, category_id, is_commercial, is_manually_categorized, is_income, is_excluded, user_id)
  VALUES ('2025-12-15', 'İşveren SGK+İşsizlik Primi - Aralık 2025', -35801.06, v_personel_isveren_id, false, true, false, false, v_user_id);
  
  -- 2025 Payroll Accruals (Bilanço verileri)
  INSERT INTO payroll_accruals (user_id, year, month, gross_salary, employer_contribution, net_payable, income_tax_payable, stamp_tax_payable, employee_sgk_payable, employer_sgk_payable)
  VALUES 
    (v_user_id, 2025, 1, 104136.63, 23691.08, 77961.40, 9961.72, 593.02, 15620.49, 23691.08),
    (v_user_id, 2025, 2, 107632.40, 24486.37, 79360.38, 11507.83, 619.33, 16144.86, 24486.37),
    (v_user_id, 2025, 3, 114175.37, 25974.90, 81390.98, 14989.09, 668.99, 17126.31, 25974.90),
    (v_user_id, 2025, 4, 122856.92, 27952.95, 83624.86, 20069.02, 734.50, 18428.54, 27952.95),
    (v_user_id, 2025, 5, 128705.74, 29283.56, 85050.68, 23570.42, 778.78, 19305.86, 29283.56),
    (v_user_id, 2025, 6, 131102.41, 29828.80, 86519.62, 24120.57, 796.86, 19665.36, 29828.80),
    (v_user_id, 2025, 7, 133870.94, 30458.64, 88216.48, 24756.30, 817.52, 20080.64, 30458.64),
    (v_user_id, 2025, 8, 136122.23, 30970.81, 89596.32, 25272.97, 834.61, 20418.33, 30970.81),
    (v_user_id, 2025, 9, 137913.36, 31378.29, 90694.12, 25684.04, 848.20, 20687.00, 31378.29),
    (v_user_id, 2025, 10, 139714.18, 31787.47, 91797.86, 26097.34, 861.85, 20957.13, 31787.47),
    (v_user_id, 2025, 11, 141303.22, 32149.98, 92771.80, 26460.83, 875.11, 21195.48, 32149.98),
    (v_user_id, 2025, 12, 157367.28, 35801.06, 93685.02, 39080.13, 997.04, 23605.09, 35801.06);
  
  RAISE NOTICE 'Successfully inserted 2025 personnel data for user %', v_user_id;
END $$;