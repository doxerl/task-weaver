-- Financial Settings tablosu (Bilanço için sermaye ve geçmiş yıl kârları)
CREATE TABLE public.financial_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  paid_capital NUMERIC DEFAULT 0,
  retained_earnings NUMERIC DEFAULT 0,
  fiscal_year_start INTEGER DEFAULT 1,
  cash_on_hand NUMERIC DEFAULT 0,
  inventory_value NUMERIC DEFAULT 0,
  equipment_value NUMERIC DEFAULT 0,
  vehicles_value NUMERIC DEFAULT 0,
  accumulated_depreciation NUMERIC DEFAULT 0,
  bank_loans NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.financial_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.financial_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.financial_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Balance Sheet Items tablosu (Manuel bilanço kalemleri için)
CREATE TABLE public.balance_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ASSET', 'LIABILITY', 'EQUITY')),
  subcategory TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  amount NUMERIC DEFAULT 0,
  as_of_date DATE NOT NULL,
  year INTEGER NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.balance_sheet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balance sheet items"
  ON public.balance_sheet_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance sheet items"
  ON public.balance_sheet_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance sheet items"
  ON public.balance_sheet_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own balance sheet items"
  ON public.balance_sheet_items FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger for financial_settings
CREATE TRIGGER update_financial_settings_updated_at
  BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated at trigger for balance_sheet_items
CREATE TRIGGER update_balance_sheet_items_updated_at
  BEFORE UPDATE ON public.balance_sheet_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();