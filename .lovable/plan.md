

# PDF Veri Doğruluğu Düzeltme Planı

## Problem Özeti

`ScenarioComparisonPage.tsx` dosyasında PDF için ayrı hesaplamalar yapılıyor, ancak bunlar UI'daki (`InvestmentTab.tsx`) hesaplamalarla eşleşmiyor. 5 kritik tutarsızlık var.

## Tespit Edilen Kök Nedenler ve Çözümler

### 1. `pdfExitPlan` - AI Projeksiyonu ve Yıl Bilgisi Eksik (Kritik)

**Problem:** PDF exit plan hesaplaması `aiProjectionForExitPlan` ve `scenarioTargetYear` parametrelerini atliyor. UI bunlari kullaniyor.

| Parametre | UI (InvestmentTab) | PDF (ScenarioComparisonPage) |
|-----------|--------------------|-----------------------------|
| `aiProjectionForExitPlan` | Gonderiliyor | Eksik |
| `scenarioTargetYear` | Gonderiliyor | Eksik |

**Cozum:** `pdfExitPlan` useMemo'sunu (satir 840-858) guncelleyerek:
- `editedProjectionOverride` state'inden turetilen `aiProjectionForExitPlan` degerini hesapla
- `scenarioTargetYear` parametresini ekle

### 2. `scenarioComparisonData` - Hardcoded Buyume Oranlari (Kritik)

**Problem:** Satir 1125-1126'da `growthA = 0.20` ve `growthB = 0.08` hardcode edilmis. UI ise `calculateInvestmentScenarioComparison()` fonksiyonunu kullaniyor (dinamik buyume oranlari).

**Cozum:** Hardcoded hesaplamayi tamamen kaldirip, `calculateInvestmentScenarioComparison()` fonksiyonunu cagir (InvestmentTab ile ayni mantik).

### 3. `pdfMultiYearCapitalPlan` - AI Ceyreklik Verisi Eksik (Orta)

**Problem:** Satir 912-921'de `calculateMultiYearCapitalNeeds` cagirilirken `aiProjectionForExitPlan?.quarterlyData` parametresi gonderilmiyor. UI gonderiyor.

**Cozum:** `pdfMultiYearCapitalPlan` useMemo'suna AI ceyreklik veri parametresini ekle.

### 4. `pdfExitPlan` icin `editedProjectionOverride` Entegrasyonu (Orta)

**Problem:** Kullanici duzenlenebilir tabloda degisiklik yaptiginda, UI (InvestmentTab) bu degisiklikleri Exit Plan hesaplamasina dahil ediyor. Ancak PDF hesaplamasi bu degisiklikleri almiyior.

**Cozum:** PDF hesaplamalarinda kullanmak uzere `pdfAiProjectionForExitPlan` adinda bir useMemo olustur. Bu, `unifiedAnalysis?.next_year_projection` ve `editedProjectionOverride` degerlerini birlestirerek InvestmentTab ile ayni formati uretecek.

### 5. `scenarioComparisonData` icinde `growthRate` Alani Formatlanma Hatasi (Dusuk)

**Problem:** UI'daki `calculateInvestmentScenarioComparison` fonksiyonu `growthRate` degerini ondalik (0.25) olarak dondururken, PDF'deki hardcoded versiyonu yuzde (20) olarak ayarliyor. Bu fark PDF'deki "Buyume Orani" gosterimlerini bozuyor.

**Cozum:** Tek fonksiyon kullanilinca otomatik olarak duzelmis olacak.

---

## Teknik Uygulama Detayi

### Adim 1: `pdfAiProjectionForExitPlan` useMemo olustur

`ScenarioComparisonPage.tsx` icerisinde, `pdfExitPlan` useMemo'sundan once yeni bir useMemo eklenecek. Bu, InvestmentTab'deki `aiProjectionForExitPlan` mantigi ile birebir ayni olacak:

```typescript
const pdfAiProjectionForExitPlan = useMemo(() => {
  const projection = unifiedAnalysis?.next_year_projection;
  if (!projection) return undefined;
  
  // Kullanici duzenlemesi varsa override et
  const editedOverride = editableRevenueProjection.length > 0 
    ? {
        totalRevenue: editableRevenueProjection.reduce((sum, r) => sum + (r.total || 0), 0),
        totalExpenses: editableExpenseProjection.reduce((sum, e) => sum + (e.total || 0), 0),
      }
    : undefined;
    
  const effectiveRevenue = editedOverride?.totalRevenue ?? projection.summary.total_revenue;
  const effectiveExpenses = editedOverride?.totalExpenses ?? projection.summary.total_expenses;
  
  return {
    year1Revenue: effectiveRevenue,
    year1Expenses: effectiveExpenses,
    year1NetProfit: effectiveRevenue - effectiveExpenses,
    quarterlyData: { ... },
    growthRateHint: ...,
  };
}, [unifiedAnalysis?.next_year_projection, editableRevenueProjection, editableExpenseProjection]);
```

### Adim 2: `pdfExitPlan` guncelle

Mevcut hesaplamaya `pdfAiProjectionForExitPlan` ve `scenarioTargetYear` ekle:

```typescript
const pdfExitPlan = useMemo(() => {
  // ... mevcut growthRate hesaplamasi ...
  const scenarioTargetYear = Math.max(
    scenarioA?.targetYear || 2026, 
    scenarioB?.targetYear || 2026
  );
  return calculateExitPlan(
    dealConfig, summaryA.totalRevenue, summaryA.totalExpense, 
    growthRate, 'default', scenarioTargetYear,
    pdfAiProjectionForExitPlan  // YENi
  );
}, [..., pdfAiProjectionForExitPlan, scenarioB?.targetYear]);
```

### Adim 3: `pdfMultiYearCapitalPlan` guncelle

AI ceyreklik verisini ekle:

```typescript
const pdfMultiYearCapitalPlan = useMemo(() => {
  return calculateMultiYearCapitalNeeds(
    pdfExitPlan,
    dealConfig.investmentAmount,
    summaryA.netProfit,
    dealConfig.safetyMargin / 100,
    pdfAiProjectionForExitPlan?.quarterlyData  // YENi
  );
}, [..., pdfAiProjectionForExitPlan?.quarterlyData]);
```

### Adim 4: `scenarioComparisonData` tamamen yeniden yaz

Hardcoded hesaplamayi kaldir ve `calculateInvestmentScenarioComparison()` kullan:

```typescript
const scenarioComparisonData = useMemo(() => {
  if (!summaryA || !summaryB || !pdfExitPlan || !scenarioA || !scenarioB) return null;
  
  const baseRevenueA = scenarioA.revenues?.reduce((sum, r) => sum + (r.baseAmount || 0), 0) || 0;
  const baseRevenueB = scenarioB.revenues?.reduce((sum, r) => sum + (r.baseAmount || 0), 0) || 0;
  
  return calculateInvestmentScenarioComparison(
    { totalRevenue: summaryA.totalRevenue, totalExpenses: summaryA.totalExpense, ... baseRevenue: baseRevenueA },
    { totalRevenue: summaryB.totalRevenue, totalExpenses: summaryB.totalExpense, ... baseRevenue: baseRevenueB },
    pdfExitPlan,
    dealConfig.sectorMultiple,
    Math.max(scenarioA.targetYear || 2026, scenarioB.targetYear || 2026)
  );
}, [summaryA, summaryB, pdfExitPlan, dealConfig.sectorMultiple, scenarioA, scenarioB]);
```

---

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | 4 useMemo guncelleme + 1 yeni useMemo |

## Beklenen Sonuc

- PDF'deki Exit Plan, Valuation, 5-Year Projection, Scenario Comparison ve Runway verileri UI ile birebir eslescek
- Kullanici duzenlemeleri hem UI hem PDF'e yansiyacak
- Hardcoded buyume oranlari kaldirilacak, dinamik hesaplama kullanilacak
