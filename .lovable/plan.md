

## Hardcoded Yıl Hesaplamaları - Analiz Raporu

### Tespit Edilen Sorunlar

`/finance/simulation/compare` sayfasında **Yatırım Senaryoları Karşılaştırması** ve **Yatırım Alamazsak Zarar** bölümlerinde yıl hesaplamaları şu mantıkla çalışıyor:

```text
┌─────────────────────────────────────────────────────────────────┐
│ MEVCUT MANTIK - getProjectionYears() kullanımı                 │
├─────────────────────────────────────────────────────────────────┤
│ getProjectionYears() → new Date().getFullYear() - 1 + 1        │
│                                                                 │
│ year1 = 2026 (internet zamanına göre sabit)                    │
│ year3 = 2029 (year1 + 3)                                       │
│ year5 = 2031 (year1 + 5)                                       │
│                                                                 │
│ SORUN: Senaryo targetYear'ı dikkate alınmıyor!                │
└─────────────────────────────────────────────────────────────────┘
```

### Hardcoded Olan Yerler

| Dosya | Satır | Sorun | Açıklama |
|-------|-------|-------|----------|
| `useInvestorAnalysis.ts` | 161 | `getProjectionYears()` | `projectFutureRevenue` içinde yıl sabit alınıyor |
| `useInvestorAnalysis.ts` | 232 | `getProjectionYears()` | `calculateExitPlan` içinde yıl sabit alınıyor |
| `useInvestorAnalysis.ts` | 319 | `getProjectionYears()` | `calculateInvestmentScenarioComparison` içinde yıl sabit alınıyor |
| `useInvestorAnalysis.ts` | 367 | `${year1} (Senaryo)` | yearlyProjections label'ı sabit yıl kullanıyor |
| `useInvestorAnalysis.ts` | 381 | `${year1 + i}` | Projeksiyon yılları sabit yıla göre hesaplanıyor |
| `InvestmentScenarioCard.tsx` | 93, 139 | `5Y Değerleme` | "5 Yıl" hardcoded label |
| `FutureImpactChart.tsx` | 50, 106-118 | `5 Yıllık`, `1./3./5. Yıl` | Yıl numaraları hardcoded |

### Beklenen Davranış

```text
┌─────────────────────────────────────────────────────────────────┐
│ OLMASI GEREKEN - Senaryo targetYear bazlı                      │
├─────────────────────────────────────────────────────────────────┤
│ Senaryo A: 2027 Büyüme  /  Senaryo B: 2026 Pozitif             │
│                                                                 │
│ max(2027, 2026) = 2027 → Bu yıl SENARYO YILI olmalı            │
│                                                                 │
│ year1 (Senaryo) = 2027                                         │
│ year3 (MOIC)    = 2030                                         │
│ year5 (MOIC)    = 2032                                         │
│                                                                 │
│ Projeksiyon: 2027, 2028, 2029, 2030, 2031, 2032                │
└─────────────────────────────────────────────────────────────────┘
```

### Çözüm Önerisi

#### 1. Fonksiyon İmzalarını Güncelle

`projectFutureRevenue`, `calculateExitPlan`, ve `calculateInvestmentScenarioComparison` fonksiyonlarına `scenarioTargetYear` parametresi ekle:

```typescript
// useInvestorAnalysis.ts

export const projectFutureRevenue = (
  year1Revenue: number, 
  year1Expenses: number,
  growthConfig: GrowthConfiguration, 
  sectorMultiple: number,
  scenarioTargetYear: number  // YENİ PARAMETRE
): { ... } => {
  // getProjectionYears() yerine scenarioTargetYear kullan
  const scenarioYear = scenarioTargetYear;
  // ...
}

export const calculateExitPlan = (
  deal: DealConfiguration,
  year1Revenue: number,
  year1Expenses: number,
  userGrowthRate: number,
  sector: string = 'default',
  scenarioTargetYear: number  // YENİ PARAMETRE
): ExitPlan => {
  const year1 = scenarioTargetYear;
  const year3 = scenarioTargetYear + 3;
  const year5 = scenarioTargetYear + 5;
  // ...
}

export const calculateInvestmentScenarioComparison = (
  scenarioA: ScenarioInputs,
  scenarioB: ScenarioInputs,
  exitPlan: ExitPlan,
  sectorMultiple: number,
  scenarioTargetYear: number  // YENİ PARAMETRE
): InvestmentScenarioComparison => {
  const year1 = scenarioTargetYear;
  // yearLabel: `${year1} (Senaryo)` → doğru yıl
}
```

#### 2. Çağrı Noktalarını Güncelle

**InvestmentTab.tsx (satır 91-93, 132-154):**
```typescript
// max(A.targetYear, B.targetYear) hesapla
const scenarioTargetYear = Math.max(scenarioA.targetYear, scenarioB.targetYear);

const exitPlan = useMemo(() => {
  return calculateExitPlan(
    dealConfig, 
    summaryA.totalRevenue, 
    summaryA.totalExpenses, 
    growthRate,
    'default',
    scenarioTargetYear  // YENİ
  );
}, [dealConfig, summaryA, growthRate, scenarioTargetYear]);

const scenarioComparison = useMemo(() => {
  return calculateInvestmentScenarioComparison(
    {...},
    {...},
    exitPlan,
    dealConfig.sectorMultiple,
    scenarioTargetYear  // YENİ
  );
}, [..., scenarioTargetYear]);
```

**ScenarioComparisonPage.tsx (satır 1070-1075):**
```typescript
const scenarioTargetYear = Math.max(
  scenarioA?.targetYear || 2026, 
  scenarioB?.targetYear || 2026
);

const exitPlan = calculateExitPlan(
  dealConfig, 
  summaryA.totalRevenue, 
  summaryA.totalExpense,
  growthRate,
  'default',
  scenarioTargetYear
);
```

#### 3. UI Bileşenlerini Güncelle

**InvestmentScenarioCard.tsx:** Props'a `scenarioYear` ekle ve dinamik label kullan
**FutureImpactChart.tsx:** Props'a `scenarioYear` ekle ve "X. Yıl" yerine gerçek yıl göster

### Değiştirilecek Dosyalar

| Dosya | Değişiklik Türü |
|-------|----------------|
| `src/hooks/finance/useInvestorAnalysis.ts` | Fonksiyon imzaları + yıl hesaplama mantığı |
| `src/components/simulation/InvestmentTab.tsx` | Fonksiyon çağrıları + scenarioTargetYear hesaplama |
| `src/pages/finance/ScenarioComparisonPage.tsx` | Fonksiyon çağrıları |
| `src/components/simulation/InvestmentScenarioCard.tsx` | Props + dinamik yıl label'ları |
| `src/components/simulation/FutureImpactChart.tsx` | Props + dinamik yıl label'ları |

### Beklenen Sonuç

| Karşılaştırma | Önceki | Sonraki |
|---------------|--------|---------|
| 2026 N vs 2026 Pozitif | 5Y Değerleme: 2031 | 5Y Değerleme: 2031 ✓ |
| 2027 vs 2026 | 5Y Değerleme: 2031 (hatalı) | 5Y Değerleme: 2032 ✓ |
| 2028 vs 2027 | 5Y Değerleme: 2031 (hatalı) | 5Y Değerleme: 2033 ✓ |

