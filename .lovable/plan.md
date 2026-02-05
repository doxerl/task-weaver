
# PDF Export i18n Düzeltme Planı

## Problem Analizi

PDF export'ta UI dil ayarından bağımsız olarak karışık Türkçe/İngilizce çıktı üretiliyor. Hardcoded Türkçe stringler i18n sistemini bypass ediyor.

### Tespit Edilen Hardcoded Türkçe Stringler

| Dosya | Satır | Hardcoded Metin |
|-------|-------|-----------------|
| `ScenarioComparisonPage.tsx` | 894 | `'Minimum Yatırım'` |
| `ScenarioComparisonPage.tsx` | 902 | `'Önerilen Yatırım'` |
| `ScenarioComparisonPage.tsx` | 910 | `'Agresif Büyüme'` |
| `ScenarioComparisonPage.tsx` | 955 | `'Opsiyonel'` |
| `ScenarioComparisonPage.tsx` | 956 | `'Herhangi bir zamanda'` |
| `ScenarioComparisonPage.tsx` | 958 | `'Yıl Başı'` |
| `ScenarioComparisonPage.tsx` | 959 | `'Ocak ${targetYear}'den önce'` |
| `ScenarioComparisonPage.tsx` | 963 | `'Mart', 'Haziran', 'Eylül', 'Aralık'` |
| `ScenarioComparisonPage.tsx` | 982-983 | `'Yatırım alınmazsa pozitif senaryoya...'` |
| `PdfAIInsightsPage.tsx` | 42 | `'Gelir Farkı Analizi'` |
| `PdfAIInsightsPage.tsx` | 43 | `'Yatırım senaryosu ile...'` |
| `PdfAIInsightsPage.tsx` | 54-55 | `'Runway Karşılaştırması'` |
| `PdfAIInsightsPage.tsx` | 63-65 | `'Death Valley Uyarısı'` |
| `PdfAIInsightsPage.tsx` | 76-77 | `'Kâr Marjı Farkı'` |
| `PdfAIInsightsPage.tsx` | 91-92 | `'Yatırım Getiri Etkisi'` |
| `PdfAIInsightsPage.tsx` | 102-103 | `'Fırsat Maliyeti'` |
| `PdfAIInsightsPage.tsx` | 160 | `'📊 Hesaplanmış Metrikler'` |
| `PdfAIInsightsPage.tsx` | 210 | `'🤖 AI Önerileri (Yüksek Güven)'` |

---

## Çözüm

Tüm hardcoded stringleri `t()` fonksiyonu ile i18n key'lerine dönüştürmek.

---

## Teknik Değişiklikler

### 1. Çeviri Dosyalarına Key'ler Ekle

**`src/i18n/locales/en/simulation.json`** - Yeni key'ler eklenecek:
```json
"pdf": {
  "investmentTiers": {
    "minimum": "Minimum Investment",
    "recommended": "Recommended Investment",
    "aggressive": "Aggressive Growth"
  },
  "optimalTiming": {
    "optional": "Optional",
    "anytime": "Anytime",
    "yearStart": "Year Start",
    "beforeMonth": "Before {{month}} {{year}}",
    "byEndOf": "By end of {{month}} {{year}}",
    "months": {
      "january": "January",
      "march": "March",
      "june": "June", 
      "september": "September",
      "december": "December"
    },
    "riskIfDelayed": "Without investment, transition to positive scenario is not possible. Growth strategy will be delayed, market share will be lost.",
    "lowRisk": "Low risk - organic growth possible"
  },
  "aiInsights": {
    "calculatedMetrics": "Calculated Metrics",
    "aiSuggestionsHighConfidence": "AI Suggestions (High Confidence)",
    "revenueGapAnalysis": "Revenue Gap Analysis",
    "revenueGapDesc": "With investment scenario, {{amount}} {{direction}} revenue is projected.",
    "more": "more",
    "less": "less",
    "runwayComparison": "Runway Comparison",
    "runwayComparisonDesc": "Positive scenario: {{positiveMonths}} months, Negative scenario: {{negativeMonths}} months runway. {{extraMonths}}",
    "extraMonthsSustainability": "{{months}} months longer sustainability.",
    "deathValleyWarning": "Death Valley Warning",
    "deathValleyDesc": "In organic scenario, {{amount}} cash deficit will occur in {{quarter}}. Minimum {{required}} investment required.",
    "profitMarginDifference": "Profit Margin Difference",
    "profitMarginDesc": "Positive scenario: {{marginA}}%, Negative scenario: {{marginB}}% profit margin. {{improvement}}",
    "marginImprovement": "{{points}} point improvement with investment.",
    "investmentImpact": "Investment Return Impact",
    "investmentImpactDesc": "{{amount}} investment achieves {{multiplier}}x revenue multiplier.",
    "opportunityCost": "Opportunity Cost",
    "opportunityCostDesc": "Without investment, {{amount}} potential revenue will be lost. Risk level: {{riskLevel}}."
  }
}
```

**`src/i18n/locales/tr/simulation.json`** - Aynı yapıda Türkçe çeviriler:
```json
"pdf": {
  "investmentTiers": {
    "minimum": "Minimum Yatırım",
    "recommended": "Önerilen Yatırım",
    "aggressive": "Agresif Büyüme"
  },
  "optimalTiming": {
    "optional": "Opsiyonel",
    "anytime": "Herhangi bir zamanda",
    "yearStart": "Yıl Başı",
    "beforeMonth": "{{month}} {{year}}'den önce",
    "byEndOf": "{{month}} {{year}} sonuna kadar",
    "months": {
      "january": "Ocak",
      "march": "Mart",
      "june": "Haziran",
      "september": "Eylül",
      "december": "Aralık"
    },
    "riskIfDelayed": "Yatırım alınmazsa pozitif senaryoya geçiş mümkün değil. Büyüme stratejisi gecikir, pazar payı kaybedilir.",
    "lowRisk": "Düşük risk - organik büyüme mümkün"
  },
  "aiInsights": {
    "calculatedMetrics": "Hesaplanmış Metrikler",
    "aiSuggestionsHighConfidence": "AI Önerileri (Yüksek Güven)",
    "revenueGapAnalysis": "Gelir Farkı Analizi",
    "revenueGapDesc": "Yatırım senaryosu ile {{amount}} {{direction}} gelir öngörülüyor.",
    "more": "daha fazla",
    "less": "daha az",
    // ... diğer Türkçe çeviriler
  }
}
```

### 2. ScenarioComparisonPage.tsx Güncellemesi

**investmentTiers useMemo** (satır 886-917):
```typescript
const investmentTiers = useMemo((): InvestmentTier[] => {
  if (!capitalNeedB) return [];
  const base = capitalNeedB.requiredInvestment;
  if (base <= 0) return [];
  
  return [
    { 
      tier: 'minimum' as const, 
      label: t('pdf.investmentTiers.minimum'),  // ← i18n key
      amount: base, 
      runwayMonths: capitalNeedB.runwayMonths,
      description: t('pdf.investmentTiers.minDescription'),
      safetyMargin: 15
    },
    // ... diğer tier'lar benzer şekilde
  ];
}, [capitalNeedB, t]);
```

**optimalTiming useMemo** (satır 922-990):
```typescript
// Month names from i18n
const monthMap: Record<string, string> = { 
  'Q1': t('pdf.optimalTiming.months.march'), 
  'Q2': t('pdf.optimalTiming.months.june'), 
  'Q3': t('pdf.optimalTiming.months.september'), 
  'Q4': t('pdf.optimalTiming.months.december') 
};

// Timing strings
recommendedQuarter = t('pdf.optimalTiming.yearStart');
recommendedTiming = t('pdf.optimalTiming.beforeMonth', { 
  month: t('pdf.optimalTiming.months.january'), 
  year: targetYear 
});

// Risk strings
const riskIfDelayed = firstDeficitQuarter
  ? t('pdf.optimalTiming.riskIfDelayed')
  : t('pdf.optimalTiming.lowRisk');
```

### 3. PdfAIInsightsPage.tsx Güncellemesi

**calculatedInsights useMemo** (satır 34-112):
```typescript
// Revenue Gap Analysis
insights.push({
  title: t('pdf.aiInsights.revenueGapAnalysis'),
  description: t('pdf.aiInsights.revenueGapDesc', {
    amount: formatFullUSD(Math.abs(revenueGap)),
    direction: revenueGap >= 0 ? t('pdf.aiInsights.more') : t('pdf.aiInsights.less')
  }),
  // ...
});

// Section headers
<h3>📊 {t('pdf.aiInsights.calculatedMetrics')}</h3>
<h3>🤖 {t('pdf.aiInsights.aiSuggestionsHighConfidence')}</h3>
```

### 4. Para Birimi Formatlama

`toLocaleString('tr-TR', ...)` yerine:
```typescript
import { formatFullUSD } from '@/lib/formatters';

// VEYA dinamik locale için:
import { useNumberLocale } from '@/contexts/LanguageContext';

const { numberLocale } = useNumberLocale();
value.toLocaleString(numberLocale, { style: 'currency', ... });
```

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `src/i18n/locales/en/simulation.json` | ~50 yeni çeviri key'i ekle |
| `src/i18n/locales/tr/simulation.json` | ~50 yeni çeviri key'i ekle |
| `src/pages/finance/ScenarioComparisonPage.tsx` | investmentTiers ve optimalTiming useMemo'larında t() kullan |
| `src/components/simulation/pdf/PdfAIInsightsPage.tsx` | Tüm hardcoded stringleri t() ile değiştir |

---

## Sonuç

Bu değişikliklerle:
- ✅ PDF export UI dil seçimine uygun olacak
- ✅ Türkçe UI → Türkçe PDF
- ✅ İngilizce UI → İngilizce PDF
- ✅ Karışık dil sorunu çözülecek
