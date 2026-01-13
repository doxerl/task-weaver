-- Add expense_behavior column to transaction_categories
ALTER TABLE transaction_categories 
ADD COLUMN IF NOT EXISTS expense_behavior text DEFAULT 'variable';

-- Update existing categories with appropriate behavior
UPDATE transaction_categories SET expense_behavior = 'fixed' WHERE code IN ('KREDI_OUT', 'SIGORTA', 'KIRA_OUT', 'PERSONEL', 'LEASING_OUT');
UPDATE transaction_categories SET expense_behavior = 'semi_fixed' WHERE code IN ('TELEKOM', 'MUHASEBE', 'YAZILIM');

-- Create fixed_expense_definitions table for tracking recurring fixed expenses
CREATE TABLE public.fixed_expense_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  category_id uuid REFERENCES transaction_categories(id),
  expense_name text NOT NULL,
  expense_type text NOT NULL DEFAULT 'fixed', -- 'fixed', 'semi_fixed', 'installment'
  monthly_amount numeric,
  total_amount numeric,
  installment_months integer,
  installments_paid integer DEFAULT 0,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_expense_definitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own fixed expense definitions" 
ON public.fixed_expense_definitions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed expense definitions" 
ON public.fixed_expense_definitions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed expense definitions" 
ON public.fixed_expense_definitions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed expense definitions" 
ON public.fixed_expense_definitions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_fixed_expense_definitions_updated_at
BEFORE UPDATE ON public.fixed_expense_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();