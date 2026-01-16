-- Add partner_receivables_capital field to financial_settings
ALTER TABLE public.financial_settings 
ADD COLUMN IF NOT EXISTS partner_receivables_capital numeric DEFAULT 0;

-- Update unpaid_capital to 0 and set partner_receivables_capital to 100000 for existing user
UPDATE public.financial_settings 
SET unpaid_capital = 0, 
    partner_receivables_capital = 100000 
WHERE user_id = '8de85cec-cb06-4d8f-aa41-72f22c04eae1';