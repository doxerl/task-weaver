## Sorun

Garanti BBVA banka extresinin satırları parse edildi, ancak **kategorize etme adımı 7 batch boyunca başarısız** oldu (her satırda "Edge Function returned a non-2xx status code").

### Kök neden

`supabase/functions/categorize-transactions/index.ts` (satır 176) hâlâ `google/gemini-2.5-flash` modelini kullanıyor. AI Gateway log'larında bu çağrılar **HTTP 403** dönüyor (15+ ardışık hata, 28/06 18:09):

```
status: client_error (http 403)
model: google/gemini-2.5-flash / google/gemini-2.5-pro
```

Gemini 2.5 modelleri gateway'de artık erişilebilir değil (gateway 403 = model erişim reddi). Önceki AI güncellemesi sırasında bazı fonksiyonlar atlanmış. Halen `gemini-2.5` kullanan 8 fonksiyon var:

- categorize-transactions ← **bu hatanın kaynağı**
- parse-actual, parse-bank-statement, parse-receipt, parse-plan, parse-trial-balance
- unified-scenario-analysis, analyze-growth-scenario

## Çözüm

Tüm `google/gemini-2.5-flash` ve `google/gemini-2.5-pro` referanslarını mevcut default olan **`google/gemini-3-flash-preview`** (ağır analiz için `google/gemini-3-pro-preview`) ile değiştir.

### Yapılacak değişiklikler

1. **`categorize-transactions`** — `gemini-2.5-flash` → `gemini-3-flash-preview` (yüksek hacim, hızlı sınıflandırma için flash).
2. **`parse-bank-statement`, `parse-actual`, `parse-receipt`, `parse-plan`, `parse-trial-balance`** — parsing işlemleri için `gemini-3-flash-preview`.
3. **`unified-scenario-analysis`, `analyze-growth-scenario`** — finansal analiz için `gemini-3-pro-preview` (uzun reasoning gerektiriyor); fallback olarak `gemini-3-flash-preview`.
4. 402/429 hata mesajlarını korunduğunu doğrula.

### Doğrulama

- Aynı Garanti extresini yeniden yükleyerek 7 batch'in 2xx döndürdüğünü ve kategorilemenin tamamlandığını gözlemle.
- Edge function log'larında 403 olmadığını teyit et.

Yalnızca model isimleri güncellenecek — parse/kategorileme mantığı, prompt'lar ve schema değişmiyor.