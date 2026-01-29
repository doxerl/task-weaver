
## Hibrit Finansal Veri Entegrasyon Sistemi - Detaylı Aksiyon Planı

### Genel Bakış

Mevcut dinamik hesaplama sistemi korunurken, resmi muhasebe verilerinin (Mizan, Bilanço, Gelir Tablosu) hem manuel hem de dosya yükleme ile sisteme aktarılabilmesini sağlayacak hibrit bir yapı oluşturulacak.

---

### Faz 1: Veritabanı Altyapısı

#### 1.1 Yeni Tablo: `yearly_income_statements`

Resmi gelir tablosu verilerini saklamak için:

```sql
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
  
  -- Hesaplanmış Toplamlar (opsiyonel - doğrulama için)
  net_sales NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  operating_profit NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  
  notes TEXT,
  source TEXT DEFAULT 'manual',  -- 'manual' | 'mizan_upload' | 'api'
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, year)
);

-- RLS Policies
ALTER TABLE yearly_income_statements ENABLE ROW LEVEL SECURITY;

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
```

#### 1.2 Yeni Tablo: `official_trial_balances` (Mizan)

Muhasebeciden gelen mizanları saklamak için:

```sql
CREATE TABLE official_trial_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,  -- NULL = yıllık, 1-12 = aylık
  
  -- Mizan verileri JSON olarak (hesap kodu -> tutar)
  accounts JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
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

-- RLS Policies
ALTER TABLE official_trial_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trial balances"
  ON official_trial_balances FOR ALL
  USING (auth.uid() = user_id);
```

---

### Faz 2: Hook'lar ve Veri Katmanı

#### 2.1 Yeni Hook: `useOfficialIncomeStatement`

**Dosya:** `src/hooks/finance/useOfficialIncomeStatement.ts`

```typescript
// Resmi gelir tablosu verilerini yönetir
// - Veritabanından yükleme
// - Kaydetme (upsert)
// - Kilitleme/Kilit açma

export function useOfficialIncomeStatement(year: number) {
  // Query: yearly_income_statements tablosundan veri çek
  // Mutation: upsert, lock/unlock
  return {
    officialStatement,
    isLoading,
    isLocked,
    upsertStatement,
    lockStatement,
    unlockStatement,
    isUpdating,
  };
}
```

#### 2.2 Yeni Hook: `useTrialBalance`

**Dosya:** `src/hooks/finance/useTrialBalance.ts`

```typescript
// Mizan verilerini yönetir
// - Dosya yükleme sonrası parse edilmiş verileri saklar
// - Mizan → Gelir Tablosu / Bilanço dönüşümü

export function useTrialBalance(year: number) {
  return {
    trialBalance,
    isLoading,
    uploadTrialBalance,  // File upload + parse
    approveTrialBalance, // Onaylandığında income statement'a aktar
    deleteTrialBalance,
  };
}
```

#### 2.3 Hook Güncelleme: `useIncomeStatement`

**Dosya:** `src/hooks/finance/useIncomeStatement.ts`

Mevcut hook'a "kaynak seçimi" mantığı eklenir:

```typescript
export function useIncomeStatement(year: number) {
  const hub = useFinancialDataHub(year);
  const { officialStatement, isLocked } = useOfficialIncomeStatement(year);
  
  const statement = useMemo(() => {
    // Resmi veri kilitliyse onu kullan
    if (isLocked && officialStatement) {
      return mapOfficialToIncomeStatement(officialStatement);
    }
    
    // Yoksa dinamik hesapla (mevcut mantık)
    return calculateDynamicStatement(hub);
  }, [hub, officialStatement, isLocked]);
  
  return {
    statement,
    lines,
    isLoading,
    isUsingOfficial: isLocked,  // UI'da kaynak göstergesi için
  };
}
```

---

### Faz 3: Edge Function - Mizan Parser

#### 3.1 Edge Function: `parse-trial-balance`

**Dosya:** `supabase/functions/parse-trial-balance/index.ts`

Excel/PDF mizan dosyasını parse eder:

```typescript
// Input: File (xlsx/pdf)
// Output: { accounts: { [hesapKodu]: { borç, alacak, borçBakiye, alacakBakiye } } }

// Parse mantığı:
// 1. Excel ise: xlsx kütüphanesi ile satırları oku
// 2. Her satırda hesap kodu, hesap adı, borç, alacak kolonlarını bul
// 3. JSON formatına dönüştür

// Örnek çıktı:
{
  "accounts": {
    "100": { "name": "Kasa", "debit": 5000, "credit": 3000, "debitBalance": 2000, "creditBalance": 0 },
    "102": { "name": "Bankalar", "debit": 1500000, "credit": 1200000, "debitBalance": 300000, "creditBalance": 0 },
    "600": { "name": "Yurtiçi Satışlar", "debit": 0, "credit": 2500000, "debitBalance": 0, "creditBalance": 2500000 },
    "632": { "name": "Genel Yönetim Giderleri", "debit": 450000, "credit": 0, "debitBalance": 450000, "creditBalance": 0 }
  },
  "detectedFormat": "standard_mizan",
  "totalRows": 85
}
```

#### 3.2 Mizan → Finansal Tablo Dönüşüm Mantığı

```typescript
// Gelir tablosu hesapları (6xx) - Alacak bakiyesi = Gelir
// Gider tablosu hesapları (6xx) - Borç bakiyesi = Gider
// Aktif hesapları (1xx-2xx) - Borç bakiyesi = Varlık
// Pasif hesapları (3xx-5xx) - Alacak bakiyesi = Borç/Özkaynak

function mizanToIncomeStatement(accounts: MizanAccounts): IncomeStatementData {
  return {
    gross_sales_domestic: accounts['600']?.creditBalance || 0,
    gross_sales_export: accounts['601']?.creditBalance || 0,
    cost_of_services_sold: accounts['622']?.debitBalance || 0,
    general_admin_expenses: accounts['632']?.debitBalance || 0,
    // ... diğer hesaplar
  };
}

function mizanToBalanceSheet(accounts: MizanAccounts): BalanceSheetData {
  return {
    cash_on_hand: accounts['100']?.debitBalance || 0,
    bank_balance: accounts['102']?.debitBalance || 0,
    trade_receivables: accounts['120']?.debitBalance || 0,
    // ... diğer hesaplar
  };
}
```

---

### Faz 4: UI Bileşenleri

#### 4.1 Yeni Sayfa: `/finance/official-data`

**Dosya:** `src/pages/finance/OfficialData.tsx`

Ana resmi veri yönetim sayfası:

```
┌────────────────────────────────────────────────────────┐
│ ← Resmi Finansal Veriler                    [2025 ▼]  │
├────────────────────────────────────────────────────────┤
│ [Mizan] [Gelir Tablosu] [Bilanço]                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  📊 2025 Mizanı                                 │  │
│  │                                                  │  │
│  │  [Dosya yükle veya sürükle]                     │  │
│  │  Excel (.xlsx) veya PDF                          │  │
│  │                                                  │  │
│  │  ─────────────────────────────────────────────  │  │
│  │  📄 Yüklenen: mizan_2025_ocak_aralik.xlsx      │  │
│  │     85 hesap, ₺2,345,678 aktif toplamı          │  │
│  │     [Önizle] [Onayla] [Sil]                     │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ─── veya Manuel Giriş ───                            │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  600 - Yurtiçi Satışlar    [____________]  ₺   │  │
│  │  601 - Yurtdışı Satışlar   [____________]  ₺   │  │
│  │  622 - Satılan Hiz. Mal.   [____________]  ₺   │  │
│  │  632 - Genel Yönetim       [____________]  ₺   │  │
│  │  ...                                            │  │
│  │                              [Kaydet] [Kilitle] │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 4.2 Gelir Tablosu Manuel Giriş Formu

**Dosya:** `src/components/finance/OfficialIncomeStatementForm.tsx`

```tsx
// Tekdüzen hesap planına göre gruplandırılmış form
// Her hesap kodu için input
// Otomatik toplam hesaplama
// Kaydet ve Kilitle butonları
```

#### 4.3 Reports Sayfası Güncelleme

**Dosya:** `src/pages/finance/Reports.tsx`

Kaynak göstergesi ve toggle eklenir:

```tsx
{/* Veri Kaynağı Göstergesi */}
{isUsingOfficial ? (
  <Badge variant="default" className="bg-green-600">
    <Shield className="h-3 w-3 mr-1" />
    Resmi Veri (Kilitli)
  </Badge>
) : (
  <Badge variant="outline">
    <BarChart3 className="h-3 w-3 mr-1" />
    Dinamik Hesaplama
  </Badge>
)}
```

---

### Faz 5: Routing ve Navigation

#### 5.1 App.tsx Güncelleme

```tsx
<Route path="/finance/official-data" element={<ProtectedRoute><OfficialData /></ProtectedRoute>} />
```

#### 5.2 FinanceDashboard Navigation

FinanceDashboard'a "Resmi Veriler" kartı eklenir.

---

### Uygulama Sırası

| Sıra | Görev | Bağımlılık |
|------|-------|------------|
| 1 | `yearly_income_statements` tablosu oluştur | - |
| 2 | `official_trial_balances` tablosu oluştur | - |
| 3 | `useOfficialIncomeStatement` hook yaz | 1 |
| 4 | `useTrialBalance` hook yaz | 2 |
| 5 | `useIncomeStatement` hook'u güncelle | 3 |
| 6 | `parse-trial-balance` edge function yaz | - |
| 7 | `OfficialIncomeStatementForm` bileşeni yaz | 3 |
| 8 | `OfficialData` sayfası yaz | 3, 4, 6, 7 |
| 9 | `Reports` sayfasına kaynak göstergesi ekle | 5 |
| 10 | Navigation ve routing ekle | 8 |

---

### Dosya Değişiklik Özeti

| Dosya | İşlem |
|-------|-------|
| `supabase/migrations/xxx_yearly_income_statements.sql` | Yeni (migration) |
| `supabase/migrations/xxx_official_trial_balances.sql` | Yeni (migration) |
| `src/hooks/finance/useOfficialIncomeStatement.ts` | Yeni |
| `src/hooks/finance/useTrialBalance.ts` | Yeni |
| `src/hooks/finance/useIncomeStatement.ts` | Güncelle |
| `src/hooks/finance/index.ts` | Güncelle (export ekle) |
| `supabase/functions/parse-trial-balance/index.ts` | Yeni |
| `src/components/finance/OfficialIncomeStatementForm.tsx` | Yeni |
| `src/components/finance/TrialBalanceUploader.tsx` | Yeni |
| `src/pages/finance/OfficialData.tsx` | Yeni |
| `src/pages/finance/Reports.tsx` | Güncelle |
| `src/App.tsx` | Güncelle (route ekle) |
| `src/pages/finance/FinanceDashboard.tsx` | Güncelle (navigation ekle) |

---

### Beklenen Sonuçlar

- ✓ Manuel gelir tablosu girişi yapılabilir
- ✓ Mizan Excel/PDF yüklenebilir ve otomatik parse edilir
- ✓ Resmi veriler "kilitli" modda sabitlenebilir
- ✓ Raporlar otomatik olarak resmi veya dinamik kaynak kullanır
- ✓ Her iki kaynak arasında geçiş yapılabilir
- ✓ Mevcut dinamik hesaplama sistemi korunur
