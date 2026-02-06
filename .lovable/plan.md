
# PDF Export - Hardcoded Değer ve Çeviri Düzeltmeleri

## Tespit Edilen Sorunlar

### 1. Eksik/Yanlış Çeviri Key'leri (i18n)

**Görüntüdeki Problem:** `pdf.investor.expenses` → Ekranda key olarak görünüyor

| Sorun | Dosya | Satır | Mevcut | Olması Gereken |
|-------|-------|-------|--------|----------------|
| Eksik çeviri | PdfInvestorPage.tsx | 263 | `t('pdf.investor.expenses')` | Key mevcut değil, `t('pdf.investor.expense')` kullanılmalı |
| Hardcoded "Pre-Money Valuation" | PdfInvestorPage.tsx | 142 | `"Pre-Money Valuation"` | `t('pdf.investor.preMoneyValuation')` |
| PDF key çakışması | simulation.json | 572 & 1212 | İki ayrı `"pdf"` objesi | Tek obje olmalı |

### 2. Hardcoded Değerler ve Hesaplamalar

**PdfValuationPage.tsx:**
| Satır | Hardcoded | Açıklama |
|-------|-----------|----------|
| 52 | `1.5` | EBITDA multiple faktörü hardcoded |
| 53 | `0.9` | DCF estimate faktörü hardcoded |
| 54 | `10` | VC method ROI target hardcoded |
| 57-61 | `0.30, 0.25, 0.30, 0.15` | Valuation weight'leri hardcoded |
| 86 | `30` | Discount rate hardcoded |
| 95 | `10` | Target ROI hardcoded |

**PdfInvestorPage.tsx:**
| Satır | Hardcoded | Açıklama |
|-------|-----------|----------|
| 101 | `$` prefix | Para birimi hardcoded |
| 145-149 | Hesaplama | Pre-money calculation inline, centralize edilmeli |

### 3. UI ve PDF Arasındaki Veri Uyumsuzluğu

Görüntülerdeki karşılaştırma:

**UI (5 Yıllık Projeksiyon Tablosu):**
- 2027: Opening $33.9K, Revenue $759.2K, Expense $586.0K, Net Kar $173.2K
- Death Valley: -$7.4K (Q1)
- Sermaye İhtiyacı: $8.9K
- Değerleme: $2.4M, MOIC: 0.9x

**PDF (Çıkış Stratejisi 5 Yıllık Finansal Projeksiyon):**
- Year 1: Revenue $446.6K, Expense $412.7K, Net Kar $33.9K
- Değerleme: $1.2M, MOIC: 0.5x

→ **Veri kaynağı farklı!** UI `multiYearCapitalPlan` kullanırken PDF `pdfExitPlan.allYears` kullanıyor.

---

## Düzeltme Planı

### Aşama 1: i18n Çeviri Düzeltmeleri

**`src/i18n/locales/tr/simulation.json`:**
```json
// Satır 572'deki ilk "pdf" objesi korunacak
// Satır 1212'deki ikinci "pdf" objesi birleştirilecek

// Eksik key'ler eklenecek:
"pdf": {
  // ... mevcut key'ler
  "investor": {
    // "expenses" → "expense" düzeltmesi MEVCUT (satır 1311)
    // Sorun: PdfInvestorPage yanlış key kullanıyor
  }
}
```

**`src/i18n/locales/en/simulation.json`:**
- Aynı düzeltmeler

### Aşama 2: PdfInvestorPage.tsx Düzeltmeleri

```typescript
// Satır 142: Hardcoded string → i18n
- <p>Pre-Money Valuation</p>
+ <p>{t('pdf.investor.preMoneyValuation')}</p>

// Satır 263: Yanlış key düzeltmesi
- {t('pdf.investor.expenses')}
+ {t('pdf.investor.expense')}
```

### Aşama 3: PdfValuationPage.tsx - Hesaplamaları Props'tan Al

**Mevcut (hardcoded):**
```typescript
const ebitdaMultiple = ebitda * (dealConfig.sectorMultiple * 1.5);
const dcfValue = year5?.companyValuation || revenueMultiple * 0.9;
const vcMethodValue = safeDivide(revenueMultiple, 10, 0) * 10;

const weightedValuation =
  revenueMultiple * 0.30 +
  ebitdaMultiple * 0.25 +
  dcfValue * 0.30 +
  vcMethodValue * 0.15;
```

**Düzeltme yaklaşımı:**
1. `ValuationMethodsCard` bileşeni zaten bu hesaplamaları yapıyor
2. Hesaplama mantığını `valuationCalculator.ts` utility'sine taşı
3. PDF sayfası bu utility'yi kullanarak hesaplasın veya props olarak alsın

### Aşama 4: PDF Veri Kaynağı Senkronizasyonu

**Problem:** `PdfInvestorPage` içindeki "5 Yıllık Projeksiyon" tablosu `pdfExitPlan.allYears` kullanıyor, ama UI'daki "5 Yıllık Projeksiyon Tablosu" `multiYearCapitalPlan` kullanıyor.

**Çözüm:**
1. `PdfInvestorPage` içindeki mini projeksiyon tablosunu kaldır (çünkü Page 18 zaten detaylı tablo içeriyor)
2. VEYA `multiYearCapitalPlan` verilerini kullanacak şekilde güncelle

---

## Dosya Değişiklikleri

| Dosya | Değişiklik Türü | Açıklama |
|-------|-----------------|----------|
| `src/components/simulation/pdf/PdfInvestorPage.tsx` | GÜNCELLE | Hardcoded string'leri i18n'e çevir, yanlış key'i düzelt |
| `src/components/simulation/pdf/PdfValuationPage.tsx` | GÜNCELLE | Valuation hesaplamalarını utility'den al |
| `src/i18n/locales/tr/simulation.json` | GÜNCELLE | Duplicate pdf objelerini birleştir |
| `src/i18n/locales/en/simulation.json` | GÜNCELLE | Duplicate pdf objelerini birleştir |
| `src/lib/valuationCalculator.ts` | GÜNCELLE | Valuation config'i export et |

---

## Teknik Detaylar

### i18n JSON Yapı Düzeltmesi

Mevcut JSON'da iki `"pdf"` objesi var (satır 572 ve 1212). JSON'da aynı isimde iki key olamaz - ikincisi birinciyi override eder. Bu yüzden bazı key'ler kaybolmuş olabilir.

```json
// YANLIŞ - iki ayrı "pdf" objesi
{
  "pdf": { /* ilk grup */ },    // Satır 572
  // ... diğer key'ler
  "pdf": { /* ikinci grup */ }  // Satır 1212 - Bu ilkini override eder!
}

// DOĞRU - tek "pdf" objesi, tüm child'lar içinde
{
  "pdf": {
    "export": "...",
    "investor": { /* ... */ },
    "valuation": { /* ... */ },
    "scenarioImpact": { /* ... */ },
    // ... tümü burada
  }
}
```

### Valuation Hesaplama Standartlaştırma

`src/lib/valuationCalculator.ts` içindeki `DEFAULT_VALUATION_CONFIG` kullanılmalı:

```typescript
export const DEFAULT_VALUATION_CONFIG: ValuationConfig = {
  sectorMultiple: 3.0,
  ebitdaMultiple: 8.0,
  discountRate: 0.30,
  terminalGrowthRate: 0.03,
  taxRate: 0.22,
  weights: {
    revenue: 0.30,
    ebitda: 0.25,
    dcf: 0.30,
    vc: 0.15,
  },
};
```

---

## Sonuç

Bu düzeltmelerle:
- ✅ Tüm PDF metinleri i18n üzerinden gelecek (hardcoded string yok)
- ✅ Hesaplamalar merkezi utility'den alınacak (tutarlılık)
- ✅ UI ve PDF aynı veri kaynağını kullanacak (senkronizasyon)
- ✅ JSON yapısı düzeltilecek (duplicate key sorunu çözülecek)
