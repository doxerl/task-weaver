

## PDF Desteği Ekleme Planı - Mizan Yükleyici

### Mevcut Durum

Şu an yalnızca Excel formatları destekleniyor:
- **UI**: `accept=".xlsx,.xls"`  
- **Edge Function**: Sadece Excel parse mantığı var
- **Hata**: PDF yüklenirse "Only Excel files supported" hatası

---

### Yapılacak Değişiklikler

#### 1. Edge Function Güncelleme: `parse-trial-balance`

**Dosya:** `supabase/functions/parse-trial-balance/index.ts`

PDF parsing için `pdfjs-serverless` kütüphanesi eklenecek:

```typescript
import { getDocument } from 'https://esm.sh/pdfjs-serverless';

async function parsePDF(buffer: ArrayBuffer): Promise<ParseResult> {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  
  let fullText = '';
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  // Parse text to extract account data
  return parseTextToAccounts(fullText);
}

function parseTextToAccounts(text: string): ParseResult {
  // Satır satır analiz
  // Hesap kodu (3 haneli), hesap adı, borç, alacak pattern'i ara
  // Örnek: "100 Kasa 5.000,00 3.000,00"
}
```

**Dosya uzantısı kontrolü güncellenir:**
```typescript
const fileName = file.name.toLowerCase();
const isPDF = fileName.endsWith('.pdf');
const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

if (!isPDF && !isExcel) {
  throw new Error('Desteklenen formatlar: Excel (.xlsx, .xls) veya PDF');
}

const buffer = await file.arrayBuffer();
const result = isPDF ? await parsePDF(buffer) : await parseExcel(buffer);
```

---

#### 2. UI Bileşen Güncelleme: `TrialBalanceUploader`

**Dosya:** `src/components/finance/TrialBalanceUploader.tsx`

| Satır | Değişiklik |
|-------|-----------|
| 104 | Açıklama: "Excel veya PDF formatı" |
| 129-130 | Metin: "Excel veya PDF dosyasını sürükleyip bırakın" |
| 139 | Accept: `.xlsx,.xls,.pdf` |
| 144-145 | Desteklenen formatlar: ".xlsx, .xls, .pdf" |
| 155 | İkon: PDF için `FileText`, Excel için `FileSpreadsheet` |

---

#### 3. PDF Parse Mantığı (Detay)

Türk mizan PDF'leri genelde tablo formatında olur:

```
HESAP KODU  HESAP ADI           BORÇ          ALACAK        BORÇ BAK.     ALACAK BAK.
100         Kasa                5.000,00      3.000,00      2.000,00      0,00
102         Bankalar            1.500.000,00  1.200.000,00  300.000,00    0,00
600         Yurtiçi Satışlar    0,00          2.500.000,00  0,00          2.500.000,00
```

**Parse stratejisi:**
1. Her satırı analiz et
2. 3 haneli sayı ile başlayan satırları hesap olarak kabul et
3. Sayısal değerleri Türk formatından (1.234,56) parse et
4. Hesap koduna göre gruplama yap

---

### Değiştirilecek Dosyalar

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `supabase/functions/parse-trial-balance/index.ts` | Güncelle | PDF parsing ekle |
| `src/components/finance/TrialBalanceUploader.tsx` | Güncelle | .pdf accept, metin güncellemeleri |

---

### Test Senaryoları

1. Excel dosyası yükle - mevcut işlevsellik korunmalı
2. PDF dosyası yükle - hesaplar parse edilmeli
3. Desteklenmeyen format (.doc, .txt) - hata mesajı gösterilmeli
4. Bozuk PDF - graceful error handling

