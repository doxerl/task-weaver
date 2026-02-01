

## Mizan PDF Alt Hesap (Muavin) Desteği

### Problem

PDF'deki boşluklu hesap kodları tanınmıyor:

| PDF'deki Format | Mevcut Regex | Sonuç |
|-----------------|--------------|-------|
| `320` | `/^\d{3}(\.\d+)*$/` | Tanınıyor |
| `320.001` | `/^\d{3}(\.\d+)*$/` | Tanınıyor |
| `320 001` | `/^\d{3}(\.\d+)*$/` | TANINAMIYOR |
| `320 1 006` | `/^\d{3}(\.\d+)*$/` | TANINAMIYOR |

### Cozum

#### 1. Edge Function Guncellemesi

**Dosya: `supabase/functions/parse-trial-balance/index.ts`**

##### a) `normalizeAccountCode()` Fonksiyonu Ekle

Bosluklu kodlari noktaliya donusturecek yeni fonksiyon:

```typescript
function normalizeAccountCode(code: string): string {
  // "320 001" -> "320.001"
  // "320 1 006" -> "320.1.006"
  return code.trim().replace(/\s+/g, '.');
}
```

##### b) `isValidAccountCode()` Guncelle

Hem bosluklu hem noktali formatlari kabul et:

```typescript
// Onceki: /^\d{3}(\.\d+)*$/
// Sonraki: /^\d{3}([\.\s]+\d+)*$/
function isValidAccountCode(code: string): boolean {
  const trimmed = code.trim();
  return /^\d{3}([\.\s]+\d+)*$/.test(trimmed);
}
```

##### c) `isSubAccount()` Guncelle

```typescript
function isSubAccount(code: string): boolean {
  // Nokta veya bosluk iceriyorsa alt hesaptir
  return /[\.\s]/.test(code);
}
```

##### d) `getBaseAccountCode()` Guncelle

```typescript
function getBaseAccountCode(code: string): string {
  // Ilk 3 haneyi al (nokta veya bosluktan once)
  return code.split(/[\.\s]/)[0].substring(0, 3);
}
```

##### e) AI Prompt Guncelle

Alt hesap formatlarini acikca belirt:

```typescript
const MIZAN_PARSE_PROMPT = `...
## ALT HESAP FORMATLARI
Alt hesaplar su formatlarda olabilir:
- 320.01, 320.001, 320.01.001 (noktali)
- 320 01, 320 001, 320 1 006 (bosluklu)
- Her iki formati da tani ve parse et

## ONEMLI ORNEKLER
| PDF'deki Kod | Tip | parentCode |
|--------------|-----|------------|
| 320 | Ana hesap | - |
| 320 001 | Alt hesap | 320 |
| 320 1 006 | Alt hesap | 320 |
| 320.01.003 | Alt hesap | 320 |
...`;
```

##### f) Parse Akisini Guncelle

`parsePDFWithAI()` ve `parseExcel()` fonksiyonlarinda kodu normalize et:

```typescript
for (const acc of aiAccounts) {
  const rawCode = String(acc.code || '').trim();
  if (!isValidAccountCode(rawCode)) continue;
  
  const code = normalizeAccountCode(rawCode);  // "320 001" -> "320.001"
  const baseCode = getBaseAccountCode(code);
  // ... devami ayni
}
```

### Degistirilecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `supabase/functions/parse-trial-balance/index.ts` | Regex, fonksiyonlar ve AI prompt guncelle |

### Beklenen Sonuc

**Oncesi:**
- PDF yuklendi: 15 hesap
- Onizlemede: Sadece ana hesaplar (320, 600, 632...)
- Alt hesaplar (320 001, 320 1 006) kayboluyor

**Sonrasi:**
- PDF yuklendi: 15 hesap + 48 alt hesap
- Onizlemede: Ana hesabin yaninda "(3 alt hesap)" + chevron ikonu
- Tiklandiginda: METRO GROSMARKET, RADSAN GRUP, DOGRU GRUP listeleniyor

### Test Senaryosu

1. PDF yukle (bosluklu alt hesaplar iceren)
2. "Onizle" butonuna tikla
3. 320 SATICILAR satirinda "(X alt hesap)" gorunmeli
4. Chevron ikonuna tikla
5. Alt hesaplar genislemeli: 320.001 METRO GROSMARKET vb.

