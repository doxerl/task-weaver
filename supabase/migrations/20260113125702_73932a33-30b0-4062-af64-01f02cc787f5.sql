-- ═══════════════════════════════════════════════════════════════════════════
-- TEHLİKELİ KEYWORDS TEMİZLİĞİ - TÜM KATEGORİLER
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. SEYAHAT: TRANSFER varyasyonlarını kaldır (KRİTİK!)
UPDATE transaction_categories
SET keywords = array_remove(
  array_remove(
    array_remove(keywords, 'TRANSFER'), 
    'TRANSFERİ'),
  'TRNSFR')
WHERE code = 'SEYAHAT';

-- 2. FAKTORING: "ALACAK" çok genel
UPDATE transaction_categories
SET keywords = array_remove(keywords, 'ALACAK')
WHERE code = 'FAKTORING';

-- 3. KREDI_IN: "OD" çok kısa ("ÖDEME" ile çakışır)
UPDATE transaction_categories
SET keywords = array_remove(keywords, 'OD')
WHERE code = 'KREDI_IN';

-- 4. VERGI: "FEE" İngilizce, her yerde var
UPDATE transaction_categories
SET keywords = array_remove(keywords, 'FEE')
WHERE code = 'VERGI';

-- 5. MUHASEBE: "ACCT" çok genel
UPDATE transaction_categories
SET keywords = array_remove(keywords, 'ACCT')
WHERE code = 'MUHASEBE';

-- 6. DANIS: "HZM" çok kısa/genel
UPDATE transaction_categories
SET keywords = array_remove(keywords, 'HZM')
WHERE code = 'DANIS';

-- 7. FUAR: Çok kısa keywords
UPDATE transaction_categories
SET keywords = array_remove(array_remove(array_remove(keywords, 'FR'), 'ADV'), 'TM')
WHERE code = 'FUAR';

-- 8. HARICI: Çok kısa keywords
UPDATE transaction_categories
SET keywords = array_remove(array_remove(keywords, 'HRC'), 'EXT')
WHERE code = 'HARICI';

-- 9. IADE: Çok kısa olanları kaldır
UPDATE transaction_categories
SET keywords = array_remove(array_remove(array_remove(keywords, 'İAD'), 'IAD'), 'CB')
WHERE code = 'IADE';

-- 10. EXCLUDED: Çok kısa/tehlikeli keywords
UPDATE transaction_categories
SET keywords = array_remove(
  array_remove(
    array_remove(
      array_remove(keywords, 'REV'), 
      'TST'), 
    'DNM'),
  'TD')
WHERE code = 'EXCLUDED';

-- 11. SEYAHAT: Ek kısa keywordler
UPDATE transaction_categories
SET keywords = array_remove(array_remove(keywords, 'TRV'), 'SEY')
WHERE code = 'SEYAHAT';