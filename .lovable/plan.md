

## Bilanço PDF Yükleme Hatası - Dosya Adı Sanitizasyonu

### Hata Analizi

```
Dosya yüklenemedi: Invalid key: 
8de85cec-cb06-4d8f-aa41-72f22c04eae1/balance-sheets/2025/ALFAZEN GEÇİÇİ 122025 Bilanco_Ayri.pdf
```

**Sorun:** Supabase Storage, dosya yollarında Türkçe karakterler (İ, Ç, Ğ, Ş, Ü, Ö) ve boşlukları kabul etmiyor. Dosya adı `ALFAZEN GEÇİÇİ` şu karakterleri içeriyor:
- Boşluklar (` `)
- Türkçe karakterler (`Ç`, `İ`)

---

### Etkilenen Dosyalar

| Hook | Dosya Adı Kullanımı | Sorunlu mu? |
|------|---------------------|-------------|
| `useBalanceSheetUpload.ts` | `file.name` doğrudan kullanılıyor (satır 92) | Evet |
| `useTrialBalance.ts` | `file.name` kullanılıyor (satır 53) | Evet |
| `useIncomeStatementUpload.ts` | Storage'a yüklenmiyor, edge function'a gönderiliyor | Kısmi |

---

### Çözüm

Dosya adını temizleyen bir yardımcı fonksiyon oluşturup tüm yükleme hook'larında kullanmak:

```typescript
// Türkçe karakterleri ve özel karakterleri temizle
function sanitizeFileName(fileName: string): string {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  };
  
  let sanitized = fileName;
  
  // Türkçe karakterleri değiştir
  for (const [turkish, latin] of Object.entries(turkishMap)) {
    sanitized = sanitized.split(turkish).join(latin);
  }
  
  // Boşlukları ve özel karakterleri değiştir
  sanitized = sanitized
    .replace(/\s+/g, '_')           // Boşluklar -> alt çizgi
    .replace(/[^a-zA-Z0-9._-]/g, '') // Geçersiz karakterleri kaldır
    .toLowerCase();                  // Küçük harfe çevir
  
  return sanitized;
}
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/lib/fileUtils.ts` | Yeni dosya - `sanitizeFileName` fonksiyonu |
| `src/hooks/finance/useBalanceSheetUpload.ts` | `sanitizeFileName` kullan (satır 92) |
| `src/hooks/finance/useTrialBalance.ts` | `sanitizeFileName` kullan (satır 53) |

---

### Uygulama Detayları

#### 1. Yardımcı Fonksiyon (`src/lib/fileUtils.ts`)

```typescript
export function sanitizeFileName(fileName: string): string {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  };
  
  let sanitized = fileName;
  
  for (const [turkish, latin] of Object.entries(turkishMap)) {
    sanitized = sanitized.split(turkish).join(latin);
  }
  
  return sanitized
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}
```

#### 2. Balance Sheet Hook Güncellemesi

```typescript
// Satır 92 değişikliği
import { sanitizeFileName } from '@/lib/fileUtils';

// Öncesi:
const filePath = `${user.id}/balance-sheets/${year}/${file.name}`;

// Sonrası:
const sanitizedName = sanitizeFileName(file.name);
const filePath = `${user.id}/balance-sheets/${year}/${Date.now()}-${sanitizedName}`;
```

#### 3. Trial Balance Hook Güncellemesi

```typescript
// Satır 53 değişikliği
import { sanitizeFileName } from '@/lib/fileUtils';

// Öncesi:
const fileName = `${user.id}/mizan/${year}${month ? `-${month}` : ''}-${Date.now()}-${file.name}`;

// Sonrası:
const sanitizedName = sanitizeFileName(file.name);
const fileName = `${user.id}/mizan/${year}${month ? `-${month}` : ''}-${Date.now()}-${sanitizedName}`;
```

---

### Örnek Dönüşüm

| Orijinal Dosya Adı | Sanitize Edilmiş |
|--------------------|------------------|
| `ALFAZEN GEÇİÇİ 122025 Bilanco_Ayri.pdf` | `alfazen_gecici_122025_bilanco_ayri.pdf` |
| `Mizan Raporu Aralık.xlsx` | `mizan_raporu_aralik.xlsx` |
| `2025 Yılı Bilanço (Final).pdf` | `2025_yili_bilanco_final.pdf` |

---

### Beklenen Sonuç

- Tüm dosya yüklemeleri başarılı olacak
- Türkçe karakterli dosya adları sorunsuz işlenecek
- Orijinal dosya adı `file_name` alanında saklanacak (görüntüleme için)
- Storage path'i güvenli karakterlerle oluşturulacak

