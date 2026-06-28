## Hedef

Tek bir PDF içinde birden fazla fatura olduğunda (örn: 45 sayfalık toplu e-fatura çıktısı), sistem PDF'i otomatik tespit edip her sayfayı ayrı bir fatura olarak işlesin. Banka ekstresinde olduğu gibi 5 paralel batch ile ilerlesin, progress bar ve özet ekrandan takip edilebilsin. TL ve EUR (ve diğer dövizler) destekli.

## Mevcut durum

- `ReceiptUpload.tsx` PDF'i tek dosya olarak `useReceipts.uploadReceiptsBatch`'e veriyor.
- `useReceipts` her PDF için `parse-receipt` edge function'ını **tek seferlik** çağırıyor → çok sayfalı PDF tek faturaya düşüyor.
- `BatchProgress` altyapısı, paralel işleme ve UI (progress bar, success/duplicate/failure özetleri) zaten mevcut — sadece "1 dosya = 1 fatura" varsayımı sorun.

## Çözüm

### 1. Yeni edge function: `detect-pdf-invoices`
- Girdi: PDF storage URL.
- Çıktı: `{ pageCount, invoiceCount, isMultiInvoice, invoiceMarkers: [{page, invoiceNo}] }`.
- pdf-lib + basit metin çıkarma ile "Fatura No:" / "Invoice No:" regex sayımı yapar.
- `invoiceCount >= 2` → `isMultiInvoice = true`.

### 2. Yeni edge function: `split-and-parse-pdf`
- Girdi: PDF storage path, `documentType`, opsiyonel `pageRange`.
- pdf-lib ile PDF'i sayfa sayfa böler, her sayfayı yeni bir tek-sayfa PDF'e çevirir (base64).
- 5'erli paralel gruplar halinde mevcut `parse-receipt` fonksiyonunu (data URL ile) çağırır.
- Her sayfa için sonuç döner: `[{page, success, result|error, fileName: "<original>_p1.pdf"}]`.
- Mevcut `parse-zip-receipts` deseni birebir referans alınır (sequential yerine `Promise.all` chunked).

### 3. `useReceipts.uploadReceiptsBatch` güncellemesi
- Yükleme öncesi her PDF için `detect-pdf-invoices` çağrısı yap.
- `isMultiInvoice === true` ise:
  - Dosyayı storage'a tek seferlik upload et.
  - `split-and-parse-pdf` çağır.
  - Dönen N adet parse sonucu için N adet `receipts` insert yap (mevcut tek-fatura insert path'i parametrik hale getirilir).
  - `BatchProgress`'i: toplam = `Σ invoiceCount`, current = işlenen sayfa sayısı şeklinde güncelle.
- Tek faturalı PDF'ler eski akışta kalır.

### 4. UI iyileştirmeleri (`ReceiptUpload.tsx`)
- Progress satırında çok faturalı PDF tespit edildiğinde: `Toplu fatura PDF: dosya.pdf (45 fatura)` etiketi göster.
- Sonuç özetinde her sayfa ayrı satır: `dosya.pdf - Sayfa 3 (SFT2026...003) ✓`.
- Mevcut duplicate/failure render mantığı değiştirilmez.

### 5. Duplicate koruması
- Mevcut `multi-layer-duplicate-detection-v2` (receipt_no + tax_no + doc_type) zaten çalışıyor — her bölünen sayfa için ayrı uygulanır. Ek değişiklik gerekmez.

### 6. Para birimi desteği
- `parse-receipt` zaten EUR/USD/TRY tespit ediyor (`original_currency`, `original_amount`, `amount_try`, `exchange_rate_used`).
- Bölünen sayfalar tek tek `parse-receipt`'e gittiği için ek bir çalışma gerekmez. Aylık kur fallback'i (mevcut `monthly_exchange_rates`) korunur.

## Teknik detaylar

- **pdf-lib** edge function'da: `import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1"`.
- **Paralel batch**: `categorize-transactions`'daki `PARALLEL_BATCH_COUNT = 5` deseni.
- **Timeout**: her parse-receipt çağrısı için 60 sn, toplam fonksiyon timeout'u 400 sn (45 sayfa × 5 paralel ≈ 9 tur × ~6 sn).
- **Storage path**: bölünen sayfalar storage'a yazılmaz — base64 data URL ile parse-receipt'e gönderilir (parse-zip-receipts'teki örüntü).
- **Hata politikası**: bir sayfa fail olursa diğerleri devam eder; UI sonuç özetinde başarısız sayfa işaretlenir, kullanıcı manuel yeniden deneyebilir.

## Etkilenen dosyalar

- Yeni: `supabase/functions/detect-pdf-invoices/index.ts`
- Yeni: `supabase/functions/split-and-parse-pdf/index.ts`
- Düzenleme: `src/hooks/finance/useReceipts.ts` (PDF tespit + multi-invoice insert döngüsü)
- Düzenleme: `src/pages/finance/ReceiptUpload.tsx` (progress satırı + sonuç özeti)

## Kapsam dışı

- XML toplu yükleme (zaten ZIP üzerinden destekleniyor).
- Çok sayfalı tek fatura (örn: ekli olmayan fatura) ayrımı — bu sürümde "≥2 Fatura No tespit edilirse böl, aksi halde tek fatura kabul et" kuralı uygulanır.
