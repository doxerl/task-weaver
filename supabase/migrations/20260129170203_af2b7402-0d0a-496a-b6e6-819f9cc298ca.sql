-- Yearly Income Statements table for official income statement data
CREATE TABLE yearly_income_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  
  -- 60x Brüt Satışlar
  gross_sales_domestic NUMERIC DEFAULT 0,      -- 600 Yurtiçi Satışlar
  gross_sales_export NUMERIC DEFAULT 0,        -- 601 Yurtdışı Satışlar
  gross_sales_other NUMERIC DEFAULT 0,         -- 602 Diğer Gelirler
  
  -- 61x Satış İndirimleri
  sales_returns NUMERIC DEFAULT 0,             -- 610 Satıştan İadeler
  sales_discounts NUMERIC DEFAULT 0,           -- 611 Satış İskontoları
  
  -- 62x Satışların Maliyeti
  cost_of_goods_sold NUMERIC DEFAULT 0,        -- 620 Satılan Mamul Maliyeti
  cost_of_merchandise_sold NUMERIC DEFAULT 0,  -- 621 Satılan Ticari Mal Maliyeti
  cost_of_services_sold NUMERIC DEFAULT 0,     -- 622 Satılan Hizmet Maliyeti
  
  -- 63x Faaliyet Giderleri
  rd_expenses NUMERIC DEFAULT 0,               -- 630 Ar-Ge Giderleri
  marketing_expenses NUMERIC DEFAULT 0,        -- 631 Pazarlama Satış Dağıtım
  general_admin_expenses NUMERIC DEFAULT 0,    -- 632 Genel Yönetim Giderleri
  
  -- 64x Diğer Faaliyet Gelirleri
  dividend_income NUMERIC DEFAULT 0,           -- 640 İştiraklerden Temettü
  interest_income NUMERIC DEFAULT 0,           -- 642 Faiz Gelirleri
  commission_income NUMERIC DEFAULT 0,         -- 643 Komisyon Gelirleri
  fx_gain NUMERIC DEFAULT 0,                   -- 646 Kambiyo Karları
  revaluation_gain NUMERIC DEFAULT 0,          -- 647 Reeskont Faiz Gelirleri
  other_income NUMERIC DEFAULT 0,              -- 649 Diğer Olağan Gelirler
  
  -- 65x Diğer Faaliyet Giderleri
  commission_expenses NUMERIC DEFAULT 0,       -- 653 Komisyon Giderleri
  provisions_expense NUMERIC DEFAULT 0,        -- 654 Karşılık Giderleri
  fx_loss NUMERIC DEFAULT 0,                   -- 656 Kambiyo Zararları
  revaluation_loss NUMERIC DEFAULT 0,          -- 657 Reeskont Faiz Giderleri
  other_expenses NUMERIC DEFAULT 0,            -- 659 Diğer Olağan Giderler
  
  -- 66x Finansman Giderleri
  short_term_finance_exp NUMERIC DEFAULT 0,    -- 660 Kısa Vadeli Borçlanma
  long_term_finance_exp NUMERIC DEFAULT 0,     -- 661 Uzun Vadeli Borçlanma
  
  -- 67x Olağandışı Gelirler
  prior_period_income NUMERIC DEFAULT 0,       -- 671 Önceki Dönem Gelir/Karları
  other_extraordinary_income NUMERIC DEFAULT 0,-- 679 Diğer Olağandışı Gelirler
  
  -- 68x Olağandışı Giderler
  prior_period_expenses NUMERIC DEFAULT 0,     -- 681 Önceki Dönem Gider/Zararları
  other_extraordinary_exp NUMERIC DEFAULT 0,   -- 689 Diğer Olağandışı Giderler
  
  -- 69x Dönem Net Karı/Zararı
  corporate_tax NUMERIC DEFAULT 0,             -- 691 Dönem Karı Vergi Karşılığı
  deferred_tax_expense NUMERIC DEFAULT 0,      -- 692 Ertelenmiş Vergi Gideri
  
  -- Hesaplanmış Toplamlar
  net_sales NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  operating_profit NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  
  notes TEXT,
  source TEXT DEFAULT 'manual',
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, year)
);

-- Official Trial Balances (Mizan) table
CREATE TABLE official_trial_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,
  
  accounts JSONB NOT NULL DEFAULT '{}',
  
  file_name TEXT,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, year, month)
);

-- Enable RLS
ALTER TABLE yearly_income_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_trial_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for yearly_income_statements
CREATE POLICY "Users can view own income statements"
  ON yearly_income_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income statements"
  ON yearly_income_statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income statements"
  ON yearly_income_statements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income statements"
  ON yearly_income_statements FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for official_trial_balances
CREATE POLICY "Users can view own trial balances"
  ON official_trial_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trial balances"
  ON official_trial_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trial balances"
  ON official_trial_balances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trial balances"
  ON official_trial_balances FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_yearly_income_statements_updated_at
  BEFORE UPDATE ON yearly_income_statements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_official_trial_balances_updated_at
  BEFORE UPDATE ON official_trial_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();