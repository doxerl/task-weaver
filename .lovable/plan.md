

## Bilanço Edge Function'ı Gemini'ye Geçirme

### Sorunun Kaynağı

`parse-balance-sheet` edge function şu anda:
- ❌ OpenAI API kullanıyor (`OPENAI_API_KEY`)
- ❌ PDF'i `data:application/pdf;base64,...` olarak gönderiyor
- ❌ OpenAI Vision sadece görüntü formatlarını destekliyor (jpeg, png, gif, webp)

**Hata mesajı:**
```
Invalid MIME type. Only image types are supported.
```

### Çözüm

`parse-trial-balance` ile aynı yapıya geçiş:
- ✅ Lovable AI Gateway kullan (`LOVABLE_API_KEY`)
- ✅ `google/gemini-2.5-flash` modeli (PDF desteği var)
- ✅ Aynı prompt yapısı ve function calling

---

### Teknik Değişiklikler

**Dosya:** `supabase/functions/parse-balance-sheet/index.ts`

| Önceki (OpenAI) | Yeni (Gemini) |
|-----------------|---------------|
| `OPENAI_API_KEY` | `LOVABLE_API_KEY` |
| `api.openai.com/v1/chat/completions` | `ai.gateway.lovable.dev/v1/chat/completions` |
| `model: 'gpt-4o'` | `model: 'google/gemini-2.5-flash'` |
| `tool_choice: { type: 'function', ... }` | Kaldır (Gemini otomatik seçer) |

---

### Güncellenecek Kod Bölümleri

**1. API Anahtarı Değişikliği:**
```typescript
// Öncesi
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

// Sonrası
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
```

**2. API Endpoint Değişikliği:**
```typescript
// Öncesi
const response = await fetch('https://api.openai.com/v1/chat/completions', {

// Sonrası
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
```

**3. Model ve Tool Choice:**
```typescript
// Öncesi
model: 'gpt-4o',
tool_choice: { type: 'function', function: { name: 'parse_balance_sheet' } }

// Sonrası
model: 'google/gemini-2.5-flash',
temperature: 0.1,
// tool_choice kaldırıldı - Gemini prompt'a göre otomatik seçer
```

**4. Hata Mesajları Türkçeleştirme:**
```typescript
// Rate limit hatası için
if (response.status === 429) {
  return new Response(JSON.stringify({
    error: 'AI servisi şu an yoğun. Lütfen birkaç dakika sonra tekrar deneyin.'
  }), ...);
}
```

---

### Değiştirilecek Dosya

| Dosya | İşlem |
|-------|-------|
| `supabase/functions/parse-balance-sheet/index.ts` | OpenAI → Gemini geçişi |

---

### Beklenen Sonuç

- PDF dosyaları başarıyla parse edilecek
- Gemini'nin PDF desteği sayesinde görüntü dönüşümüne gerek kalmayacak
- `parse-trial-balance` ile aynı güvenilirlik

