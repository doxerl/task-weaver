

## Bilanço PDF Yükleme ve AI Parsing Özelliği Ekleme Planı

### Mevcut Durum

| Bileşen | Mizan | Gelir Tablosu | Bilanço |
|---------|-------|---------------|---------|
| Edge Function | ✅ parse-trial-balance | ✅ parse-income-statement | ❌ YOK |
| Uploader Bileşeni | ✅ TrialBalanceUploader | ✅ IncomeStatementUploader | ❌ YOK |
| Veritabanı Tablosu | ✅ official_trial_balances | ✅ yearly_income_statements | ✅ yearly_balance_sheets (sadece manuel) |
| Hesap Kodu Mapping | ✅ INCOME_STATEMENT_ACCOUNT_MAP | ✅ (aynı) | ❌ YOK |

### Hedef

Bilanço sekmesine de Mizan ve Gelir Tablosu gibi PDF/Excel yükleme + AI parsing özelliği eklemek.

---

### Teknik Uygulama Planı

#### 1. Veritabanı Değişikliği

`yearly_balance_sheets` tablosuna dosya ve onay alanları eklenecek:

```sql
ALTER TABLE yearly_balance_sheets 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS uploaded_at timestamptz,
ADD COLUMN IF NOT EXISTS raw_accounts jsonb;
```

**Yeni Alanlar:**
- `source`: 'manual' | 'file_upload'
- `file_name`: Yüklenen dosya adı
- `file_url`: Storage URL
- `uploaded_at`: Yükleme tarihi
- `raw_accounts`: AI'dan gelen ham hesap verileri (önizleme için)

#### 2. Hesap Kodu Mapping Ekleme

`src/types/officialFinance.ts` dosyasına:

```typescript
// Bilanço hesap kodu -> veritabanı alan mapping
export const BALANCE_SHEET_ACCOUNT_MAP: Record<string, string> = {
  '100': 'cash_on_hand',        // Kasa
  '102': 'bank_balance',        // Bankalar
  '120': 'trade_receivables',   // Alıcılar
  '131': 'partner_receivables', // Ortaklardan Alacaklar
  '190': 'vat_receivable',      // Devreden KDV
  '191': 'other_vat',           // İndirilecek KDV
  '150': 'inventory',           // Stoklar
  '254': 'vehicles',            // Taşıtlar
  '255': 'fixtures',            // Demirbaşlar
  '256': 'equipment',           // Makine ve Cihazlar
  '257': 'accumulated_depreciation', // Birikmiş Amortisman
  '300': 'short_term_loan_debt', // Kısa Vadeli Krediler
  '320': 'trade_payables',      // Satıcılar
  '331': 'partner_payables',    // Ortaklara Borçlar
  '335': 'personnel_payables',  // Personele Borçlar
  '360': 'tax_payables',        // Ödenecek Vergi
  '361': 'social_security_payables', // Ödenecek SGK
  '391': 'vat_payable',         // Hesaplanan KDV
  '370': 'deferred_tax_liabilities', // Ertelenmiş Vergi Borcu
  '379': 'tax_provision',       // Vergi Karşılığı
  '400': 'bank_loans',          // Banka Kredileri (Uzun Vadeli)
  '500': 'paid_capital',        // Sermaye
  '501': 'unpaid_capital',      // Ödenmemiş Sermaye
  '570': 'retained_earnings',   // Geçmiş Yıllar Karları
  '590': 'current_profit',      // Dönem Net Karı
};
```

#### 3. Edge Function Oluşturma

**`supabase/functions/parse-balance-sheet/index.ts`**

Mizan parse function'ına benzer yapıda:
- PDF/Excel dosyası kabul et
- AI ile hesapları parse et
- Bilanço hesap kodlarını (1xx, 2xx, 3xx, 4xx, 5xx) çıkar
- Borç/Alacak bakiyelerine göre değer ata

```
AI Prompt özeti:
- 1xx-2xx: Aktif hesaplar (borç bakiyesi = değer)
- 3xx-4xx: Pasif hesaplar (alacak bakiyesi = değer)
- 5xx: Özkaynak hesapları (alacak bakiyesi = değer)
```

#### 4. Hook Oluşturma

**`src/hooks/finance/useBalanceSheetUpload.ts`**

```typescript
export function useBalanceSheetUpload(year: number) {
  // Dosya yükle ve parse et
  const uploadBalanceSheet = async (file: File) => {
    // 1. Storage'a yükle
    // 2. parse-balance-sheet edge function çağır
    // 3. yearly_balance_sheets tablosuna kaydet
  };

  // Önizle ve onayla
  const approveBalanceSheet = async () => {
    // raw_accounts'tan değerleri hesap alanlarına aktar
    // is_locked = true yap
  };

  return { uploadBalanceSheet, approveBalanceSheet, ... };
}
```

#### 5. Uploader Bileşeni Oluşturma

**`src/components/finance/BalanceSheetUploader.tsx`**

TrialBalanceUploader ile aynı yapıda:
- Drag & drop dosya yükleme
- PDF/Excel desteği
- Hesap önizleme tablosu
- Onayla ve Aktar butonu
- Aktif = Pasif denge kontrolü

#### 6. Sayfa Güncellemesi

**`src/pages/finance/OfficialData.tsx`**

Bilanço sekmesine mode seçici ekle:

```tsx
<TabsContent value="balance">
  <div className="flex gap-2 mb-4">
    <Button variant={balanceMode === 'upload' ? 'default' : 'outline'}>
      <Upload /> Dosya Yükle
    </Button>
    <Button variant={balanceMode === 'manual' ? 'default' : 'outline'}>
      <Edit /> Manuel Giriş
    </Button>
  </div>
  
  {balanceMode === 'upload' ? (
    <BalanceSheetUploader year={selectedYear} />
  ) : (
    <OfficialBalanceSheetForm year={selectedYear} />
  )}
</TabsContent>
```

---

### Oluşturulacak/Güncellenecek Dosyalar

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `supabase/functions/parse-balance-sheet/index.ts` | ✨ Yeni | AI PDF/Excel parsing |
| `src/types/officialFinance.ts` | Güncelle | BALANCE_SHEET_ACCOUNT_MAP ekle |
| `src/hooks/finance/useBalanceSheetUpload.ts` | ✨ Yeni | Yükleme ve onay hook'u |
| `src/components/finance/BalanceSheetUploader.tsx` | ✨ Yeni | Yükleme UI bileşeni |
| `src/pages/finance/OfficialData.tsx` | Güncelle | Mode seçici ekle |
| Veritabanı migrasyonu | SQL | Yeni alanlar ekle |

---

### UI Tasarımı

```
┌─────────────────────────────────────────────────────────────────────┐
│  Mizan  │  Gelir Tablosu  │  [Bilanço]                              │
├─────────────────────────────────────────────────────────────────────┤
│  [🔼 Dosya Yükle]  [✏️ Manuel Giriş]                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │    📄 Excel veya PDF dosyasını sürükleyip bırakın          │    │
│  │                                                             │    │
│  │                    [Dosya Seç]                              │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Desteklenen formatlar: .xlsx, .xls, .pdf                           │
└─────────────────────────────────────────────────────────────────────┘
```

**Dosya Yüklendikten Sonra:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 bilanço_2025.pdf                            [Onay Bekliyor]     │
│  28 hesap bulundu                                                    │
├─────────────────────────────────────────────────────────────────────┤
│  Toplam Aktif                    │  Toplam Pasif                     │
│  ₺5.050.215                      │  ₺5.050.215                       │
├─────────────────────────────────────────────────────────────────────┤
│  ✅ Bilanço Dengeli (Aktif = Pasif)                                  │
├─────────────────────────────────────────────────────────────────────┤
│  [👁️ Önizle]  [✓ Onayla ve Aktar]  [🗑️ Sil]                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Uygulama Sırası

| Sıra | Görev |
|------|-------|
| 1 | Veritabanı migrasyonu (yeni alanlar) |
| 2 | BALANCE_SHEET_ACCOUNT_MAP type'a ekle |
| 3 | parse-balance-sheet edge function oluştur |
| 4 | useBalanceSheetUpload hook oluştur |
| 5 | BalanceSheetUploader bileşeni oluştur |
| 6 | OfficialData sayfasını güncelle |
| 7 | Edge function deploy et |
| 8 | Test et |

---

### Dikkat Edilecek Noktalar

- **Aktif = Pasif kontrolü**: Bilanço dengesiz ise uyarı göster
- **Mevcut verilerle uyumluluk**: Manuel girilmiş veriler korunacak
- **İki mod**: Dosya yükleme ve manuel giriş seçenekleri
- **Alt hesaplar**: Mizan'daki gibi satıcı/müşteri detayları gösterilebilir (320 için firmalar vb.)

