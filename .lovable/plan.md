

## PDF Parse Sorunu - Kapsamlı Düzeltme Planı

### Tespit Edilen Sorunlar

| Sorun | Log Detayı | Etki |
|-------|-----------|------|
| **Fonksiyon adı uyumsuz** | AI `ParseMizanAccounts` döndürüyor, kod `parse_mizan` bekliyor | Tool call parse edilemiyor |
| **Tek hesap döndürülüyor** | `{"code":"100","name":"KASA",...}` - array değil | Tüm hesaplar alınamıyor |
| **MAX_TOKENS hatası** | Token limiti aşılıyor (aslında model çıktı formatı sorunu) | Yanıt kesiliyor |

### Token Limiti Açıklaması

`max_tokens: 8000` yeterli olmalı, ama log'da sadece 69 token üretilmiş. Sorun token limiti değil, **AI'ın yanlış format döndürmesi**. AI her hesap için ayrı tool call yapmaya çalışıyor, bu da soruna yol açıyor.

---

### Çözüm Planı

#### 1. Fonksiyon Adı Kontrolünü Kaldır

AI herhangi bir isimle döndürse de arguments'ı parse et:

```typescript
// MEVCUT (çalışmıyor)
if (toolCall && toolCall.function?.name === 'parse_mizan') {

// YENİ (herhangi bir tool call'u kabul et)
if (toolCall?.function?.arguments) {
```

#### 2. Tek Hesap vs Array Desteği

AI bazen tek hesap, bazen array döndürüyor - her ikisini de destekle:

```typescript
const args = JSON.parse(toolCall.function.arguments);

// Array mi tek hesap mı kontrol et
if (Array.isArray(args)) {
  parsedArgs = { accounts: args };
} else if (args.accounts) {
  parsedArgs = args;
} else if (args.code) {
  // Tek hesap döndü
  parsedArgs = { accounts: [args] };
}
```

#### 3. Token Limitini Artır

Güvenlik için token limitini artır:
```typescript
max_tokens: 16000,  // 8000'den artır
```

#### 4. Çoklu Tool Call Desteği

AI her hesap için ayrı tool call yapabilir - hepsini topla:

```typescript
const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
const allAccounts = [];

for (const tc of toolCalls) {
  if (tc.function?.arguments) {
    const args = JSON.parse(tc.function.arguments);
    if (args.code) {
      allAccounts.push(args);
    } else if (args.accounts) {
      allAccounts.push(...args.accounts);
    }
  }
}

if (allAccounts.length > 0) {
  parsedArgs = { accounts: allAccounts };
}
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/functions/parse-trial-balance/index.ts` | Fonksiyon adı kontrolü kaldır, çoklu tool call desteği, tek hesap fallback, max_tokens artır |
| `supabase/functions/parse-income-statement/index.ts` | Aynı düzeltmeler |

---

### Uygulama Özeti

```text
1. max_tokens: 8000 → 16000
2. Fonksiyon adı kontrolünü kaldır (herhangi bir tool call kabul)
3. Çoklu tool_calls dizisini işle (her hesap ayrı call olabilir)
4. Tek hesap vs array formatını destekle
5. Text content fallback'i güçlendir
```

---

### Beklenen Sonuç

- PDF dosyaları başarıyla parse edilecek
- AI hangi format döndürürse döndürsün çalışacak
- Tüm hesaplar çıkarılacak
- Alt hesaplar ve satıcı bilgileri görüntülenebilecek

