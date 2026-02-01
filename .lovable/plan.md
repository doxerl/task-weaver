
## PDF'den Yatırımcı Sunumu Sayfasını Kaldırma ve Build Hatalarını Düzeltme

### Mevcut Durum

Kullanıcı, PDF export işleminde "Yatırımcı Sunumu" (PdfPitchDeckPage) sayfasının kaldırılmasını istiyor. Ayrıca çeşitli TypeScript build hataları var.

### Build Hataları

| Hata | Dosya | Açıklama |
|------|-------|----------|
| TS2459 | `types.ts`, `SimulationContext.tsx` | `UnifiedAnalysisResult` locally declared ama export edilmiyor |
| TS2322 | `ScenarioComparisonPage.tsx:1847` | `calculateDiff` return type: `{ value, percent }` vs expected `{ absolute, percent }` |
| TS2322 | `ScenarioComparisonPage.tsx:1858` | `pdfExitPlan.yearLabels.moic3Year` type: `number` vs expected `string` |

### Çözüm Planı

#### 1. PdfPitchDeckPage Sayfasını Kaldır

**Dosya: `src/components/simulation/pdf/PdfExportContainer.tsx`**

```diff
- import { PdfPitchDeckPage } from './PdfPitchDeckPage';

  // Container içinden kaldır:
- {/* PAGE 7: PITCH DECK (Last page - no page break) */}
- <PdfPitchDeckPage
-   unifiedAnalysis={unifiedAnalysis}
- />
```

#### 2. UnifiedAnalysisResult Import Düzeltmesi

**Dosya: `src/components/simulation/pdf/types.ts`**

```diff
- import type { UnifiedAnalysisResult } from '@/hooks/finance/useUnifiedAnalysis';
+ import type { UnifiedAnalysisResult } from '@/types/simulation';
```

**Dosya: `src/contexts/SimulationContext.tsx`**

```diff
- import type { UnifiedAnalysisResult } from '@/hooks/finance/useUnifiedAnalysis';
+ import type { UnifiedAnalysisResult } from '@/types/simulation';
```

#### 3. calculateDiff Return Type Düzeltmesi

**Dosya: `src/pages/finance/ScenarioComparisonPage.tsx`** (satır 212-216)

Mevcut:
```typescript
const calculateDiff = (a: number, b: number): { value: number; percent: number } => {
  const diff = b - a;
  const percent = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : b !== 0 ? 100 : 0;
  return { value: diff, percent };
};
```

Düzeltilmiş:
```typescript
const calculateDiff = (a: number, b: number): { absolute: number; percent: number } => {
  const diff = b - a;
  const percent = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : b !== 0 ? 100 : 0;
  return { absolute: diff, percent };
};
```

**DiffBadge bileşeni de güncellenmeli** (satır 247-259):
```diff
const DiffBadge = ({ diff, format, higherIsBetter }: { 
  diff: { absolute: number; percent: number }; 
  ...
}) => {
- const isPositive = diff.value > 0;
- const isNeutral = diff.value === 0;
+ const isPositive = diff.absolute > 0;
+ const isNeutral = diff.absolute === 0;
  ...
- {isPositive ? '+' : ''}{format === 'percent' ? `${diff.value.toFixed(1)}pp` : `${diff.percent.toFixed(1)}%`}
+ {isPositive ? '+' : ''}{format === 'percent' ? `${diff.absolute.toFixed(1)}pp` : `${diff.percent.toFixed(1)}%`}
};
```

#### 4. pdfExitPlan Type Uyumsuzluğu

**Dosya: `src/components/simulation/pdf/types.ts`** (satır 89-103)

Mevcut type `yearLabels.moic3Year` ve `moic5Year` string bekliyor ama number geliyor. Type'ı düzeltmemiz gerekiyor:

```typescript
export interface PdfExitPlanData {
  moic3Year: number;
  moic5Year: number;
  investorShare5Year: number;
  year5Projection?: ExitPlanYear;
  yearLabels?: {
    moic3Year?: string;  // Doğru - string olmalı (örn: "2029")
    moic5Year?: string;  // Doğru - string olmalı (örn: "2031")
  };
  allYears?: ExitPlanYear[];
  growthConfig?: {
    aggressiveGrowthRate: number;
    normalizedGrowthRate: number;
  };
}
```

Sorun aslında `ScenarioComparisonPage.tsx`'de `pdfExitPlan` oluştururken `yearLabels`'a yanlış değer atanmasından kaynaklanıyor. Bu noktayı bulmak için sayfa kodunu inceleyeceğim ve düzelteceğim.

#### 5. Barrel Export Güncelle

**Dosya: `src/components/simulation/pdf/index.ts`**

```diff
- export { PdfPitchDeckPage } from './PdfPitchDeckPage';
...
- export type {
    ...
-   PdfPitchDeckPageProps,
    ...
  } from './types';
```

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/components/simulation/pdf/PdfExportContainer.tsx` | PdfPitchDeckPage import ve render kaldır |
| `src/components/simulation/pdf/index.ts` | PdfPitchDeckPage export kaldır |
| `src/components/simulation/pdf/types.ts` | UnifiedAnalysisResult import düzelt |
| `src/contexts/SimulationContext.tsx` | UnifiedAnalysisResult import düzelt |
| `src/pages/finance/ScenarioComparisonPage.tsx` | calculateDiff return type + DiffBadge + pdfExitPlan düzelt |

### Beklenen Sonuç

1. PDF'de artık "Yatırımcı Sunumu" sayfası olmayacak
2. Build hataları çözülecek
3. PDF şu sayfalarda kalacak:
   - Cover Page
   - Metrics Page
   - Charts Page
   - Financial Ratios Page
   - Revenue/Expense Page
   - Investor Page (Deal Analysis - bu kalıyor)
   - Projection Page
   - Focus Project Page
   - AI Insights Page
