## Hedef

1. **Para birimi otomatik tespiti** (TRY/USD/EUR) — header bilgisi + tutar sembollerinden.
2. **Orijinal döviz + TL karşılığı** ile saklama (TCMB kuru ile çevrim).
3. **Aynı oturumda birden fazla farklı banka/hesap Excel'i** yüklenebilsin — hepsi aynı şirketin faaliyetlerinin parçası olarak biriksin.

## Değişiklikler

### 1. Para birimi tespiti — `supabase/functions/parse-bank-statement`
- Prompt'a "PARA BİRİMİ TESPİTİ" bölümü ekle:
  - Header bilgisinden: `Hesap: ... TL/USD/EUR/$/€`, `IBAN`, hesap tipi satırı.
  - Tutar sütunundaki semboller: `₺`, `$`, `€`, `USD`, `EUR`, `TL`.
  - Bulunamazsa default `TRY`.
- `bank_info.currency` artık enum: `"TRY" | "USD" | "EUR"` (şu an hardcoded `"TRY"`).
- `summary`'e `detected_currency` ve `currency_confidence` ekle.

### 2. Frontend — `useBankFileUpload.ts`
- Hardcoded `currency: 'TRY'` yerine batch'lerden gelen `bank_info.currency` değerini kullan (ilk geçerli batch'ten alıp tüm dosyaya uygula).
- Parse sonrası `currency !== 'TRY'` ise `useExchangeRates`'ten ilgili tarih için kur çekip her transaction'a `amount_try = amount * rate` hesapla.
- Tarih bazlı kur cache'i (aynı günkü kuru tekrar çekme).

### 3. UI — `ParsedTransactionList.tsx` + `BankImport.tsx`
- Özet kartında para birimi rozeti ("USD ekstre — TL karşılığı: ₺X").
- İşlem tablosunda tutar `12,345.67 $` formatında, hover/yan sütunda TL karşılığı.
- Onay öncesi banner: "Bu ekstre USD olarak algılandı. Tutarlar TCMB kuru ile TL'ye çevrilecek."

### 4. Schema — yeni migration
```sql
ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS amount_try numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric;

ALTER TABLE uploaded_bank_files
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TRY';

ALTER TABLE bank_import_sessions
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'TRY';
```
- Mevcut TL kayıtlar için `amount_try = amount` backfill.
- Raporlama hook'ları (`useIncomeAnalysis`, `useFinancialDataHub`) `amount_try` öncelikli — yoksa `amount`.

### 5. Çoklu dosya / çoklu hesap desteği — `useBankImportSession` + `BankImport.tsx`
- Şu anki model: tek aktif session = tek dosya.
- Yeni davranış: **aktif session içine ek dosya yükleme**.
  - `bank_import_sessions`'a `file_count int default 1` ekle.
  - `bank_import_transactions`'a `source_file_name text`, `source_bank text`, `source_currency text` ekle (her satırın hangi dosyadan geldiği görünsün).
  - Upload bittiğinde aktif session varsa **append** et (yeni session açma); yoksa yeni session yarat.
- BankImport UI'sına "+ Başka banka ekstresi ekle" butonu:
  - Preview/review modunda görünür.
  - Yeni dosya seç → parse → kategorize → mevcut session'a ekle (transaction listesi büyür).
- Özet kartında dosya başına alt-özet sekmesi: "Garanti TL — 142 işlem", "İş Bankası USD — 38 işlem" + toplam.
- Duplicate koruma: aynı `file_id + row_number` constraint zaten var; ek olarak `(transaction_date, amount, description, currency)` soft-dedupe uyarısı.

### 6. Kategorize batch'i — `categorize-transactions`
- Currency bilgisini prompt'a aktar (örn. USD ekstrede "MAAS" muhtemelen yurt dışı ödeme olabilir → AI bağlamı zenginleşir).
- `txList` formatına `currency` eklenir.

## Doğrulama
- Garanti TL ekstre → eskisi gibi `TRY`, `amount_try = amount`.
- USD ekstre → `currency: "USD"`, her satırda `amount_try` dolu, UI'da iki tutar gözükür.
- TL ekstre + USD ekstre arka arkaya yüklenip aynı session altında tek listede toplandığı doğrulanır; raporlama hook'ları toplam TL'yi `amount_try` üzerinden doğru üretir.

## Kapsam dışı
- TCMB kuru entegrasyonu zaten `useExchangeRates`'te var — bu hook kullanılacak, yeni FX kaynağı eklenmeyecek.
- GBP/CHF gibi diğer dövizler bu turda yok (TRY/USD/EUR).