-- Add depreciation calculation columns to financial_settings
ALTER TABLE public.financial_settings 
ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(20) DEFAULT 'straight_line',
ADD COLUMN IF NOT EXISTS vehicles_purchase_date DATE,
ADD COLUMN IF NOT EXISTS vehicles_useful_life_years INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS fixtures_purchase_date DATE,
ADD COLUMN IF NOT EXISTS fixtures_useful_life_years INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS equipment_purchase_date DATE,
ADD COLUMN IF NOT EXISTS equipment_useful_life_years INTEGER DEFAULT 5;