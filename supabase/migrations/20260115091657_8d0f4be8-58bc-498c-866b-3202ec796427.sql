-- Create yearly_balance_sheets table for locked/official balance sheets
CREATE TABLE public.yearly_balance_sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  -- AKTİF (Assets)
  cash_on_hand NUMERIC DEFAULT 0,
  bank_balance NUMERIC DEFAULT 0,
  trade_receivables NUMERIC DEFAULT 0,
  partner_receivables NUMERIC DEFAULT 0,
  vat_receivable NUMERIC DEFAULT 0,
  other_vat NUMERIC DEFAULT 0,
  inventory NUMERIC DEFAULT 0,
  vehicles NUMERIC DEFAULT 0,
  fixtures NUMERIC DEFAULT 0,
  equipment NUMERIC DEFAULT 0,
  accumulated_depreciation NUMERIC DEFAULT 0,
  total_assets NUMERIC DEFAULT 0,
  -- PASİF (Liabilities)
  trade_payables NUMERIC DEFAULT 0,
  partner_payables NUMERIC DEFAULT 0,
  personnel_payables NUMERIC DEFAULT 0,
  tax_payables NUMERIC DEFAULT 0,
  social_security_payables NUMERIC DEFAULT 0,
  vat_payable NUMERIC DEFAULT 0,
  deferred_tax_liabilities NUMERIC DEFAULT 0,
  tax_provision NUMERIC DEFAULT 0,
  short_term_loan_debt NUMERIC DEFAULT 0,
  bank_loans NUMERIC DEFAULT 0,
  -- ÖZKAYNAK (Equity)
  paid_capital NUMERIC DEFAULT 0,
  unpaid_capital NUMERIC DEFAULT 0,
  retained_earnings NUMERIC DEFAULT 0,
  current_profit NUMERIC DEFAULT 0,
  total_liabilities NUMERIC DEFAULT 0,
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.yearly_balance_sheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own yearly balance sheets"
ON public.yearly_balance_sheets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own yearly balance sheets"
ON public.yearly_balance_sheets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own yearly balance sheets"
ON public.yearly_balance_sheets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own yearly balance sheets"
ON public.yearly_balance_sheets FOR DELETE
USING (auth.uid() = user_id);

-- Update trigger
CREATE TRIGGER update_yearly_balance_sheets_updated_at
BEFORE UPDATE ON public.yearly_balance_sheets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();