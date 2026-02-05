
# PDF Export Veri Senkronizasyonu - Eksik Alanların Tamamlanması

## Problem Analizi

UI'da gösterilen ancak PDF export'a aktarılmayan tek kritik veri: **AI Optimal Investment Timing**

`AIInvestmentTimingCard` bileşeni, `optimalTiming` değerini kendi içinde hesaplıyor ancak:
- Bu hesaplanan değer dışarıya export edilmiyor
- `ScenarioComparisonPage` bu değeri PDF'e `undefined` olarak geçiyor
- PDF bileşeni (`PdfInvestmentOptionsPage`) `optimalTiming` varsa render ediyor ama hiç gelmiyor

## Teknik Çözüm

`ScenarioComparisonPage`'de `optimalTiming` hesaplamasını ekleyip PDF'e aktarmak.

---

## Uygulama Adımları

### Adım 1: optimalTiming useMemo Oluştur

**Dosya:** `src/pages/finance/ScenarioComparisonPage.tsx`

`investmentTiers` useMemo'sunun hemen altına (satır ~917) yeni bir `optimalTiming` hesaplaması eklenecek:

```typescript
// =====================================================
// PDF OPTIMAL TIMING - AI Investment Timing için
// =====================================================
const optimalTiming = useMemo((): import('@/components/simulation/pdf/types').OptimalInvestmentTiming | null => {
  if (!quarterlyItemized?.scenarioBItems || !capitalNeedB) return null;
  
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  // Negatif senaryo net akışları
  const flowsB = quarterlyItemized.scenarioBItems.map(q => q.netFlow);
  
  // Kümülatif nakit pozisyonu hesapla
  let cumulative = 0;
  let firstDeficitQuarter = '';
  let firstDeficitAmount = 0;
  let maxDeficit = 0;
  let maxDeficitQuarter = '';
  const quarterlyNeeds: number[] = [];
  
  for (let i = 0; i < 4; i++) {
    cumulative += flowsB[i] || 0;
    quarterlyNeeds.push(cumulative < 0 ? Math.abs(cumulative) : 0);
    
    if (cumulative < 0 && !firstDeficitQuarter) {
      firstDeficitQuarter = quarters[i];
      firstDeficitAmount = Math.abs(cumulative);
    }
    
    if (cumulative < maxDeficit) {
      maxDeficit = cumulative;
      maxDeficitQuarter = quarters[i];
    }
  }
  
  const targetYear = scenarioB?.targetYear || new Date().getFullYear() + 1;
  
  // Önerilen zamanlama
  let recommendedQuarter: string;
  let recommendedTiming: string;
  
  if (!firstDeficitQuarter) {
    recommendedQuarter = 'Opsiyonel';
    recommendedTiming = 'Herhangi bir zamanda';
  } else if (firstDeficitQuarter === 'Q1') {
    recommendedQuarter = 'Yıl Başı';
    recommendedTiming = `Ocak ${targetYear}'den önce`;
  } else {
    const idx = quarters.indexOf(firstDeficitQuarter);
    recommendedQuarter = quarters[idx - 1] || 'Q1';
    const monthMap: Record<string, string> = { 'Q1': 'Mart', 'Q2': 'Haziran', 'Q3': 'Eylül', 'Q4': 'Aralık' };
    recommendedTiming = `${monthMap[recommendedQuarter]} ${targetYear} sonuna kadar`;
  }
  
  // Aciliyet seviyesi
  let urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
  if (!firstDeficitQuarter) urgencyLevel = 'low';
  else if (firstDeficitQuarter === 'Q1') urgencyLevel = 'critical';
  else if (firstDeficitQuarter === 'Q2') urgencyLevel = 'high';
  else if (firstDeficitQuarter === 'Q3') urgencyLevel = 'medium';
  
  // Açıklamalar
  const reason = firstDeficitQuarter === 'Q1'
    ? `${firstDeficitQuarter}'de ${formatCompactUSD(firstDeficitAmount)} açık başlıyor - Yatırım şimdi gerekli`
    : firstDeficitQuarter
      ? `${firstDeficitQuarter}'de ${formatCompactUSD(firstDeficitAmount)} nakit açığı oluşacak`
      : 'Nakit akışı pozitif, yatırım opsiyonel';
      
  const riskIfDelayed = firstDeficitQuarter
    ? `Yatırım alınmazsa pozitif senaryoya geçiş mümkün değil. Büyüme stratejisi gecikir, pazar payı kaybedilir.`
    : 'Düşük risk - organik büyüme mümkün';
  
  return {
    recommendedQuarter,
    recommendedTiming,
    reason,
    riskIfDelayed,
    requiredInvestment: Math.abs(maxDeficit) * 1.20,
    urgencyLevel,
    quarterlyNeeds
  };
}, [quarterlyItemized, capitalNeedB, scenarioB]);
```

### Adım 2: PDF Export'a optimalTiming Aktar

**Dosya:** `src/pages/finance/ScenarioComparisonPage.tsx`

`PdfExportContainer` bileşenine `optimalTiming` prop'u eklenmeli (satır ~1880):

```typescript
<PdfExportContainer
  // ... mevcut prop'lar ...
  investmentTiers={investmentTiers}
  optimalTiming={optimalTiming}  // EKLENDİ
  scenarioComparison={scenarioComparisonData}
/>
```

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `ScenarioComparisonPage.tsx` | `optimalTiming` useMemo ekle (~40 satır), PDF prop'una aktar |

---

## Sonuç

Bu değişiklikle:
- ✅ UI'daki "AI Optimal Investment Timing" verisi PDF'e birebir aktarılacak
- ✅ Tüm UI verileri artık PDF export'ta mevcut olacak
- ✅ Veri hesaplaması tek noktadan (ScenarioComparisonPage) yapılacak
