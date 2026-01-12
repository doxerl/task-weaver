-- Add missing categories for Alfa Zen 2025 test data
INSERT INTO transaction_categories (name, code, type, color, icon, is_system, is_active, sort_order) VALUES
-- Missing INCOME categories
('Denetim Masrafı', 'MASRAF', 'INCOME', '#f59e0b', '📋', true, true, 6),
('Bayilik Gelirleri', 'BAYI', 'INCOME', '#8b5cf6', '🏪', true, true, 7),
-- Missing EXPENSE categories
('Yönlendirme Hizmeti', 'YONL', 'EXPENSE', '#ec4899', '🔄', true, true, 19),
('Harici Danışmanlık', 'HARICI', 'EXPENSE', '#8b5cf6', '📋', true, true, 20),
('Danışmanlık Gideri', 'DANIS_OUT', 'EXPENSE', '#6366f1', '📝', true, true, 21),
('Müşteri İadesi', 'IADE', 'EXPENSE', '#f97316', '↩️', true, true, 22)
ON CONFLICT DO NOTHING;