

## /finance/simulation/compare Sayfası Tam i18n Entegrasyonu

### Problem Özeti

`ScenarioComparisonPage.tsx` sayfasının kendisi çoğunlukla çeviriye bağlı ancak alt bileşenlerinin büyük çoğunluğunda hardcoded Türkçe stringler var. Toplam **~350+ hardcoded string** tespit edildi.

### Tespit Edilen Hardcoded Bileşenler

| Bileşen | Hardcoded String Sayısı | Durum |
|---------|------------------------|-------|
| `InvestmentTab.tsx` | ~120 | ❌ Hiç i18n yok |
| `FocusProjectSelector.tsx` | ~25 | ❌ Hiç i18n yok |
| `FinancialRatiosPanel.tsx` | ~35 | ❌ Hiç i18n yok |
| `SensitivityTable.tsx` | ~15 | ❌ Hiç i18n yok |
| `ItemTrendCards.tsx` | ~20 | ❌ Hiç i18n yok |
| `ScenarioComparisonCards.tsx` | ~25 | ❌ Hiç i18n yok |
| `QuarterlyCapitalTable.tsx` | ~30 | ❌ Hiç i18n yok |
| `AIInvestmentTimingCard.tsx` | ~40 | ❌ Hiç i18n yok |
| `EditableProjectionTable.tsx` | ~15 | ❌ Hiç i18n yok |

---

### Çözüm: Çeviri Dosyası Genişletme

#### Yeni Key'ler (`simulation.json`)

```json
{
  "investment": {
    "dealSimulator": "Investment Deal Simulator",
    "dealSimulatorDesc": "Adjust investment amount and equity ratio to see exit plan",
    "investmentAmount": "Investment Amount",
    "suggested": "Suggested",
    "basis": {
      "deathValley": "Death Valley based",
      "yearEndDeficit": "Year-end deficit based"
    },
    "additionalCapital": "additional capital",
    "selfFinancing": "Self-financing from {{year}} onwards",
    "equityRatio": "Equity Ratio",
    "valuation": "Valuation",
    "sectorMultiple": "Sector Multiple",
    "tiers": {
      "title": "Investment Options",
      "selectBased": "Select appropriate investment amount based on your business needs",
      "minimum": "Minimum (Survival)",
      "recommended": "Recommended (Growth)",
      "aggressive": "Aggressive (Scale)",
      "runway": "{{months}} months runway"
    },
    "capitalNeeds": {
      "title": "Capital Needs Comparison",
      "selfSustaining": "Self-Sustaining",
      "required": "Required",
      "criticalQuarter": "Critical Quarter",
      "monthlyBurn": "Monthly Burn",
      "yearEnd": "Year End",
      "breakEven": "Break-even",
      "runway": "Runway",
      "months": "{{count}} months",
      "twoYearDeathValley": "2Y Death Valley"
    },
    "opportunityCost": {
      "title": "Opportunity Cost",
      "description": "Potential revenue left on table if not investing"
    },
    "runwayChart": {
      "title": "Cash Flow Runway Chart",
      "description": "Invested vs uninvested scenario comparison",
      "withInvestment": "With Investment (Positive Scenario)",
      "withoutInvestment": "Without Investment (Negative Scenario)"
    },
    "growthModel": {
      "title": "Two-Phase Growth Model",
      "aggressivePhase": "Year 1-2 (Aggressive)",
      "normalizedPhase": "Year 3-5 (Normalized)",
      "target": "Target",
      "cap": "cap",
      "sectorAverage": "Sector average",
      "capped": "Aggressive phase capped at 100% (original target: {{percent}}%)"
    },
    "exitPlan": {
      "title": "Exit Plan - Investor Return Projection",
      "entry": "ENTRY",
      "investment": "Investment",
      "equity": "Equity",
      "valuation": "Valuation",
      "year3": "YEAR 3",
      "year5": "YEAR 5",
      "companyValue": "Company Value",
      "investorShare": "Investor Share",
      "moic": "MOIC"
    },
    "metrics": {
      "capitalEfficiency": "Capital Efficiency",
      "perDollarRevenue": "Revenue per $1",
      "targetGrowth": "Target Growth",
      "scenarioTarget": "Scenario target",
      "breakEven": "Break-even",
      "breakEvenPoint": "Break-even point",
      "yearN": "Year {{n}}"
    },
    "projectionTable": {
      "title": "5-Year Projection Details",
      "yearDependent": "Year-dependent capital calculation: Carry-over profit → Quarterly death valley → Additional investment need",
      "year": "Year",
      "opening": "Opening",
      "revenue": "Revenue",
      "expense": "Expense",
      "netProfit": "Net Profit",
      "deathValley": "Death Valley",
      "capitalNeed": "Capital Need",
      "yearEnd": "Year End",
      "valuation": "Valuation",
      "moic": "MOIC"
    }
  },
  "focusProject": {
    "title": "Investment Focus Projects",
    "projectsSelected": "{{count}} projects selected",
    "description": "Specify which projects will use the investment (max 2 projects). AI analysis will focus on selected projects.",
    "investmentProjects": "Investment Projects (max 2 selection)",
    "selectedSummary": "Selected Projects Summary",
    "totalCurrent": "Total Current",
    "totalTarget": "Total Target",
    "selectAtLeast": "Select at least 1 project",
    "growthPlan": "Growth Plan",
    "growthPlanPlaceholder": "Explain your growth plan for selected projects. E.g.: Expand SBT Tracker beyond textile sector, add ISO 14064 module, focus on enterprise customers...",
    "aiUsageNote": "This description will be used in AI analysis and reflected in projections.",
    "allocationTitle": "Investment Usage Allocation",
    "total": "Total",
    "productDev": "Product Development",
    "marketing": "Marketing",
    "personnel": "Personnel",
    "operational": "Operational",
    "allocationWarning": "Total allocation should be 100%. Current: {{percent}}%"
  },
  "financialRatios": {
    "title": "Financial Ratios (B2B Services Benchmark)",
    "liquidity": "Liquidity Ratios",
    "leverage": "Leverage Ratios",
    "profitability": "Profitability Ratios",
    "currentRatio": "Current Ratio",
    "quickRatio": "Quick Ratio",
    "cashRatio": "Cash Ratio",
    "debtToEquity": "Debt/Equity",
    "debtToAssets": "Debt/Assets",
    "receivablesRatio": "Receivables/Assets",
    "roa": "ROA",
    "roe": "ROE",
    "netMargin": "Net Margin",
    "status": {
      "good": "Good",
      "average": "Average",
      "poor": "Attention"
    },
    "tooltips": {
      "currentRatio": "Current Assets / Short-term Debt",
      "quickRatio": "(Current Assets - Inventory) / Short-term Debt",
      "cashRatio": "Cash / Short-term Debt",
      "debtToEquity": "Total Debt / Equity",
      "debtToAssets": "Total Debt / Total Assets",
      "receivablesRatio": "Trade Receivables / Total Assets",
      "roa": "Net Profit / Total Assets",
      "roe": "Net Profit / Equity",
      "netMargin": "Net Profit / Revenue"
    },
    "benchmarkNote": "Benchmark: B2B Services sector averages used as reference"
  },
  "sensitivity": {
    "title": "Sensitivity Analysis",
    "description": "Impact of revenue change on main metrics",
    "revenueChange": "Revenue Change",
    "netProfit": "Net Profit",
    "margin": "Margin",
    "valuation": "Valuation",
    "moic": "MOIC",
    "runway": "Runway",
    "months": "{{count}} months",
    "loss": "loss",
    "criticalVariable": "Critical Variable",
    "ifRevenueDrops": "If revenue drops 20%, profit becomes {{amount}}"
  },
  "itemTrend": {
    "revenueItems": "Revenue Items Trend Analysis",
    "expenseItems": "Expense Items Trend Analysis",
    "share": "Share",
    "concentrated": "Concentrated",
    "trend": {
      "increasing": "Growing",
      "decreasing": "Declining",
      "stable": "Stable"
    },
    "volatility": {
      "high": "High Volatility",
      "medium": "Medium Volatility",
      "low": "Low Volatility"
    },
    "concentrationRisk": "Concentration Risk",
    "concentrationWarning": "A single item accounts for more than 50% of total {{type}}"
  },
  "scenarioCards": {
    "revenueComparison": "Revenue Items Scenario Comparison",
    "expenseComparison": "Expense Items Scenario Comparison",
    "vsComparison": "{{labelA}} vs {{labelB}} scenario comparison",
    "riskLevel": {
      "high": "High Difference",
      "medium": "Medium Difference",
      "low": "Low Difference"
    },
    "divergence": {
      "increasingGood": "↗️ Increasing Difference",
      "increasingBad": "↗️ Increasing Risk",
      "decreasingGood": "↘️ Decreasing Risk",
      "decreasingBad": "↘️ Decreasing Difference"
    },
    "totalDifference": "Total Difference",
    "highDiffWarning": "High Difference Warning",
    "itemsOver40": "{{items}} items have over 40% difference between scenarios"
  },
  "quarterlyTable": {
    "title": "Quarterly Cash Flow Comparison",
    "description": "Invested (positive) and uninvested (negative) scenario quarterly details",
    "invested": "Invested ({{name}})",
    "uninvested": "Uninvested ({{name}})",
    "startingBalance": "+{{amount}} starting",
    "quarter": "Quarter",
    "revenue": "Revenue",
    "expense": "Expense",
    "netFlow": "Net Flow",
    "cumulative": "Cumulative",
    "need": "Need",
    "yearEnd": "Year End",
    "maxNeed": "Max Need",
    "opportunityCost": "Opportunity Cost",
    "betterPosition": "Invested scenario is in better position by {{amount}} at year end."
  },
  "aiTiming": {
    "title": "AI Optimal Investment Timing",
    "description": "{{year}} Optimal investment time based on negative scenario cash deficits",
    "recommended": "Recommended",
    "urgency": "Urgency",
    "requiredCapital": "Required Capital",
    "safetyIncluded": "20% safety included",
    "optional": "Optional",
    "yearStart": "Year Start",
    "before": "Before {{date}}",
    "byEnd": "By end of {{date}}",
    "urgencyLevels": {
      "critical": "Critical",
      "high": "High",
      "medium": "Medium",
      "low": "Low"
    },
    "urgencyDescriptions": {
      "critical": "Deficit starts in Q1 - Investment needed now",
      "high": "Deficit will start within 3 months",
      "medium": "Deficit will start within 6 months",
      "low": "Cash position is strong"
    },
    "quarterlyCumulativeNeed": "Quarterly Cumulative Capital Need (Negative Scenario)",
    "firstDeficit": "First Deficit",
    "delayRisk": "Delay risk",
    "analysisConfidence": "Analysis Confidence",
    "firstDeficitLabel": "First deficit",
    "maxDeficitLabel": "Max deficit",
    "none": "None",
    "reasons": {
      "selfSustaining": "Company can sustain operations with equity. Investment can be used to accelerate growth.",
      "q1Deficit": "Cash deficit of {{amount}} starts in Q1. Growth expenses (trade shows, personnel, marketing) cannot be made without closing this gap.",
      "futureDeficit": "Cash deficit of {{amount}} will start in {{quarter}}. Capital must be secured before this date."
    },
    "risks": {
      "selfSustaining": "Growth opportunities may be missed but operations continue.",
      "q1Deficit": "Transition to positive scenario is not possible without investment. Growth strategy is delayed, market share is lost.",
      "futureDeficit": "Planned growth expenses after {{quarter}} become impossible. Positive scenario does not materialize."
    }
  },
  "editableTable": {
    "edited": "Edited",
    "resetToAI": "Reset to AI Values",
    "item": "Item",
    "total": "Total",
    "totalRevenue": "Total Revenue",
    "totalExpense": "Total Expense"
  }
}
```

---

### Uygulama Adımları

#### Faz 1: Çeviri Dosyalarını Güncelle
- `src/i18n/locales/en/simulation.json` - ~150 yeni key
- `src/i18n/locales/tr/simulation.json` - ~150 yeni key (Türkçe çeviriler)

#### Faz 2: Bileşenleri Güncelle (Büyükten Küçüğe)

**1. InvestmentTab.tsx (~120 string)**
- `useTranslation(['simulation'])` ekle
- Chart config label'larını `t()` ile değiştir
- Card title/description'ları `t()` ile değiştir
- Metric label'larını `t()` ile değiştir
- Table header'larını `t()` ile değiştir

**2. AIInvestmentTimingCard.tsx (~40 string)**
- `useTranslation` hook'u ekle
- `urgencyLabels`, `urgencyDescriptions` objelerini `t()` fonksiyonlarına dönüştür
- Reason/risk açıklamalarını `t()` ile değiştir

**3. QuarterlyCapitalTable.tsx (~30 string)**
- `useTranslation` hook'u ekle
- Table header'larını `t()` ile değiştir
- Summary banner textlerini `t()` ile değiştir

**4. FocusProjectSelector.tsx (~25 string)**
- `useTranslation` hook'u ekle
- `allocationItems` label'larını `t()` ile değiştir
- Card title/description'ları `t()` ile değiştir

**5. ScenarioComparisonCards.tsx (~25 string)**
- `useTranslation` hook'u ekle
- `getRiskLabel`, `getDivergenceIcon` fonksiyonlarını `t()` ile değiştir
- Title ve description'ları `t()` ile değiştir

**6. FinancialRatiosPanel.tsx (~35 string)**
- `useTranslation` hook'u ekle
- `getRatioStatus` label'larını `t()` ile değiştir
- `ratioGroups` title ve label'larını `t()` ile değiştir
- Tooltip açıklamalarını `t()` ile değiştir

**7. ItemTrendCards.tsx (~20 string)**
- `useTranslation` hook'u ekle
- `getTrendLabel`, `getVolatilityLabel` fonksiyonlarını `t()` ile değiştir
- Title ve warning mesajlarını `t()` ile değiştir

**8. SensitivityTable.tsx (~15 string)**
- `useTranslation` hook'u ekle
- Table header'larını `t()` ile değiştir
- Critical variable açıklamasını `t()` ile değiştir

**9. EditableProjectionTable.tsx (~15 string)**
- `useTranslation` hook'u ekle
- Badge label'larını `t()` ile değiştir
- Table header'larını `t()` ile değiştir
- Button text'lerini `t()` ile değiştir

---

### Teknik Notlar

1. **Hook Kullanımı**
```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation(['simulation', 'common']);
```

2. **Parametre Geçirme**
```tsx
// Önceki:
<span>{capitalEfficiency.toFixed(1)}x</span>

// Sonraki:
<span>{t('investment.metrics.perDollarRevenue')}: {capitalEfficiency.toFixed(1)}x</span>
```

3. **Dinamik String'ler**
```tsx
// Önceki:
`${multiYearCapitalPlan.selfSustainingFromYear}'dan itibaren kendi kendini finanse ediyor`

// Sonraki:
t('investment.selfFinancing', { year: multiYearCapitalPlan.selfSustainingFromYear })
```

---

### Dosya Listesi

| Dosya | İşlem |
|-------|-------|
| `src/i18n/locales/en/simulation.json` | +150 key ekle |
| `src/i18n/locales/tr/simulation.json` | +150 key ekle |
| `src/components/simulation/InvestmentTab.tsx` | i18n entegre et |
| `src/components/simulation/FocusProjectSelector.tsx` | i18n entegre et |
| `src/components/simulation/FinancialRatiosPanel.tsx` | i18n entegre et |
| `src/components/simulation/SensitivityTable.tsx` | i18n entegre et |
| `src/components/simulation/ItemTrendCards.tsx` | i18n entegre et |
| `src/components/simulation/ScenarioComparisonCards.tsx` | i18n entegre et |
| `src/components/simulation/QuarterlyCapitalTable.tsx` | i18n entegre et |
| `src/components/simulation/AIInvestmentTimingCard.tsx` | i18n entegre et |
| `src/components/simulation/EditableProjectionTable.tsx` | i18n entegre et |

---

### Beklenen Sonuç

- Tüm UI elementleri dil toggle'ına göre değişecek
- Türkçe → İngilizce geçişte tüm metinler güncellenecek
- Chart label'ları, table header'ları, badge'ler, button'lar dahil
- Toast mesajları ve açıklamalar dahil
