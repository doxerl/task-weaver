-- Bilanço için manuel giriş alanları
ALTER TABLE financial_settings 
ADD COLUMN IF NOT EXISTS trade_receivables DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_payables DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN financial_settings.trade_receivables IS 'Ticari Alacaklar - Manuel giriş (fatura eşleştirmesi olmadan)';
COMMENT ON COLUMN financial_settings.trade_payables IS 'Ticari Borçlar - Manuel giriş (fatura eşleştirmesi olmadan)';