
# PDF Export Hesaplama Eliminasyonu

## Problem Özeti

PDF export bileşenleri (`PdfValuationPage.tsx`) kendi hesaplamalarını yapıyor, oysa bu değerler zaten `pdfExitPlan.allYears[].valuations` içinde mevcut. Bu durum:
- UI ve PDF arasında veri uyumsuzluğuna
- Kod tekrarına (DRY ihlali)
- Bakım zorluğuna yol açıyor

## Mevcut Durum Analizi

### `pdfExitPlan.allYears[]` Yapısı (MultiYearProjection)
```text
allYears[].valuations = {
  revenueMultiple: number,    // ✅ Zaten hesaplanmış
  ebitdaMultiple: number,     // ✅ Zaten hesaplanmış
  dcf: number,                // ✅ Zaten hesaplanmış
  vcMethod: number,           // ✅ Zaten hesaplanmış
  weighted: number            // ✅ Zaten hesaplanmış
}

allYears[].ebitda: number       // ✅ EBITDA değeri
allYears[].ebitdaMargin: number // ✅ EBITDA marjı
allYears[].freeCashFlow: number // ✅ FCF
```

### PdfValuationPage.tsx - Gereksiz Hesaplamalar (Satır 43-61)
```typescript
// ❌ GEREKSIZ - Bu değerler zaten allYears içinde var
const ebitda = revenue - expenses;
const revenueMultiple = revenue * (dealConfig?.sectorMultiple || 3);
const ebitdaMultiple = ebitda * ebitdaMultiplier;
const dcfValue = year5?.companyValuation || revenueMultiple * 0.9;
const vcMethodValue = safeDivide(revenueMultiple, expectedROI, 0) * expectedROI;
const weightedValuation = ...;
```

## Çözüm: Props'tan Gelen Hazır Verileri Kullan

### Değişiklik 1: PdfValuationPage.tsx Refaktörü

**Kaldırılacak:**
- Satır 35-61: Tüm valuation hesaplamaları
- `safeDivide` utility fonksiyonu

**Yeni Yaklaşım:**
```typescript
// Year 5 verilerini direkt al
const year5 = pdfExitPlan?.allYears?.[4]; // 5. yıl (index 4)

// Hazır değerleri kullan
const revenueMultiple = year5?.valuations?.revenueMultiple || 0;
const ebitdaMultiple = year5?.valuations?.ebitdaMultiple || 0;
const dcfValue = year5?.valuations?.dcf || 0;
const vcMethodValue = year5?.valuations?.vcMethod || 0;
const weightedValuation = year5?.valuations?.weighted || 0;
const ebitda = year5?.ebitda || 0;
```

### Değişiklik 2: Props Güncellemesi (types.ts)

`PdfValuationPageProps` arayüzüne `weights` bilgisini ekle:
```typescript
export interface PdfValuationPageProps {
  pdfExitPlan: PdfExitPlanData | null;
  dealConfig: DealConfig;
  // Weights görsel gösterim için eklenebilir (opsiyonel)
  valuationWeights?: {
    revenueMultiple: number;
    ebitdaMultiple: number;
    dcf: number;
    vcMethod: number;
  };
}
```

### Değişiklik 3: PdfExportContainer.tsx Props Geçişi

Mevcut yapı yeterli - `pdfExitPlan` zaten tüm verileri içeriyor.

## Dosya Değişiklikleri

| Dosya | Değişiklik | Satır |
|-------|-----------|-------|
| `src/components/simulation/pdf/PdfValuationPage.tsx` | Hesaplamaları kaldır, props'tan oku | 28-105 |

## Teknik Detaylar

### PdfValuationPage.tsx - Yeni Implementasyon

```typescript
export function PdfValuationPage({
  pdfExitPlan,
  dealConfig,
}: PdfValuationPageProps) {
  const { t } = useTranslation(['simulation']);

  // Year 5 verilerini direkt al (hesaplama YAPMIYORUZ)
  const year5 = pdfExitPlan?.allYears?.[4];

  // Hazır valuation değerlerini oku
  const valuations = year5?.valuations;
  const revenueMultiple = valuations?.revenueMultiple || 0;
  const ebitdaMultiple = valuations?.ebitdaMultiple || 0;
  const dcfValue = valuations?.dcf || 0;
  const vcMethodValue = valuations?.vcMethod || 0;
  const weightedValuation = valuations?.weighted || 0;

  // EBITDA değeri de hazır
  const ebitda = year5?.ebitda || 0;
  const revenue = year5?.revenue || 0;

  // Weight'ler merkezi config'den alınabilir (görsel amaçlı)
  const { weights } = DEFAULT_VALUATION_CONFIG;

  // useMemo - valuation kartları için
  const valuationMethods = useMemo(() => [
    {
      name: t('pdf.valuation.revenueMultiple'),
      value: revenueMultiple,
      formula: `${formatCompactUSD(revenue)} × ${dealConfig?.sectorMultiple || 3}x`,
      weight: `${(weights.revenueMultiple * 100).toFixed(0)}%`,
      // ... styling
    },
    // ... diğer 3 method
  ], [t, revenueMultiple, ebitdaMultiple, dcfValue, vcMethodValue, ...]);

  // ...rest of component
}
```

### Veri Akışı (Yeni)

```text
┌─────────────────────────────────────────────────────────────┐
│                  ScenarioComparisonPage                     │
│                                                             │
│  calculateExitPlan() → pdfExitPlan                         │
│    └── allYears[0-4].valuations = {                        │
│          revenueMultiple, ebitdaMultiple, dcf, vc, weighted│
│        }                                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  PdfExportContainer                         │
│                                                             │
│  <PdfValuationPage                                          │
│    pdfExitPlan={pdfExitPlan}  ← Tüm veriler burada         │
│    dealConfig={dealConfig}                                  │
│  />                                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  PdfValuationPage                           │
│                                                             │
│  ❌ ÖNCE: const ebitda = revenue - expenses;               │
│  ❌ ÖNCE: const weightedValuation = ... hesapla            │
│                                                             │
│  ✅ SONRA: const weightedValuation = year5.valuations.weighted │
│  ✅ SONRA: const ebitda = year5.ebitda                     │
│                                                             │
│  → HESAPLAMA YOK, SADECE RENDER                            │
└─────────────────────────────────────────────────────────────┘
```

## Beklenen Sonuçlar

- ✅ PDF değerleri UI ile birebir eşleşecek
- ✅ Tek kaynak ilkesi (Single Source of Truth) sağlanacak
- ✅ ~30 satır gereksiz hesaplama kodu kaldırılacak
- ✅ Bakım kolaylığı artacak
- ✅ Tutarsızlık riski ortadan kalkacak

## Risk ve Dikkat Edilecekler

1. `pdfExitPlan.allYears` boş veya undefined olabilir → null check gerekli
2. `valuations` objesi eski verilerde eksik olabilir → fallback değerler kullan
3. Test: PDF export'u hem yeni hem eski senaryolarla test et
