-- ═══════════════════════════════════════════════════════════════════════════
-- ALFA ZEN KATEGORİLENDİRME SİSTEMİ - TEHLİKELİ KEYWORDS TEMİZLİĞİ
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ORTAK kategorileri: Keyword OLMAMALI (user_category_rules ile yönetilmeli)
UPDATE transaction_categories SET keywords = '{}' WHERE code IN ('ORTAK_OUT', 'ORTAK_IN');

-- 2. HISSE: Çok genel kelimeleri kaldır (ŞİRKET, ORTAKLIK firma adlarında geçiyor)
UPDATE transaction_categories SET keywords = ARRAY[
  'HİSSE ALIM', 'HİSSE SATIM', 'HİSSE DEVİR', 
  'SERMAYE ARTIRIMI', 'SERMAYE AZALTIMI',
  'ORTAKLIK PAYI DEVRİ', 'PAY DEVRİ', 
  'TEMETTÜ', 'KAR PAYI DAĞITIM', 'DIVIDEND'
] WHERE code = 'HISSE';

-- 3. SBT: Daraltılmış keywords (EMISSION, GHG, SCOPE kaldırıldı - çok genel)
UPDATE transaction_categories SET keywords = ARRAY[
  'SBT', 'SBT TRACKER', 'KARBON', 'KARBON YÖNETİM', 
  'YAZILIM HİZMET', 'YAZILIM HİZ BED', 'YAZ HIZ BED',
  'SBT YAZ', 'SBT YAZILIM', 'TRACKER YAZ'
] WHERE code = 'SBT';

-- 4. L&S: Leadership keywords
UPDATE transaction_categories SET keywords = ARRAY[
  'LEADERSHIP', 'LEADERSHİP', 'L&S', 'L%S',
  'PERFORMANCE VERIFICATION', 'PERF VER', 
  'SUSTAINABILITY AUDIT', 'SUST AUDIT',
  'L&S DENETIM', 'L&S DENETİM', 'L&S HIZ', 'L&S HİZ'
] WHERE code = 'L&S';

-- 5. ZDHC: InCheck keywords
UPDATE transaction_categories SET keywords = ARRAY[
  'ZDHC', 'INCHECK', 'IN CHECK', 'IN-CHECK',
  'MRSL', 'GATEWAY', 'KİMYASAL DOĞRULAMA', 'KIMYASAL DOG',
  'CHEMICAL VERIFICATION', 'CHEM VER',
  'ZDHC DOĞ', 'ZDHC DOĞRULAMA', 'ZDHC VER'
] WHERE code = 'ZDHC';

-- 6. EĞİTİM: Sadece gerçek eğitim hizmetleri (firma adı DEĞİL - "ALFA ZEN EĞİTİM" tuzağı)
UPDATE transaction_categories SET keywords = ARRAY[
  'EĞİTİM HİZMET BEDELİ', 'EĞİTİM HIZ BED', 
  'TRAINING FEE', 'TRAINING SERVICE',
  'SEMİNER KATILIM', 'WORKSHOP FEE', 'KURS ÜCRETİ'
] WHERE code = 'EGITIM_IN';

-- 7. Tehlikeli kısa/genel keywordler temizliği
-- HGS: "TL" ve "PO" çok genel
UPDATE transaction_categories
SET keywords = array_remove(array_remove(keywords, 'TL'), 'PO')
WHERE code = 'HGS';

-- TELEKOM: "TEL", "INT", "MOB" çok genel
UPDATE transaction_categories
SET keywords = array_remove(array_remove(array_remove(keywords, 'TEL'), 'INT'), 'MOB')
WHERE code = 'TELEKOM';

-- SEYAHAT: "TUR" ve "TRF" çok genel
UPDATE transaction_categories
SET keywords = array_remove(array_remove(keywords, 'TUR'), 'TRF')
WHERE code = 'SEYAHAT';

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. match_priority kolonu - Kategori eşleştirme önceliği
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE transaction_categories ADD COLUMN IF NOT EXISTS match_priority INTEGER DEFAULT 100;

-- Spesifik kategoriler önce
UPDATE transaction_categories SET match_priority = 5 WHERE code = 'BANKA';
UPDATE transaction_categories SET match_priority = 10 WHERE code IN ('FAIZ_OUT', 'KREDI_OUT');
UPDATE transaction_categories SET match_priority = 15 WHERE code IN ('SIGORTA', 'HGS', 'TELEKOM');
UPDATE transaction_categories SET match_priority = 20 WHERE code IN ('VERGI', 'MUHASEBE', 'HUKUK');
UPDATE transaction_categories SET match_priority = 25 WHERE code IN ('KARGO', 'YAZILIM');
UPDATE transaction_categories SET match_priority = 30 WHERE code IN ('L&S', 'SBT', 'ZDHC');
UPDATE transaction_categories SET match_priority = 40 WHERE code = 'DANIS';
UPDATE transaction_categories SET match_priority = 50 WHERE code = 'EGITIM_IN';
UPDATE transaction_categories SET match_priority = 90 WHERE code IN ('DIGER_OUT', 'DIGER_IN');
UPDATE transaction_categories SET match_priority = 999 WHERE code IN ('ORTAK_OUT', 'ORTAK_IN', 'HISSE', 'IC_TRANSFER');