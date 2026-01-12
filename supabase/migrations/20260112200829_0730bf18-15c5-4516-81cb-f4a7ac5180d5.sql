-- Yeni GELİR kategorileri
INSERT INTO transaction_categories (name, code, type, color, icon, keywords, vendor_patterns, is_system, is_active, sort_order)
VALUES 
('Eğitim Geliri', 'EGITIM_IN', 'INCOME', '#10b981', '📚', ARRAY['EĞİTİM', 'SEMİNER', 'WORKSHOP', 'KURS'], ARRAY[]::text[], true, true, 107),
('Rapor/Belge Geliri', 'RAPOR', 'INCOME', '#6366f1', '📄', ARRAY['RAPOR', 'BELGE', 'SERTİFİKA'], ARRAY[]::text[], true, true, 108),
('Faiz Geliri', 'FAIZ_IN', 'INCOME', '#f59e0b', '💰', ARRAY['FAİZ', 'REPO', 'MEVDUAT', 'FAİZ GELİRİ'], ARRAY[]::text[], true, true, 109),
('Kira Geliri', 'KIRA_IN', 'INCOME', '#8b5cf6', '🏠', ARRAY['KİRA GELİRİ', 'KİRA ALACAK'], ARRAY[]::text[], true, true, 110),
('Lisans/Telif', 'LISANS', 'INCOME', '#ec4899', '©️', ARRAY['LİSANS', 'TELİF', 'ROYALTY', 'PATENT'], ARRAY[]::text[], true, true, 111),
('Diğer Gelirler', 'DIGER_IN', 'INCOME', '#6b7280', '➕', ARRAY[]::text[], ARRAY[]::text[], true, true, 199);

-- Yeni GİDER kategorileri
INSERT INTO transaction_categories (name, code, type, color, icon, keywords, vendor_patterns, is_system, is_active, sort_order)
VALUES 
('Kira Gideri', 'KIRA_OUT', 'EXPENSE', '#7c3aed', '🏢', ARRAY['KİRA', 'OFİS KİRA', 'DEPO KİRA', 'İŞYERİ KİRA'], ARRAY[]::text[], true, true, 201),
('Personel', 'PERSONEL', 'EXPENSE', '#0891b2', '👥', ARRAY['MAAŞ', 'SSK', 'SGK', 'PRİM', 'BORDRO', 'ÜCRETİ', 'ÇALIŞAN'], ARRAY[]::text[], true, true, 202),
('Eğitim/Gelişim', 'EGITIM_OUT', 'EXPENSE', '#059669', '🎓', ARRAY['EĞİTİM', 'KURS', 'SERTİFİKA', 'GELİŞİM'], ARRAY['UDEMY', 'COURSERA', 'LINKEDIN LEARNING']::text[], true, true, 203),
('Yazılım/Abonelik', 'YAZILIM', 'EXPENSE', '#2563eb', '💻', ARRAY['YAZILIM', 'SAAS', 'CLOUD', 'LİSANS', 'ABONELİK'], ARRAY['MICROSOFT', 'GOOGLE', 'ZOOM', 'SLACK', 'ADOBE', 'NOTION', 'FIGMA']::text[], true, true, 204),
('Muhasebe', 'MUHASEBE', 'EXPENSE', '#64748b', '📒', ARRAY['MUHASEBE', 'SMMM', 'YMM', 'MALİ MÜŞAVİR'], ARRAY[]::text[], true, true, 205),
('Hukuk', 'HUKUK', 'EXPENSE', '#991b1b', '⚖️', ARRAY['AVUKAT', 'NOTER', 'HUKUK', 'VEKİL', 'DAVA'], ARRAY[]::text[], true, true, 206),
('Vergi', 'VERGI', 'EXPENSE', '#b91c1c', '🧾', ARRAY['VERGİ', 'KDV', 'STOPAJ', 'MTV', 'GELİR VERGİSİ', 'KURUMLAR'], ARRAY['VERGİ DAİRESİ', 'GİB']::text[], true, true, 207),
('Bakım/Onarım', 'BAKIM', 'EXPENSE', '#78716c', '🔧', ARRAY['TAMİR', 'BAKIM', 'SERVİS', 'ONARIM', 'ARIZA'], ARRAY[]::text[], true, true, 208),
('Temsil/Ağırlama', 'TEMSIL', 'EXPENSE', '#f472b6', '🎁', ARRAY['HEDİYE', 'ÇELENK', 'TEMSİL', 'AĞIRLAMA', 'İKRAM'], ARRAY[]::text[], true, true, 209),
('Aidat/Üyelik', 'AIDAT', 'EXPENSE', '#a855f7', '📋', ARRAY['AİDAT', 'ÜYELİK', 'ODA', 'DERNEK', 'BİRLİK'], ARRAY[]::text[], true, true, 210),
('Kargo/Nakliye', 'KARGO', 'EXPENSE', '#ea580c', '📦', ARRAY['KARGO', 'NAKLİYE', 'GÖNDERİM', 'KURYE', 'TAŞIMA'], ARRAY['ARAS', 'MNG', 'YURTİÇİ', 'UPS', 'DHL', 'FEDEX', 'PTT']::text[], true, true, 211),
('Diğer Giderler', 'DIGER_OUT', 'EXPENSE', '#6b7280', '➖', ARRAY[]::text[], ARRAY[]::text[], true, true, 299);

-- Yeni FİNANSMAN kategorileri
INSERT INTO transaction_categories (name, code, type, color, icon, keywords, vendor_patterns, is_system, is_active, sort_order)
VALUES 
('Faiz Gideri', 'FAIZ_OUT', 'FINANCING', '#dc2626', '📉', ARRAY['FAİZ GİDERİ', 'TEMERRÜT', 'GECİKME FAİZİ'], ARRAY[]::text[], true, true, 402),
('Leasing', 'LEASING', 'FINANCING', '#0d9488', '🚛', ARRAY['LEASİNG', 'KİRALAMA', 'FİNANSAL KİRALAMA'], ARRAY[]::text[], true, true, 403),
('Faktoring', 'FAKTORING', 'FINANCING', '#4f46e5', '🔄', ARRAY['FAKTORİNG', 'ALACAK'], ARRAY[]::text[], true, true, 404);

-- Yeni YATIRIM kategorileri
INSERT INTO transaction_categories (name, code, type, color, icon, keywords, vendor_patterns, is_system, is_active, sort_order)
VALUES 
('Ekipman/Makine', 'EKIPMAN', 'INVESTMENT', '#475569', '⚙️', ARRAY['EKİPMAN', 'MAKİNE', 'CİHAZ', 'DEMİRBAŞ'], ARRAY[]::text[], true, true, 502),
('Gayrimenkul', 'GAYRIMENKUL', 'INVESTMENT', '#1e3a5f', '🏗️', ARRAY['OFİS', 'DEPO', 'ARSA', 'BİNA', 'TAŞINMAZ'], ARRAY[]::text[], true, true, 503),
('Hisse/Ortaklık', 'HISSE', 'INVESTMENT', '#166534', '📈', ARRAY['HİSSE', 'ORTAKLIK', 'ŞİRKET', 'SERMAYE'], ARRAY[]::text[], true, true, 504);

-- Mevcut kategorilerin keywords güncellemesi
UPDATE transaction_categories 
SET keywords = array_cat(keywords, ARRAY['KONAKLAMA', 'TRANSFER', 'UÇAK', 'OTOBÜS'])
WHERE code = 'SEYAHAT' AND is_system = true;

UPDATE transaction_categories 
SET keywords = array_cat(keywords, ARRAY['TRAFİK', 'SAĞLIK', 'KASKO', 'DASK'])
WHERE code = 'SIGORTA' AND is_system = true;

UPDATE transaction_categories 
SET keywords = array_cat(keywords, ARRAY['INTERNET', 'WIFI', 'DATA', 'GSM'])
WHERE code = 'TELEKOM' AND is_system = true;