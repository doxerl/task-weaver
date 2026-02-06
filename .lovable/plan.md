
# PDF Export - Eksik Bileşenlerin Eklenmesi

## Hedef

InvestmentTab'da görüntülenen ancak PDF export'ta bulunmayan 5 bileşeni eklemek:

1. **QuarterlyCashFlowTable** - Çeyreklik gelir/gider/net detay tablosu
2. **FutureImpactChart** - 5 yıllık projeksiyon grafiği
3. **Runway Chart** - Yatırımlı vs Yatırımsız nakit akış grafiği
4. **Growth Model Info Card** - İki aşamalı büyüme açıklaması
5. **5 Year Projection Detail Table** - Multi-year capital plan tablosu

---

## Yeni PDF Sayfaları (5 adet)

| Sayfa # | İsim | İçerik |
|---------|------|--------|
| 14 | PdfQuarterlyCashFlowPage | İki senaryo için çeyreklik gelir/gider/net tablosu + Death Valley işareti |
| 15 | PdfFutureImpactPage | 5 yıllık projeksiyon area chart + yıllık fark kartları |
| 16 | PdfRunwayChartPage | Runway line chart (withInvestment vs withoutInvestment) |
| 17 | PdfGrowthModelPage | 2-stage growth açıklaması (Years 1-2 agresif, Years 3-5 normalize) |
| 18 | PdfFiveYearProjectionPage | 5 yıllık detaylı tablo (Opening, Revenue, Expense, Death Valley, Capital Need, Year End, Valuation, MOIC) |

---

## Dosya Değişiklikleri

### 1. Yeni PDF Sayfa Bileşenleri Oluştur

**`src/components/simulation/pdf/PdfQuarterlyCashFlowPage.tsx`** (YENİ)
```text
- İki senaryo tablosu (Yatırımlı / Yatırımsız)
- Her çeyrek için: Revenue, Expense, Net, Cumulative, Capital Need
- Death Valley işaretlemesi
- Yıl sonu özeti
```

**`src/components/simulation/pdf/PdfFutureImpactPage.tsx`** (YENİ)
```text
- AreaChart: withInvestment vs withoutInvestment 5 yıllık projeksiyon
- Grid kartlar: Year 1, Year 3, Year 5 farkları
- Toplam değerleme farkı banner
```

**`src/components/simulation/pdf/PdfRunwayChartPage.tsx`** (YENİ)
```text
- LineChart: Çeyreklik nakit akış karşılaştırması
- Referans çizgisi (y=0)
- Opportunity cost göstergesi
```

**`src/components/simulation/pdf/PdfGrowthModelPage.tsx`** (YENİ)
```text
- 2-Stage Growth Model açıklaması
- Years 1-2: Agresif büyüme oranı
- Years 3-5: Normalize edilmiş büyüme
- Cap warning (eğer >100% ise)
```

**`src/components/simulation/pdf/PdfFiveYearProjectionPage.tsx`** (YENİ)
```text
- 5 satırlık tablo (Year 1-5)
- Sütunlar: Opening, Revenue, Expense, Net Profit, Death Valley, Capital Need, Year End, Valuation, MOIC
- Total satırı
- Self-sustaining badge
```

---

### 2. Types Dosyasını Güncelle

**`src/components/simulation/pdf/types.ts`**
```typescript
// YENİ: QuarterlyCashFlowPage Props
export interface PdfQuarterlyCashFlowPageProps {
  quarterlyRevenueA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyRevenueB: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseB: { q1: number; q2: number; q3: number; q4: number };
  investmentAmount: number;
  scenarioAName: string;
  scenarioBName: string;
}

// YENİ: FutureImpactPage Props
export interface PdfFutureImpactPageProps {
  scenarioComparison: InvestmentScenarioComparison;
  scenarioYear: number;
}

// YENİ: RunwayChartPage Props
export interface PdfRunwayChartPageProps {
  runwayData: Array<{
    quarter: string;
    withInvestment: number;
    withoutInvestment: number;
    difference: number;
  }>;
  scenarioAName: string;
  scenarioBName: string;
}

// YENİ: GrowthModelPage Props
export interface PdfGrowthModelPageProps {
  growthConfig: {
    aggressiveGrowthRate: number;
    normalizedGrowthRate: number;
    rawUserGrowthRate?: number;
  } | null;
  targetYear: number;
}

// YENİ: FiveYearProjectionPage Props
export interface PdfFiveYearProjectionPageProps {
  multiYearPlan: MultiYearCapitalPlan;
  dealConfig: DealConfig;
  exitPlan: ExitPlan;
}

// PdfExportContainerProps'a yeni prop'lar ekle
export interface PdfExportContainerProps {
  // ... mevcut prop'lar
  
  // YENİ: Quarterly Cash Flow
  quarterlyRevenueA?: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseA?: { q1: number; q2: number; q3: number; q4: number };
  quarterlyRevenueB?: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseB?: { q1: number; q2: number; q3: number; q4: number };
  
  // YENİ: Runway Data
  runwayData?: Array<{ quarter: string; withInvestment: number; withoutInvestment: number; difference: number }>;
  
  // YENİ: Growth Config
  growthConfig?: { aggressiveGrowthRate: number; normalizedGrowthRate: number; rawUserGrowthRate?: number } | null;
  
  // YENİ: Multi-Year Capital Plan
  multiYearCapitalPlan?: MultiYearCapitalPlan | null;
}
```

---

### 3. PdfExportContainer'ı Güncelle

**`src/components/simulation/pdf/PdfExportContainer.tsx`**
```typescript
// YENİ import'lar
import { PdfQuarterlyCashFlowPage } from './PdfQuarterlyCashFlowPage';
import { PdfFutureImpactPage } from './PdfFutureImpactPage';
import { PdfRunwayChartPage } from './PdfRunwayChartPage';
import { PdfGrowthModelPage } from './PdfGrowthModelPage';
import { PdfFiveYearProjectionPage } from './PdfFiveYearProjectionPage';

// Container içinde yeni sayfa proplarını al ve render et
// PAGE 14: QUARTERLY CASH FLOW
{quarterlyRevenueA && quarterlyExpenseA && quarterlyRevenueB && quarterlyExpenseB && (
  <PdfQuarterlyCashFlowPage
    quarterlyRevenueA={quarterlyRevenueA}
    quarterlyExpenseA={quarterlyExpenseA}
    quarterlyRevenueB={quarterlyRevenueB}
    quarterlyExpenseB={quarterlyExpenseB}
    investmentAmount={dealConfig.investmentAmount}
    scenarioAName={...}
    scenarioBName={...}
  />
)}

// PAGE 15: FUTURE IMPACT
{scenarioComparison && (
  <PdfFutureImpactPage
    scenarioComparison={scenarioComparison}
    scenarioYear={...}
  />
)}

// PAGE 16: RUNWAY CHART
{runwayData && runwayData.length > 0 && (
  <PdfRunwayChartPage
    runwayData={runwayData}
    scenarioAName={...}
    scenarioBName={...}
  />
)}

// PAGE 17: GROWTH MODEL
{growthConfig && (
  <PdfGrowthModelPage
    growthConfig={growthConfig}
    targetYear={...}
  />
)}

// PAGE 18: FIVE YEAR PROJECTION
{multiYearCapitalPlan && (
  <PdfFiveYearProjectionPage
    multiYearPlan={multiYearCapitalPlan}
    dealConfig={dealConfig}
    exitPlan={pdfExitPlan}
  />
)}
```

---

### 4. Index Dosyasını Güncelle

**`src/components/simulation/pdf/index.ts`**
```typescript
// YENİ export'lar
export { PdfQuarterlyCashFlowPage } from './PdfQuarterlyCashFlowPage';
export { PdfFutureImpactPage } from './PdfFutureImpactPage';
export { PdfRunwayChartPage } from './PdfRunwayChartPage';
export { PdfGrowthModelPage } from './PdfGrowthModelPage';
export { PdfFiveYearProjectionPage } from './PdfFiveYearProjectionPage';

// YENİ type export'ları
export type {
  PdfQuarterlyCashFlowPageProps,
  PdfFutureImpactPageProps,
  PdfRunwayChartPageProps,
  PdfGrowthModelPageProps,
  PdfFiveYearProjectionPageProps,
} from './types';
```

---

### 5. ScenarioComparisonPage'den Veri Akışı

**`src/pages/finance/ScenarioComparisonPage.tsx`**
```typescript
// Mevcut InvestmentTab'a gönderilen verileri PDF container'a da gönder

// quarterlyRevenueA, quarterlyExpenseA zaten mevcut - useMemo ile hesaplanıyor
// quarterlyRevenueB, quarterlyExpenseB zaten mevcut

// runwayData - InvestmentTab içinde hesaplanıyor, dışarı çıkar
const runwayData = useMemo(() => {
  // InvestmentTab.tsx satır 185-204'deki aynı mantık
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  // ... hesaplama
}, [quarterlyA, quarterlyB, dealConfig.investmentAmount]);

// growthConfig - exitPlan'dan al
const growthConfig = exitPlan?.growthConfig || null;

// multiYearCapitalPlan - InvestmentTab'da hesaplanan, dışarı çıkar
const multiYearCapitalPlan = useMemo(() => {
  return calculateMultiYearCapitalNeeds(...);
}, [...]);

// PdfExportContainer'a yeni prop'ları ekle
<PdfExportContainer
  // ... mevcut prop'lar
  quarterlyRevenueA={quarterlyRevenueA}
  quarterlyExpenseA={quarterlyExpenseA}
  quarterlyRevenueB={quarterlyRevenueB}
  quarterlyExpenseB={quarterlyExpenseB}
  runwayData={runwayData}
  growthConfig={growthConfig}
  multiYearCapitalPlan={multiYearCapitalPlan}
/>
```

---

### 6. i18n Çeviri Key'leri

**`src/i18n/locales/en/simulation.json`** ve **`tr/simulation.json`**
```json
{
  "pdf": {
    "quarterlyCashFlow": {
      "title": "Quarterly Cash Flow Analysis",
      "invested": "With Investment ({{name}})",
      "uninvested": "Without Investment ({{name}})",
      "quarter": "Q",
      "revenue": "Revenue",
      "expense": "Expense",
      "net": "Net",
      "cumulative": "Cumulative",
      "need": "Need",
      "yearEnd": "Year End",
      "startingBalance": "Starting: {{amount}}"
    },
    "futureImpact": {
      "title": "5-Year Revenue Projection",
      "withInvestment": "With Investment",
      "withoutInvestment": "Without Investment",
      "yearDiff": "Year {{year}} Difference",
      "totalDifference": "Total 5-Year Difference"
    },
    "runwayChart": {
      "title": "Cash Flow Runway Comparison",
      "description": "Cumulative cash position by quarter"
    },
    "growthModel": {
      "title": "Two-Stage Growth Model",
      "years1to2": "Years 1-2 (Aggressive)",
      "years3to5": "Years 3-5 (Normalized)",
      "capWarning": "Growth rate capped at 100%"
    },
    "fiveYearProjection": {
      "title": "5-Year Financial Projection",
      "year": "Year",
      "opening": "Opening",
      "revenue": "Revenue",
      "expense": "Expense",
      "netProfit": "Net Profit",
      "deathValley": "Death Valley",
      "capitalNeed": "Capital Need",
      "yearEnd": "Year End",
      "valuation": "Valuation",
      "moic": "MOIC",
      "total": "Total"
    }
  }
}
```

---

## PDF Sayfa Sıralaması (Güncellenmiş)

| # | Sayfa | İçerik |
|---|-------|--------|
| 1 | Cover | Kapak |
| 2 | Metrics | Finansal özet tablosu |
| 3 | Charts | Çeyreklik karşılaştırma grafikleri |
| 4 | Financial Ratios | Profesyonel analiz metrikleri |
| 5 | Revenue/Expense | Kalem bazlı karşılaştırma |
| 6 | Investor | Deal analizi |
| 7 | Capital Analysis | Death Valley, Runway |
| 8 | Valuation | 4 değerleme yöntemi |
| 9 | Investment Options | Min/Önerilen/Agresif |
| 10 | Scenario Impact | Yatırımlı vs Yatırımsız |
| 11 | Projection | Düzenlenebilir projeksiyon |
| 12 | Focus Project | Yatırım dağılımı |
| 13 | AI Insights | AI önerileri |
| **14** | **Quarterly Cash Flow** | **Çeyreklik gelir/gider tablosu** |
| **15** | **Future Impact** | **5 yıllık projeksiyon grafiği** |
| **16** | **Runway Chart** | **Nakit akış karşılaştırma** |
| **17** | **Growth Model** | **2-stage büyüme modeli** |
| **18** | **5-Year Projection** | **Detaylı 5 yıllık tablo** |

---

## Dosya Değişiklikleri Özeti

| Dosya | Eylem |
|-------|-------|
| `src/components/simulation/pdf/PdfQuarterlyCashFlowPage.tsx` | YENİ |
| `src/components/simulation/pdf/PdfFutureImpactPage.tsx` | YENİ |
| `src/components/simulation/pdf/PdfRunwayChartPage.tsx` | YENİ |
| `src/components/simulation/pdf/PdfGrowthModelPage.tsx` | YENİ |
| `src/components/simulation/pdf/PdfFiveYearProjectionPage.tsx` | YENİ |
| `src/components/simulation/pdf/types.ts` | GÜNCELLE - Yeni type'lar |
| `src/components/simulation/pdf/PdfExportContainer.tsx` | GÜNCELLE - Yeni sayfaları ekle |
| `src/components/simulation/pdf/index.ts` | GÜNCELLE - Export'lar |
| `src/pages/finance/ScenarioComparisonPage.tsx` | GÜNCELLE - Yeni prop'lar hesapla ve gönder |
| `src/i18n/locales/en/simulation.json` | GÜNCELLE - Yeni çeviri key'leri |
| `src/i18n/locales/tr/simulation.json` | GÜNCELLE - Yeni çeviri key'leri |

---

## Sonuç

Bu implementasyonla:
- ✅ PDF export, UI'daki tüm InvestmentTab içeriğini kapsayacak
- ✅ 5 yeni sayfa ile toplam 18 sayfalık kapsamlı rapor
- ✅ i18n desteği ile EN/TR dil uyumluluğu
- ✅ "What You See Is What You Export" prensibi tam uygulanacak
