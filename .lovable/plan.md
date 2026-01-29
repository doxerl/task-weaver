

## AI ile PDF Mizan Parse Çözümü

### Sorunun Kaynağı

`pdf-parse` kütüphanesi Node.js'in `fs.readFileSync` API'sini kullanıyor ve bu Deno/Edge Functions ortamında desteklenmiyor:

```
Error: [unenv] fs.readFileSync is not implemented yet!
```

---

### Çözüm: AI Destekli PDF Parsing

Lovable AI Gateway (`LOVABLE_API_KEY`) kullanarak PDF içeriğini AI ile parse edeceğiz. Bu yaklaşım:

1. **Daha Akıllı**: Farklı mizan formatlarını otomatik tanır
2. **Daha Esnek**: OCR benzeri sorunları aşar
3. **Daha Güvenilir**: Regex yerine semantik anlama

---

### Teknik Uygulama Planı

#### 1. Edge Function Değişiklikleri

**Dosya:** `supabase/functions/parse-trial-balance/index.ts`

**Değişiklikler:**
- `pdf-parse` kütüphanesini kaldır (Deno uyumsuz)
- PDF dosyasını Base64'e çevir
- Lovable AI Gateway'e gönder (vision destekli model)
- AI'dan yapılandırılmış JSON çıktısı al

```typescript
// YENİ: AI ile PDF parsing
async function parsePDFWithAI(buffer: ArrayBuffer): Promise<ParseResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // PDF'i base64'e çevir
  const base64PDF = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  
  // Vision destekli model ile gönder
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash', // Vision destekli
      messages: [
        { role: 'system', content: MIZAN_PARSE_PROMPT },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: 'Bu PDF mizan dosyasını parse et.' },
            { 
              type: 'image_url', 
              image_url: { url: `data:application/pdf;base64,${base64PDF}` }
            }
          ]
        }
      ],
      tools: [{ type: 'function', function: PARSE_FUNCTION_SCHEMA }],
      tool_choice: { type: 'function', function: { name: 'parse_mizan' } },
      temperature: 0.1
    })
  });
  
  // Sonucu işle
  const data = await response.json();
  return extractAccountsFromAIResponse(data);
}
```

#### 2. AI Prompt Tasarımı

```typescript
const MIZAN_PARSE_PROMPT = `Sen bir Türk muhasebe uzmanısın. 
PDF formatındaki mizan (trial balance) dosyalarını parse ediyorsun.

## GÖREV
Mizan dosyasındaki tüm hesapları çıkar ve yapılandırılmış JSON olarak döndür.

## MİZAN YAPISI
- Hesap Kodu: 3 haneli (100, 102, 600, 632, vb.)
- Hesap Adı: Türkçe (Kasa, Bankalar, Yurtiçi Satışlar, vb.)
- Borç: Dönem içi borç toplamı
- Alacak: Dönem içi alacak toplamı  
- Borç Bakiye: Borç - Alacak (pozitifse)
- Alacak Bakiye: Alacak - Borç (pozitifse)

## SAYISAL FORMAT
Türk formatı: 1.234.567,89 (nokta binlik, virgül ondalık)
Boş/eksik değerler = 0

## ÖNEMLİ HESAP KODLARI
- 1xx-2xx: Aktifler (varlıklar)
- 3xx-4xx: Pasifler (borçlar)
- 5xx: Özkaynaklar
- 6xx: Gelir/Gider hesapları

## ÇIKTI
Her hesap için:
{
  "code": "600",
  "name": "Yurtiçi Satışlar", 
  "debit": 0,
  "credit": 2500000,
  "debitBalance": 0,
  "creditBalance": 2500000
}`;
```

#### 3. Function Schema (Tool Call)

```typescript
const PARSE_FUNCTION_SCHEMA = {
  name: 'parse_mizan',
  description: 'Mizan hesaplarını parse et',
  parameters: {
    type: 'object',
    properties: {
      accounts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '3 haneli hesap kodu' },
            name: { type: 'string', description: 'Hesap adı' },
            debit: { type: 'number', description: 'Borç tutarı' },
            credit: { type: 'number', description: 'Alacak tutarı' },
            debitBalance: { type: 'number', description: 'Borç bakiyesi' },
            creditBalance: { type: 'number', description: 'Alacak bakiyesi' }
          },
          required: ['code', 'name', 'debit', 'credit', 'debitBalance', 'creditBalance']
        }
      },
      metadata: {
        type: 'object',
        properties: {
          period: { type: 'string', description: 'Dönem (Ocak-Aralık 2025)' },
          company: { type: 'string', description: 'Şirket adı' },
          totalAccounts: { type: 'number' }
        }
      }
    },
    required: ['accounts']
  }
};
```

---

### Değiştirilecek Dosyalar

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `supabase/functions/parse-trial-balance/index.ts` | Güncelle | AI ile PDF parsing ekle, pdf-parse kaldır |

---

### Alternatif Yaklaşım (Fallback)

PDF vision desteği çalışmazsa, text extraction için Deno-uyumlu bir kütüphane kullanılabilir:

```typescript
// pdfjs-dist Deno uyumlu wrapper
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs';
```

---

### Beklenen Sonuçlar

- PDF dosyaları AI tarafından akıllıca parse edilir
- Farklı mizan formatları (dikey/yatay tablo) desteklenir
- Türk sayı formatı doğru çevrilir
- Hata durumunda açıklayıcı mesajlar döner

---

### Test Senaryoları

1. Standart mizan PDF'i yükle → Hesaplar çıkarılmalı
2. Farklı formatta PDF yükle → AI adapte olmalı
3. Bozuk PDF yükle → Anlamlı hata mesajı
4. Excel dosyası yükle → Mevcut XLSX parser çalışmalı

