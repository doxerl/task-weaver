-- Create monthly exchange rates table
CREATE TABLE public.monthly_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  currency_pair VARCHAR(10) NOT NULL DEFAULT 'USD/TRY',
  rate NUMERIC(10, 4) NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, month, currency_pair)
);

-- Enable RLS
ALTER TABLE public.monthly_exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies - authenticated users can read all rates
CREATE POLICY "Authenticated users can view exchange rates"
  ON public.monthly_exchange_rates FOR SELECT
  TO authenticated USING (true);

-- Authenticated users can insert rates
CREATE POLICY "Authenticated users can insert exchange rates"
  ON public.monthly_exchange_rates FOR INSERT
  TO authenticated WITH CHECK (true);

-- Authenticated users can update rates
CREATE POLICY "Authenticated users can update exchange rates"
  ON public.monthly_exchange_rates FOR UPDATE
  TO authenticated USING (true);

-- Authenticated users can delete rates
CREATE POLICY "Authenticated users can delete exchange rates"
  ON public.monthly_exchange_rates FOR DELETE
  TO authenticated USING (true);

-- Insert 2025 USD/TRY rates (TCMB monthly averages)
INSERT INTO public.monthly_exchange_rates (year, month, currency_pair, rate, source) VALUES
  (2025, 1, 'USD/TRY', 35.4370, 'TCMB'),
  (2025, 2, 'USD/TRY', 36.0729, 'TCMB'),
  (2025, 3, 'USD/TRY', 36.9959, 'TCMB'),
  (2025, 4, 'USD/TRY', 38.0113, 'TCMB'),
  (2025, 5, 'USD/TRY', 38.6594, 'TCMB'),
  (2025, 6, 'USD/TRY', 39.3271, 'TCMB'),
  (2025, 7, 'USD/TRY', 40.0984, 'TCMB'),
  (2025, 8, 'USD/TRY', 40.7256, 'TCMB'),
  (2025, 9, 'USD/TRY', 41.2246, 'TCMB'),
  (2025, 10, 'USD/TRY', 41.7263, 'TCMB'),
  (2025, 11, 'USD/TRY', 42.1690, 'TCMB'),
  (2025, 12, 'USD/TRY', 42.5841, 'TCMB');