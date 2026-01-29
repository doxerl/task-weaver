
## Exit Plan & 5 Yıllık Projeksiyon - AI Entegrasyonu Planı

### Problem Analizi

Mevcut sistemde iki farklı veri kaynağı çakışıyor:

```text
┌─────────────────────────────────────────────────────────────────┐
│  MEVCUT DURUM: İKİ FARKLI VERİ KAYNAĞI                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI Projeksiyonu (next_year_projection):                       │
│  ├── 2027 Gelir: $580.6K (AI tarafından üretildi)              │
│  ├── 2027 Gider: $503.4K (AI tarafından üretildi)              │
│  └── Çeyreklik dağılım: AI belirledi                           │
│                                                                 │
│  Exit Plan (calculateExitPlan - hardcoded formül):             │
│  ├── 2027 Gelir: $826.2K (growth rate × scenario revenue)      │
│  ├── 2028 Gelir: $1.1M (aggressiveGrowthRate × decay)          │
│  └── 5 yıllık projeksiyon: Sabit formülle hesaplanıyor         │
│                                                                 │
│  SORUN: İki sistem birbirinden habersiz çalışıyor!             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Çözüm Yaklaşımı

**Ana Fikir:** Exit Plan'ı AI projeksiyonuyla beslemek

```text
┌─────────────────────────────────────────────────────────────────┐
│  ÇÖZÜM: AI-DRIVEN EXIT PLAN                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI next_year_projection →                                     │
│  ├── Yıl 1 (2027): AI'ın $580.6K gelir, $503.4K gider          │
│  │   └── Çeyreklik: AI'ın q1, q2, q3, q4 değerleri             │
│  │                                                              │
│  calculateExitPlan (updated) →                                 │
│  ├── Yıl 1: AI projeksiyonundan al (override)                  │
│  ├── Yıl 2-5: AI year1'den başlayarak formülle devam et        │
│  │   └── Büyüme oranı: AI'ın investor_hook.revenue_growth_yoy  │
│  │                                                              │
│  5 Yıllık Projeksiyon Detayı →                                 │
│  ├── 2027: $580.6K | $503.4K (AI)                              │
│  ├── 2028: $928.9K | $704.8K (AI-based growth)                 │
│  ├── 2029: $1.39M | $916K (formül devam)                       │
│  └── ...                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Teknik Değişiklikler

#### 1. calculateExitPlan Fonksiyonu - AI Override Parametresi Ekleme

**Dosya:** `src/hooks/finance/useInvestorAnalysis.ts`

```typescript
// Calculate Exit Plan for investors - UPDATED with AI projection support
export const calculateExitPlan = (
  deal: DealConfiguration,
  year1Revenue: number,
  year1Expenses: number,
  userGrowthRate: number,
  sector: string = 'default',
  scenarioTargetYear?: number,
  // YENİ: AI projeksiyonu (varsa Year 1'i override eder)
  aiProjection?: {
    year1Revenue: number;
    year1Expenses: number;
    year1NetProfit: number;
    quarterlyData: {
      revenues: { q1: number; q2: number; q3: number; q4: number };
      expenses: { q1: number; q2: number; q3: number; q4: number };
    };
    growthRateHint?: number;  // AI'ın önerdiği büyüme oranı
  }
): ExitPlan => {
```

**Değişiklik 2: Year 1 için AI verilerini kullanma**

```typescript
// AI projeksiyonu varsa Year 1'i override et
const baseYear1Revenue = aiProjection?.year1Revenue ?? year1Revenue;
const baseYear1Expenses = aiProjection?.year1Expenses ?? year1Expenses;
const effectiveGrowthRate = aiProjection?.growthRateHint ?? userGrowthRate;

// İki aşamalı konfigürasyon - AI'dan gelen büyüme oranıyla
const growthConfig: GrowthConfiguration = {
  aggressiveGrowthRate: Math.min(Math.max(effectiveGrowthRate, 0.10), 1.0),
  normalizedGrowthRate: SECTOR_NORMALIZED_GROWTH[sector] || SECTOR_NORMALIZED_GROWTH['default'],
  transitionYear: 2,
  rawUserGrowthRate: effectiveGrowthRate
};

// projectFutureRevenue'ye AI Year 1 verileriyle başla
const projections = projectFutureRevenue(
  baseYear1Revenue,        // AI Year 1 geliri
  baseYear1Expenses,       // AI Year 1 gideri
  growthConfig, 
  deal.sectorMultiple, 
  year1                    // senaryo yılı
);
```

#### 2. projectFutureRevenue - Year 0 Override Desteği

**Dosya:** `src/hooks/finance/useInvestorAnalysis.ts`

```typescript
export const projectFutureRevenue = (
  year1Revenue: number, 
  year1Expenses: number,
  growthConfig: GrowthConfiguration, 
  sectorMultiple: number,
  scenarioTargetYear?: number,
  valuationConfig: ValuationConfiguration = DEFAULT_VALUATION_CONFIG,
  sector: string = 'default'
): { year3: MultiYearProjection; year5: MultiYearProjection; allYears: MultiYearProjection[] } => {
  
  // Year 0 (başlangıç) verisi olarak gelen değerleri kullan
  // Bu AI'dan geliyorsa AI verileri, değilse senaryo verileri olacak
  let revenue = year1Revenue;   // Artık AI'dan gelebilir
  let expenses = year1Expenses; // Artık AI'dan gelebilir
  
  // ... rest of calculation
  
  for (let i = 1; i <= 5; i++) {
    // İlk yıl (i=1) için growth uygulanmaz, direkt AI/senaryo verisi kullanılır
    // Sonraki yıllar için growth uygulanır
    
    if (i === 1) {
      // Year 1: Direkt gelen veriyi kullan (AI veya senaryo)
      // revenue ve expenses zaten set edildi
    } else {
      // Year 2-5: Büyüme formülü uygula
      let effectiveGrowthRate: number;
      if (i <= growthConfig.transitionYear) {
        const aggressiveDecay = Math.max(0.7, 1 - (i * 0.15));
        effectiveGrowthRate = growthConfig.aggressiveGrowthRate * aggressiveDecay;
      } else {
        const normalDecay = Math.max(0.8, 1 - ((i - growthConfig.transitionYear) * 0.05));
        effectiveGrowthRate = growthConfig.normalizedGrowthRate * normalDecay;
      }
      
      revenue = revenue * (1 + effectiveGrowthRate);
      expenses = expenses * (1 + (effectiveGrowthRate * 0.6));
    }
    
    // ... valuation calculations
  }
};
```

#### 3. InvestmentTab - AI Projeksiyonunu Exit Plan'a Geçirme

**Dosya:** `src/components/simulation/InvestmentTab.tsx`

```typescript
interface InvestmentTabProps {
  scenarioA: SimulationScenario;
  scenarioB: SimulationScenario;
  summaryA: { ... };
  summaryB: { ... };
  quarterlyA: { ... };
  quarterlyB: { ... };
  quarterlyRevenueA?: { ... };
  quarterlyExpenseA?: { ... };
  quarterlyRevenueB?: { ... };
  quarterlyExpenseB?: { ... };
  dealConfig: DealConfiguration;
  onDealConfigChange: (updates: Partial<DealConfiguration>) => void;
  // YENİ: AI projeksiyonu
  aiNextYearProjection?: NextYearProjection;
}

export const InvestmentTab: React.FC<InvestmentTabProps> = ({
  // ... existing props
  aiNextYearProjection,
}) => {
  
  // AI projeksiyonunu Exit Plan formatına dönüştür
  const aiProjectionForExitPlan = useMemo(() => {
    if (!aiNextYearProjection) return undefined;
    
    return {
      year1Revenue: aiNextYearProjection.summary.total_revenue,
      year1Expenses: aiNextYearProjection.summary.total_expenses,
      year1NetProfit: aiNextYearProjection.summary.net_profit,
      quarterlyData: {
        revenues: {
          q1: aiNextYearProjection.quarterly.q1.revenue,
          q2: aiNextYearProjection.quarterly.q2.revenue,
          q3: aiNextYearProjection.quarterly.q3.revenue,
          q4: aiNextYearProjection.quarterly.q4.revenue,
        },
        expenses: {
          q1: aiNextYearProjection.quarterly.q1.expenses,
          q2: aiNextYearProjection.quarterly.q2.expenses,
          q3: aiNextYearProjection.quarterly.q3.expenses,
          q4: aiNextYearProjection.quarterly.q4.expenses,
        },
      },
      // AI'ın önerdiği büyüme oranını parse et (e.g. "%65 YoY" → 0.65)
      growthRateHint: aiNextYearProjection.investor_hook?.revenue_growth_yoy
        ? parseFloat(aiNextYearProjection.investor_hook.revenue_growth_yoy.replace(/[^0-9.]/g, '')) / 100
        : undefined,
    };
  }, [aiNextYearProjection]);
  
  // Calculate exit plan - AI DESTEKLİ
  const exitPlan = useMemo(() => {
    return calculateExitPlan(
      dealConfig, 
      summaryA.totalRevenue, 
      summaryA.totalExpenses, 
      growthRate, 
      'default', 
      scenarioTargetYear,
      aiProjectionForExitPlan  // YENİ: AI projeksiyonu
    );
  }, [dealConfig, summaryA.totalRevenue, summaryA.totalExpenses, growthRate, scenarioTargetYear, aiProjectionForExitPlan]);
  
  // ... rest of component
};
```

#### 4. ScenarioComparisonPage - AI Projeksiyonunu InvestmentTab'a Geçirme

**Dosya:** `src/pages/finance/ScenarioComparisonPage.tsx`

```typescript
// InvestmentTab'a AI projeksiyonunu geçir
<InvestmentTab
  scenarioA={scenarioA}
  scenarioB={scenarioB}
  summaryA={summaryA}
  summaryB={summaryB}
  quarterlyA={quarterlyComparison.netCashFlowA}
  quarterlyB={quarterlyComparison.netCashFlowB}
  quarterlyRevenueA={quarterlyComparison.revenueA}
  quarterlyExpenseA={quarterlyComparison.expenseA}
  quarterlyRevenueB={quarterlyComparison.revenueB}
  quarterlyExpenseB={quarterlyComparison.expenseB}
  dealConfig={dealConfig}
  onDealConfigChange={setDealConfig}
  // YENİ: AI projeksiyonunu geçir
  aiNextYearProjection={unifiedAnalysis?.next_year_projection}
/>
```

#### 5. calculateMultiYearCapitalNeeds - AI Verilerini Kullanma

**Dosya:** `src/hooks/finance/useInvestorAnalysis.ts`

```typescript
export const calculateMultiYearCapitalNeeds = (
  exitPlan: ExitPlan,
  year1Investment: number,
  year1NetProfit: number,
  safetyMargin: number = 0.20,
  // YENİ: AI çeyreklik verileri (Year 1 için)
  aiQuarterlyData?: {
    revenues: { q1: number; q2: number; q3: number; q4: number };
    expenses: { q1: number; q2: number; q3: number; q4: number };
  }
): MultiYearCapitalPlan => {
  
  // Daha gerçekçi arka-yüklü gelir dağılımı (AI yoksa fallback)
  const revenueQuarterlyRatios = { q1: 0.10, q2: 0.18, q3: 0.32, q4: 0.40 };
  const expenseQuarterlyRatios = { q1: 0.25, q2: 0.25, q3: 0.25, q4: 0.25 };
  
  exitPlan.allYears?.forEach((yearProjection, index) => {
    const isFirstYear = index === 0;
    
    // İlk yıl için AI çeyreklik verileri, yoksa ratio ile hesapla
    const quarterlyRevenue = (isFirstYear && aiQuarterlyData)
      ? aiQuarterlyData.revenues
      : {
          q1: yearProjection.revenue * revenueQuarterlyRatios.q1,
          q2: yearProjection.revenue * revenueQuarterlyRatios.q2,
          q3: yearProjection.revenue * revenueQuarterlyRatios.q3,
          q4: yearProjection.revenue * revenueQuarterlyRatios.q4,
        };
    
    const quarterlyExpense = (isFirstYear && aiQuarterlyData)
      ? aiQuarterlyData.expenses
      : {
          q1: yearProjection.expenses * expenseQuarterlyRatios.q1,
          q2: yearProjection.expenses * expenseQuarterlyRatios.q2,
          q3: yearProjection.expenses * expenseQuarterlyRatios.q3,
          q4: yearProjection.expenses * expenseQuarterlyRatios.q4,
        };
    
    // Death Valley hesaplama - DÜZELTİLMİŞ
    let cumulative = openingCash;
    let minBalance = openingCash;
    
    quarters.forEach((q, i) => {
      const netFlow = quarterlyRevenue[q] - quarterlyExpense[q];
      cumulative += netFlow;
      
      if (cumulative < minBalance) {
        minBalance = cumulative;
        peakDeficitQuarter = `Q${i + 1}`;
      }
    });
    
    // Sermaye ihtiyacı: Minimum negatifse gerekli
    const peakDeficit = minBalance < 0 ? minBalance : 0;
    const requiredCapital = minBalance < 0 
      ? Math.abs(minBalance) * (1 + safetyMargin)
      : 0;
    
    // ... rest of calculation
  });
};
```

---

### Veri Akışı Diyagramı

```text
┌─────────────────────────────────────────────────────────────────┐
│  YENİ VERİ AKIŞI (AI-DRIVEN)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  unified-scenario-analysis (Edge Function)                     │
│  └── next_year_projection: {                                   │
│        summary: { total_revenue: $580.6K, ... },               │
│        quarterly: { q1: {...}, q2: {...}, ... },               │
│        investor_hook: { revenue_growth_yoy: "%57" }            │
│      }                                                          │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  ScenarioComparisonPage                                         │
│  └── unifiedAnalysis.next_year_projection                      │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  InvestmentTab (aiNextYearProjection prop)                     │
│  └── aiProjectionForExitPlan = {                               │
│        year1Revenue: $580.6K,                                  │
│        year1Expenses: $503.4K,                                 │
│        quarterlyData: { revenues, expenses },                  │
│        growthRateHint: 0.57                                    │
│      }                                                          │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  calculateExitPlan(..., aiProjectionForExitPlan)               │
│  └── allYears[0] = { revenue: $580.6K, ... }  ← AI             │
│  └── allYears[1] = { revenue: $911.5K, ... }  ← AI × 1.57      │
│  └── allYears[2-4] = formül devam                              │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  calculateMultiYearCapitalNeeds(..., aiQuarterlyData)          │
│  └── Year 1 çeyreklikleri: AI'dan                              │
│  └── Year 2-5 çeyreklikleri: ratio ile                         │
│  └── Death Valley: Doğru hesaplanıyor                          │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  5 Yıllık Projeksiyon Detayı Tablosu                           │
│  └── Tüm veriler AI-uyumlu                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useInvestorAnalysis.ts` | `calculateExitPlan` - aiProjection parametresi, `projectFutureRevenue` - Year 1 override, `calculateMultiYearCapitalNeeds` - AI çeyreklik veri desteği |
| `src/components/simulation/InvestmentTab.tsx` | `aiNextYearProjection` prop ekleme, AI verilerini Exit Plan'a dönüştürme |
| `src/pages/finance/ScenarioComparisonPage.tsx` | InvestmentTab'a `aiNextYearProjection` geçirme |

---

### Beklenen Sonuç

| Metrik | Önceki (Hardcoded) | Sonraki (AI-Driven) |
|--------|--------------------|--------------------|
| 2027 Gelir | $826.2K (formül) | $580.6K (AI) |
| 2027 Gider | $623.2K (formül) | $503.4K (AI) |
| 2027 Çeyreklik | Sabit %15/%20/%30/%35 | AI'ın q1-q4 değerleri |
| 2028+ Gelir | $1.1M (formül) | $911.5K (AI year1 × 1.57) |
| Death Valley | Yanlış (pozitif) | Doğru (AI çeyreklik) |
| Veri Tutarlılığı | ❌ | ✅ |

---

### Önemli Notlar

1. **Fallback Mantığı:** AI projeksiyonu yoksa (örn. analiz henüz çalışmadıysa), mevcut senaryo verileriyle çalışmaya devam eder.

2. **Büyüme Oranı:** AI'ın `investor_hook.revenue_growth_yoy` değeri parse edilerek sonraki yıllar için büyüme oranı olarak kullanılır.

3. **Çeyreklik Veri:** Year 1 için AI'ın çeyreklik verileri, Year 2-5 için arka-yüklü ratio kullanılır.

4. **Değerleme:** Değerleme hesaplamaları (DCF, EBITDA multiple, vb.) AI'ın Year 1 verilerine dayalı olarak yeniden hesaplanır.
