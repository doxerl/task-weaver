
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS amount_try numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric;

UPDATE public.bank_transactions SET amount_try = amount WHERE amount_try IS NULL;

ALTER TABLE public.bank_import_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS amount_try numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_file_id uuid,
  ADD COLUMN IF NOT EXISTS source_bank text;

UPDATE public.bank_import_transactions SET amount_try = amount WHERE amount_try IS NULL;

ALTER TABLE public.bank_import_sessions
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS file_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source_files jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.uploaded_bank_files
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TRY';
