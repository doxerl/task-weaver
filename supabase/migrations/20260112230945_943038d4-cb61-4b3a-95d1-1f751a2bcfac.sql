-- =====================================================
-- BANK IMPORT SESSIONS - Yükleme oturumları tablosu
-- =====================================================
CREATE TABLE public.bank_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Dosya bilgileri
  file_name TEXT NOT NULL,
  file_hash TEXT,
  file_id UUID REFERENCES public.uploaded_bank_files(id) ON DELETE SET NULL,
  
  -- Durum
  status TEXT NOT NULL DEFAULT 'parsing' CHECK (status IN ('parsing', 'categorizing', 'review', 'approved', 'cancelled')),
  
  -- İstatistikler
  total_transactions INTEGER DEFAULT 0,
  categorized_count INTEGER DEFAULT 0,
  low_confidence_count INTEGER DEFAULT 0,
  
  -- Özet (hızlı erişim)
  total_income DECIMAL(15,2) DEFAULT 0,
  total_expense DECIMAL(15,2) DEFAULT 0,
  
  -- Banka bilgisi
  detected_bank TEXT,
  date_range_start DATE,
  date_range_end DATE,
  
  -- AI maliyet takibi
  ai_tokens_used INTEGER DEFAULT 0,
  ai_cost_usd DECIMAL(10,4) DEFAULT 0,
  
  -- Zaman damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.bank_import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.bank_import_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.bank_import_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.bank_import_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.bank_import_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Index'ler
CREATE INDEX idx_bank_import_sessions_user ON public.bank_import_sessions(user_id);
CREATE INDEX idx_bank_import_sessions_status ON public.bank_import_sessions(status);
CREATE INDEX idx_bank_import_sessions_created ON public.bank_import_sessions(created_at DESC);
CREATE INDEX idx_bank_import_sessions_hash ON public.bank_import_sessions(file_hash) WHERE file_hash IS NOT NULL;

-- =====================================================
-- BANK IMPORT TRANSACTIONS - AI kategorileme sonuçları
-- =====================================================
CREATE TABLE public.bank_import_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.bank_import_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Orijinal banka verisi
  row_number INTEGER NOT NULL,
  transaction_date DATE NOT NULL,
  original_date TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  original_amount TEXT,
  balance DECIMAL(15,2),
  reference TEXT,
  counterparty TEXT,
  transaction_type TEXT,
  channel TEXT,
  
  -- AI kategorileme sonucu
  ai_category_code TEXT,
  ai_category_type TEXT CHECK (ai_category_type IS NULL OR ai_category_type IN ('INCOME', 'EXPENSE', 'PARTNER', 'INVESTMENT', 'FINANCING', 'EXCLUDED')),
  ai_confidence DECIMAL(3,2) DEFAULT 0,
  ai_reasoning TEXT,
  ai_affects_pnl BOOLEAN,
  ai_balance_impact TEXT CHECK (ai_balance_impact IS NULL OR ai_balance_impact IN ('equity_increase', 'equity_decrease', 'asset_increase', 'liability_increase', 'none')),
  ai_counterparty TEXT,
  
  -- Kullanıcı düzeltmesi
  user_category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  user_modified BOOLEAN DEFAULT FALSE,
  user_notes TEXT,
  
  -- Final kategori (AI veya kullanıcı)
  final_category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
  
  -- Kontrol durumu
  needs_review BOOLEAN DEFAULT FALSE,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  
  -- Zaman damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.bank_import_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.bank_import_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.bank_import_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.bank_import_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.bank_import_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Index'ler
CREATE INDEX idx_bank_import_tx_session ON public.bank_import_transactions(session_id);
CREATE INDEX idx_bank_import_tx_user ON public.bank_import_transactions(user_id);
CREATE INDEX idx_bank_import_tx_date ON public.bank_import_transactions(transaction_date);
CREATE INDEX idx_bank_import_tx_needs_review ON public.bank_import_transactions(needs_review) WHERE needs_review = TRUE;
CREATE INDEX idx_bank_import_tx_confidence ON public.bank_import_transactions(ai_confidence);
CREATE INDEX idx_bank_import_tx_uncategorized ON public.bank_import_transactions(session_id) WHERE ai_category_code IS NULL;

-- =====================================================
-- TRIGGERS - updated_at otomatik güncelleme
-- =====================================================
CREATE TRIGGER update_bank_import_sessions_updated_at
  BEFORE UPDATE ON public.bank_import_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_import_transactions_updated_at
  BEFORE UPDATE ON public.bank_import_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();