# AI API Denetimi ve Güncelleme

## Mevcut Durum

13 edge function AI çağrısı yapıyor. Denetim sonuçları:

| Sorun | Dosya | Detay |
|---|---|---|
| ❌ Doğrudan OpenAI API kullanıyor (gateway dışı) | `transcribe-audio` | `https://api.openai.com/v1/audio/transcriptions` + `OPENAI_API_KEY` |
| ❌ Desteklenmeyen model ID | `unified-scenario-analysis` | `google/gemini-3-pro-preview` (katalogda yok; doğrusu `gemini-3.1-pro-preview`) |
| ❌ Desteklenmeyen fallback model | `unified-scenario-analysis` | `anthropic/claude-3.5-sonnet` (Lovable Gateway kataloğunda Anthropic yok) |
| ❌ Desteklenmeyen model ID | `parse-income-statement` | `google/gemini-3-pro-preview` |
| ❌ Desteklenmeyen model ID | `parse-balance-sheet` | `google/gemini-3-pro-preview` |
| ✅ Geçerli | `analyze-scenarios`, `analyze-investor-pitch` | `google/gemini-3-flash-preview` |
| ✅ Geçerli | `analyze-growth-scenario`, `categorize-transactions`, `parse-trial-balance` | `google/gemini-2.5-flash` |
| ✅ Geçerli | `parse-receipt`, `parse-bank-statement`, `parse-actual`, `parse-plan` | `google/gemini-2.5-pro` |

## Yapılacak Değişiklikler

### 1. `transcribe-audio` — Lovable AI Gateway'e migrate
- `api.openai.com` → `https://ai.gateway.lovable.dev/v1/audio/transcriptions`
- `OPENAI_API_KEY` → `LOVABLE_API_KEY` (`Authorization: Bearer ...`)
- Model: `openai/gpt-4o-mini-transcribe`
- 429 / 402 hata yönetimi eklenecek
- Avantaj: kullanıcının OpenAI anahtarına ihtiyaç kalmıyor, workspace kredisinden düşülüyor

### 2. `unified-scenario-analysis` — Model ID düzeltme
- Primary: `google/gemini-3-pro-preview` → `google/gemini-3.1-pro-preview`
- Fallback: `anthropic/claude-3.5-sonnet` → `google/gemini-2.5-pro` (gateway kataloğunda olan en güçlü alternatif)

### 3. `parse-income-statement` ve `parse-balance-sheet`
- `google/gemini-3-pro-preview` → `google/gemini-3.1-pro-preview`

### 4. Standartlaştırma (opsiyonel, küçük dokunuş)
- Tüm fonksiyonlarda 429 / 402 mesajları zaten var; sadece tutarlılık kontrolü yapılacak.

## Değişecek Dosyalar
- `supabase/functions/transcribe-audio/index.ts` (gateway migrasyonu)
- `supabase/functions/unified-scenario-analysis/index.ts` (model ID + fallback)
- `supabase/functions/parse-income-statement/index.ts` (model ID)
- `supabase/functions/parse-balance-sheet/index.ts` (model ID)

## Etki
- `transcribe-audio` artık `OPENAI_API_KEY` gerektirmiyor; tek anahtarla (LOVABLE_API_KEY) çalışıyor
- Geçersiz model ID'leri kaynaklı 400 hataları ortadan kalkıyor
- Tüm AI çağrıları Lovable AI Gateway üzerinden geçiyor (faturalama & log birliği)
