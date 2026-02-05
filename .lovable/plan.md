
# PDF Export Halüsinasyon Sorunu Düzeltme Planı

## Problem Analizi

PDF export bileşenleri dinamik UI'yi doğru yansıtmıyor çünkü:

1. **Eksik Prop'lar**: `PdfExportContainer`'a şu prop'lar geçilMİYOR:
   - `capitalNeedA` / `capitalNeedB` - Capital Analysis Page için
   - `investmentTiers` - Investment Options Page için
   - `scenarioComparison` - Scenario Impact Page için

2. **Dinamik Hesaplamalar Eksik**: ScenarioComparisonPage'de bu değerler hesaplanmıyor veya PDF container'a aktarılmıyor.

3. **AI Çıktısı Bağımsız**: `unifiedAnalysis` AI'dan gelen statik metin içeriyor, dinamik hesaplamalarla senkronize değil.

---

## Çözüm: Eksik Prop'ları Hesapla ve PDF'e Aktar

### Dosya: `src/pages/finance/ScenarioComparisonPage.tsx`

#### Adım 1: Capital Needs Hesaplaması (her iki senaryo için)

```typescript
// Satır ~850 civarına ekle
const capitalNeedA = useMemo(() => {
  if (!quarterlyComparison || quarterlyComparison.length < 4) return null;
  return calculateCapitalNeeds({
    q1: quarterlyComparison[0]?.scenarioANet || 0,
    q2: quarterlyComparison[1]?.scenarioANet || 0,
    q3: quarterlyComparison[2]?.scenarioANet || 0,
    q4: quarterlyComparison[3]?.scenarioANet || 0
  });
}, [quarterlyComparison]);

const capitalNeedB = useMemo(() => {
  if (!quarterlyComparison || quarterlyComparison.length < 4) return null;
  return calculateCapitalNeeds({
    q1: quarterlyComparison[0]?.scenarioBNet || 0,
    q2: quarterlyComparison[1]?.scenarioBNet || 0,
    q3: quarterlyComparison[2]?.scenarioBNet || 0,
    q4: quarterlyComparison[3]?.scenarioBNet || 0
  });
}, [quarterlyComparison]);
```

#### Adım 2: Investment Tiers Hesaplaması

```typescript
const investmentTiers = useMemo(() => {
  if (!capitalNeedB) return [];
  const base = capitalNeedB.requiredInvestment;
  return [
    { 
      tier: 'minimum', 
      amount: base, 
      runway: capitalNeedB.runwayMonths,
      description: 'Minimal capital to survive' 
    },
    { 
      tier: 'recommended', 
      amount: base * 1.5, 
      runway: Math.round(capitalNeedB.runwayMonths * 1.5),
      description: 'Recommended for safe runway' 
    },
    { 
      tier: 'aggressive', 
      amount: base * 2, 
      runway: Math.round(capitalNeedB.runwayMonths * 2),
      description: 'Aggressive growth capital' 
    }
  ];
}, [capitalNeedB]);
```

#### Adım 3: Scenario Comparison Hesaplaması

```typescript
const scenarioComparison = useMemo(() => {
  if (!summaryA || !summaryB) return null;
  return {
    withInvestment: {
      revenue: summaryA.totalRevenue,
      profit: summaryA.netProfit,
      margin: summaryA.profitMargin
    },
    withoutInvestment: {
      revenue: summaryB.totalRevenue,
      profit: summaryB.netProfit,
      margin: summaryB.profitMargin
    },
    impact: {
      revenueGap: summaryA.totalRevenue - summaryB.totalRevenue,
      profitGap: summaryA.netProfit - summaryB.netProfit,
      growthMultiplier: summaryB.totalRevenue > 0 
        ? summaryA.totalRevenue / summaryB.totalRevenue 
        : 0
    }
  };
}, [summaryA, summaryB]);
```

#### Adım 4: PDF Container'a Prop'ları Geçir

```tsx
<PdfExportContainer
  presentationPdfRef={presentationPdfRef}
  scenarioA={scenarioA}
  scenarioB={scenarioB}
  // ... existing props ...
  
  // YENİ PROP'LAR
  capitalNeedA={capitalNeedA}
  capitalNeedB={capitalNeedB}
  investmentTiers={investmentTiers}
  scenarioComparison={scenarioComparison}
  optimalTiming={null} // Opsiyonel, AI'dan gelebilir
/>
```

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | `capitalNeedA/B`, `investmentTiers`, `scenarioComparison` hesapla ve PDF container'a geçir |

---

## Sonuç

Bu değişikliklerle:
- PDF Capital Analysis sayfası gerçek verilerle doldurulacak
- Investment Options sayfası dinamik tier'ları gösterecek
- Scenario Impact sayfası A vs B karşılaştırmasını doğru gösterecek
- AI "halüsinasyonları" yerine hesaplanmış veriler kullanılacak
