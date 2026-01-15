-- Add depreciation fields to transaction_categories
ALTER TABLE transaction_categories
ADD COLUMN IF NOT EXISTS useful_life_years INTEGER,
ADD COLUMN IF NOT EXISTS vuk_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC(5,2);

-- Update existing EKIPMAN category with VUK values
UPDATE transaction_categories 
SET useful_life_years = 10, vuk_code = '5.1', depreciation_rate = 10.00
WHERE code = 'EKIPMAN';

-- Update existing ARAC category with VUK values
UPDATE transaction_categories 
SET useful_life_years = 5, vuk_code = '2.1', depreciation_rate = 20.00
WHERE code = 'ARAC';

-- Insert Demirbaş main category (system category)
INSERT INTO transaction_categories (
  user_id, name, code, type, icon, color, account_code, 
  useful_life_years, vuk_code, depreciation_rate, is_system, is_active
) VALUES (
  NULL, 'Demirbaş', 'DEMIRBAS', 'INVESTMENT', '🪑', '#8B5CF6', '255',
  5, '3.1', 20.00, true, true
) ON CONFLICT DO NOTHING;

-- Get DEMIRBAS category id for parent reference
DO $$
DECLARE
  demirbas_id UUID;
BEGIN
  SELECT id INTO demirbas_id FROM transaction_categories WHERE code = 'DEMIRBAS' AND is_system = true LIMIT 1;
  
  -- Insert Cep Telefonu - 3 yıl (VUK 3.3)
  INSERT INTO transaction_categories (
    user_id, name, code, type, icon, color, account_code,
    useful_life_years, vuk_code, depreciation_rate, is_system, is_active, parent_category_id, depth
  ) VALUES (
    NULL, 'Cep Telefonu', 'TELEFON', 'INVESTMENT', '📱', '#10B981', '255',
    3, '3.3', 33.33, true, true, demirbas_id, 1
  ) ON CONFLICT DO NOTHING;
  
  -- Insert Bilgisayar/Laptop - 4 yıl (VUK 4.1)
  INSERT INTO transaction_categories (
    user_id, name, code, type, icon, color, account_code,
    useful_life_years, vuk_code, depreciation_rate, is_system, is_active, parent_category_id, depth
  ) VALUES (
    NULL, 'Bilgisayar/Laptop', 'BILGISAYAR', 'INVESTMENT', '💻', '#3B82F6', '255',
    4, '4.1', 25.00, true, true, demirbas_id, 1
  ) ON CONFLICT DO NOTHING;
  
  -- Insert Televizyon - 5 yıl (VUK 3.1)
  INSERT INTO transaction_categories (
    user_id, name, code, type, icon, color, account_code,
    useful_life_years, vuk_code, depreciation_rate, is_system, is_active, parent_category_id, depth
  ) VALUES (
    NULL, 'Televizyon', 'TV', 'INVESTMENT', '📺', '#F59E0B', '255',
    5, '3.1', 20.00, true, true, demirbas_id, 1
  ) ON CONFLICT DO NOTHING;
END $$;