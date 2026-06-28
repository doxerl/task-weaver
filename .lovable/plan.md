## Amaç

Kullanıcı 2024 veya 2025 tarihli USD/EUR ekstre yüklediğinde `amount_try` alanı boş kalmasın. Şu an `useBankFileUpload.ts` içindeki fallback tabloları sadece 2026 anahtarlarını içeriyor; DB'de ise yalnızca USD/TRY 2025 değerleri var (EUR yok, USD 2024 yok).

## Yapılacaklar

### 1. `src/hooks/finance/useBankFileUpload.ts` (satır 911-918)

`EUR_FALLBACK` ve `USD_FALLBACK` sabitlerini 2024 ve 2025 yıllarıyla genişlet. Resmi/yıllık ortalama TCMB efektif satış kurları baz alınacak (aylık yaklaşık değerler):

- **USD/TRY 2024**: 28.5 → 35.5 aralığında 12 aylık değer
- **USD/TRY 2025**: DB'deki kayıtlar zaten geçerli (öncelikli olarak `rateMap` kullanılıyor); fallback yine de güvenlik için doldurulacak
- **EUR/TRY 2024**: 31 → 38 aralığında 12 aylık
- **EUR/TRY 2025**: 38 → 45 aralığında 12 aylık

Bu fallback dosya içi sabit olarak kalacak — DB'ye yazılmayacak (kullanıcı `monthly_exchange_rates` üzerinden istediği zaman daha kesin değer girebilir, öncelik DB'de).

### 2. (Opsiyonel ek) Eksik kur log mesajı

Eğer hem `rateMap` hem fallback'te ay bulunamazsa `console.warn` ile "X-Y için kur bulunamadı, TRY karşılığı hesaplanmadı" uyarısı bırakılacak (bugün sessizce `undefined` kalıyor; debug için faydalı).

## Davranış (değişiklik sonrası)

| Senaryo | Sonuç |
|---|---|
| 2024 USD ekstre | DB'de 2024 USD yok → fallback değer kullanılır, `amount_try` dolu |
| 2025 USD ekstre | DB'deki gerçek kur kullanılır (öncelikli) |
| 2024/2025 EUR ekstre | Fallback değer kullanılır, `amount_try` dolu |
| 2026 ekstre | Bugünkü davranış aynen |
| TRY ekstre | Etkilenmez |

## Dokunulmayacaklar

- UI'da yıl uyarısı **eklenmeyecek** (kullanıcı "sessizce kabul et" dedi).
- `monthly_exchange_rates` tablosuna seed migration yapılmayacak; fallback kod içinde kalacak (kullanıcı manuel olarak Settings'ten daha kesin değer girebilmeli).
- Önceki yıl işlemlerinin finance dashboard/scenario raporlarında nasıl filtrelendiği bu task'ın dışında.

## Dosya değişiklikleri

- `src/hooks/finance/useBankFileUpload.ts` — yalnızca fallback sabitleri + opsiyonel warn log
