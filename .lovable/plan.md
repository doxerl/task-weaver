

## PDF Parse Hatası Düzeltme Planı

### Sorun Analizi

| Detay | Değer |
|-------|-------|
| **Hata Kodu** | `MALFORMED_FUNCTION_CALL` |
| **Model** | `google/gemini-2.5-flash` |
| **Sebep** | `tool_choice` formatı Gemini ile uyumsuz |
| **Sonuç** | PDF dosyaları 0 hesap döndürüyor |

### Kök Neden

Gemini modeli için `tool_choice` yapılandırması farklı bir format gerektiriyor. Mevcut kod OpenAI formatını kullanıyor:

```typescript
// MEVCUT (OpenAI formatı - çalışmıyor)
tool_choice: { type: 'function', function: { name: 'parse_mizan' } }
```

### Çözüm Seçenekleri

#### Seçenek 1: tool_choice Kaldır (Önerilen)
Gemini otomatik olarak uygun tool'u seçsin:
```typescript
// tool_choice satırını tamamen kaldır
// Gemini prompt'taki talimata göre fonksiyonu çağıracak
```

#### Seçenek 2: Gemini formatına çevir
```typescript
tool_choice: 'required'  // veya 'auto'
```

#### Seçenek 3: Hybrid yaklaşım
Önce normal JSON yanıt al, sonra parse et (tool kullanma)

---

### Uygulama Planı

#### 1. `parse-trial-balance/index.ts` Güncelle

**Değişiklik 1**: `tool_choice` yapısını düzelt veya kaldır
```typescript
body: JSON.stringify({
  model: 'google/gemini-2.5-flash',
  messages: [...],
  tools: [{ type: 'function', function: PARSE_FUNCTION_SCHEMA }],
  // tool_choice kaldırıldı - Gemini otomatik seçecek
  temperature: 0.1,
  max_tokens: 8000,
}),
```

**Değişiklik 2**: Fallback yanıt işleme ekle
AI fonksiyon çağırmazsa, text yanıtı parse etmeyi dene:
```typescript
// Tool call yoksa, text content'i kontrol et
if (!toolCall) {
  const textContent = data.choices?.[0]?.message?.content;
  // JSON parse etmeyi dene
}
```

#### 2. `parse-income-statement/index.ts` da Güncelle

Aynı sorun orada da var, aynı düzeltme uygulanacak.

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/functions/parse-trial-balance/index.ts` | tool_choice kaldır, fallback ekle |
| `supabase/functions/parse-income-statement/index.ts` | Aynı düzeltme |

---

### Alternatif Yaklaşım: JSON Mode

Eğer tool calling hala sorunluysa, structured output için JSON mode kullan:

```typescript
response_format: { type: "json_object" },
// tools kullanma, prompt'ta JSON formatı iste
```

Bu durumda prompt şöyle güncellenir:
```
Yanıtını şu JSON formatında ver:
{
  "accounts": [
    { "code": "100", "name": "KASA", "debit": 1000, ... }
  ]
}
```

---

### Beklenen Sonuç

- PDF dosyaları başarıyla parse edilecek
- Hesap kodları ve tutarlar doğru çıkarılacak
- Alt hesaplar da görüntülenebilecek

