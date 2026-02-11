

# i18n Eksik Anahtar Duzeltme Plani

## Problem

5 PDF bileseninde `t('simulation:pdf.fiveYearProjection.*')` gibi var olmayan cevirilere referans veriliyor. Dogru anahtarlar `investment.*` altinda mevcut.

## Etkilenen Dosyalar ve Degisiklikler

### 1. `PdfFiveYearProjectionPage.tsx`
Yanlis: `pdf.fiveYearProjection.*` -> Dogru: `investment.fiveYearTable.*`

| Yanlis Anahtar | Dogru Anahtar |
|---|---|
| `pdf.fiveYearProjection.title` | `investment.fiveYearTable.title` |
| `pdf.fiveYearProjection.year` | `investment.fiveYearTable.year` |
| `pdf.fiveYearProjection.opening` | `investment.fiveYearTable.opening` |
| `pdf.fiveYearProjection.revenue` | `investment.fiveYearTable.revenue` |
| `pdf.fiveYearProjection.expense` | `investment.fiveYearTable.expense` |
| `pdf.fiveYearProjection.netProfit` | `investment.fiveYearTable.netProfit` |
| `pdf.fiveYearProjection.deathValley` | `investment.fiveYearTable.deathValley` |
| `pdf.fiveYearProjection.capitalNeed` | `investment.fiveYearTable.capitalNeed` |
| `pdf.fiveYearProjection.yearEnd` | `investment.fiveYearTable.yearEnd` |
| `pdf.fiveYearProjection.valuation` | `investment.fiveYearTable.valuation` |
| `pdf.fiveYearProjection.moic` | `investment.fiveYearTable.moic` |
| `pdf.fiveYearProjection.totalCapitalNeed` | `investment.fiveYearTable.total` + yeni anahtar ekle |
| `pdf.fiveYearProjection.valuation` (ozet kartta) | `investment.fiveYearTable.valuation` |

Ek olarak `totalCapitalNeed` anahtari hicbir yerde mevcut degil - TR/EN JSON dosyalarina `investment.fiveYearTable.totalCapitalNeed` olarak eklenmeli.

### 2. `PdfFutureImpactPage.tsx`
Yanlis: `pdf.futureImpact.*` -> Dogru: `investment.futureImpact.*`

| Yanlis | Dogru |
|---|---|
| `pdf.futureImpact.title` | `investment.futureImpact.title` |
| `pdf.futureImpact.withInvestment` | `investment.futureImpact.withInvestment` |
| `pdf.futureImpact.withoutInvestment` | `investment.futureImpact.withoutInvestment` |
| `pdf.futureImpact.yearDiff` | `investment.futureImpact.yearDiff` |
| `pdf.futureImpact.totalDifference` | `investment.futureImpact.totalDifference` |

### 3. `PdfRunwayChartPage.tsx`
Yanlis: `pdf.runwayChart.*` -> Dogru: `investment.runwayChart.*`

| Yanlis | Dogru |
|---|---|
| `pdf.runwayChart.title` | `investment.runwayChart.title` |
| `pdf.runwayChart.description` | `investment.runwayChart.description` |
| `pdf.quarterlyCashFlow.difference` | Yeni anahtar ekle: `investment.runwayChart.difference` |

### 4. `PdfGrowthModelPage.tsx`
Yanlis: `pdf.growthModel.*` -> Dogru: `investment.growthModel.*`

| Yanlis | Dogru |
|---|---|
| `pdf.growthModel.title` | `investment.growthModel.title` |
| `pdf.growthModel.years1to2` | `investment.growthModel.year1to2` |
| `pdf.growthModel.years3to5` | `investment.growthModel.year3to5` |
| `pdf.growthModel.capWarning` | `investment.growthModel.capWarning` |

### 5. `PdfQuarterlyCashFlowPage.tsx`
Yanlis: `pdf.quarterlyCashFlow.*` -> Dogru: `investment.quarterlyCashFlow.*`

| Yanlis | Dogru |
|---|---|
| `pdf.quarterlyCashFlow.title` | `investment.quarterlyCashFlow.title` |
| `pdf.quarterlyCashFlow.invested` | `investment.quarterlyCashFlow.withInvestment` |
| `pdf.quarterlyCashFlow.uninvested` | `investment.quarterlyCashFlow.withoutInvestment` |
| `pdf.quarterlyCashFlow.startingBalance` | `investment.quarterlyCashFlow.startingBalance` |
| `pdf.quarterlyCashFlow.net` | `investment.quarterlyCashFlow.net` |
| `pdf.quarterlyCashFlow.cumulative` | `investment.quarterlyCashFlow.cumulative` |
| `pdf.quarterlyCashFlow.yearEnd` | `investment.quarterlyCashFlow.yearEnd` |

## Yeni Eklenmesi Gereken Ceviri Anahtarlari

Asagidaki anahtarlar mevcut JSON dosyalarinda yok, eklenmeleri gerekiyor:

**EN (`src/i18n/locales/en/simulation.json`):**
- `investment.fiveYearTable.totalCapitalNeed`: "Total Capital Need"
- `investment.runwayChart.difference`: "Difference"

**TR (`src/i18n/locales/tr/simulation.json`):**
- `investment.fiveYearTable.totalCapitalNeed`: "Toplam Sermaye Ihtiyaci"
- `investment.runwayChart.difference`: "Fark"

## Degisecek Dosyalar

| Dosya | Degisiklik Turu |
|---|---|
| `src/components/simulation/pdf/PdfFiveYearProjectionPage.tsx` | i18n anahtar duzeltme |
| `src/components/simulation/pdf/PdfFutureImpactPage.tsx` | i18n anahtar duzeltme |
| `src/components/simulation/pdf/PdfRunwayChartPage.tsx` | i18n anahtar duzeltme |
| `src/components/simulation/pdf/PdfGrowthModelPage.tsx` | i18n anahtar duzeltme |
| `src/components/simulation/pdf/PdfQuarterlyCashFlowPage.tsx` | i18n anahtar duzeltme |
| `src/i18n/locales/en/simulation.json` | 2 yeni anahtar ekle |
| `src/i18n/locales/tr/simulation.json` | 2 yeni anahtar ekle |

