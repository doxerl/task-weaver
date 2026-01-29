
## 5 Yıllık Projeksiyon - AI Veri Tutarlılığı Düzeltme Planı

### Temel Problemler

Console loglarından görülen durum:

```text
┌─────────────────────────────────────────────────────────────────┐
│  MEVCUT DURUM (HATALI)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [projectFutureRevenue] Inputs:                                 │
│  - year1Revenue: $446,616 ← SENARYO VERİSİ (AI değil!)         │
│  - aggressiveGrowthRate: 1.0 (100%)                            │
│                                                                 │
│  projectFutureRevenue Loop (i=1 to 5):                         │
│  ├── i=1: $446K × 2.0 = $893K    ← HATALI: Year 1 de büyütülüyor│
│  ├── i=2: $893K × 1.7 = $1.52M                                 │
│  ├── i=3: $1.52M × 1.25 = $1.9M                                │
│  ├── i=4: $1.9M × 1.19 = $2.26M                                │
│  └── i=5: $2.26M × 1.14 = $2.58M                               │
│                                                                 │
│  EKRANDA GÖRÜNEN (2027): $1.4M gelir ← Year 1 zaten büyütülmüş │
│  AI TABLOSUNDA (2027): $580K gelir ← Doğru değer               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### İki Kritik Hata

1. **AI Projeksiyonu Kullanılmıyor:** `aiNextYearProjection` ya `undefined` ya da değerler doğru geçirilmiyor
2. **Year 1 İçin Büyüme Uygulanıyor:** `projectFutureRevenue` fonksiyonu gelen değeri Year 1 olarak kullanmak yerine, onu da büyütüyor

### Çözüm Yaklaşımı

```text
┌─────────────────────────────────────────────────────────────────┐
│  DÜZELTİLMİŞ AKIŞ                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI next_year_projection:                                       │
│  └── summary.total_revenue: $580.6K                            │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  calculateExitPlan(..., aiProjection):                         │
│  └── baseYear1Revenue = $580.6K (AI'dan)                       │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  projectFutureRevenue (DÜZELTİLMİŞ):                           │
│  ├── Year 1 (i=1): $580.6K (OLDUĞU GİBİ, büyüme yok!)          │
│  ├── Year 2 (i=2): $580.6K × 1.57 = $911.5K                    │
│  ├── Year 3 (i=3): $911.5K × 1.30 = $1.18M                     │
│  ├── Year 4 (i=4): $1.18M × 1.24 = $1.46M                      │
│  └── Year 5 (i=5): $1.46M × 1.19 = $1.74M                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Teknik Değişiklikler

#### 1. projectFutureRevenue - Year 1 Büyüme Düzeltmesi

**Dosya:** `src/hooks/finance/useInvestorAnalysis.ts`

**Problem:** Mevcut kod Year 1 dahil tüm yıllar için büyüme uyguluyor

```typescript
// MEVCUT (HATALI)
for (let i = 1; i <= 5; i++) {
  // ...
  revenue = revenue * (1 + effectiveGrowthRate);  // HER YIL büyütülüyor
}
```

**Düzeltme:** Year 1 için büyüme uygulanmamalı, gelen değer direkt kullanılmalı

```typescript
// DÜZELTİLMİŞ
for (let i = 1; i <= 5; i++) {
  let effectiveGrowthRate: number;
  let growthStage: 'aggressive' | 'normalized';
  
  if (i === 1) {
    // Year 1: Büyüme YOK - gelen değer olduğu gibi kullanılır
    // (AI veya senaryo verisi zaten hedef yılın değeri)
    effectiveGrowthRate = 0;
    growthStage = 'aggressive';
  } else if (i <= growthConfig.transitionYear) {
    // Year 2: Agresif büyüme
    const aggressiveDecay = Math.max(0.7, 1 - (i * 0.15));
    effectiveGrowthRate = growthConfig.aggressiveGrowthRate * aggressiveDecay;
    growthStage = 'aggressive';
  } else {
    // Year 3-5: Normalize büyüme
    const normalDecay = Math.max(0.8, 1 - ((i - growthConfig.transitionYear) * 0.05));
    effectiveGrowthRate = growthConfig.normalizedGrowthRate * normalDecay;
    growthStage = 'normalized';
  }
  
  revenue = revenue * (1 + effectiveGrowthRate);
  expenses = expenses * (1 + (effectiveGrowthRate * 0.6));
  // ... rest
}
```

#### 2. Debug Log Ekleme - AI Projeksiyonu Kontrolü

**Dosya:** `src/hooks/finance/useInvestorAnalysis.ts`

```typescript
export const calculateExitPlan = (
  // ... params
  aiProjection?: AIProjectionForExitPlan
): ExitPlan => {
  // DEBUG: AI projeksiyonunun alınıp alınmadığını kontrol et
  console.log('[calculateExitPlan] AI Projection:', {
    hasAIProjection: !!aiProjection,
    aiRevenue: aiProjection?.year1Revenue,
    aiExpenses: aiProjection?.year1Expenses,
    aiGrowthHint: aiProjection?.growthRateHint,
    fallbackRevenue: year1Revenue,
    fallbackExpenses: year1Expenses,
    userGrowthRate,
  });
  
  // AI projeksiyonu varsa Year 1 verilerini override et
  const baseYear1Revenue = aiProjection?.year1Revenue ?? year1Revenue;
  const baseYear1Expenses = aiProjection?.year1Expenses ?? year1Expenses;
  const effectiveGrowthRate = aiProjection?.growthRateHint ?? userGrowthRate;
  
  console.log('[calculateExitPlan] Effective Values:', {
    baseYear1Revenue,
    baseYear1Expenses,
    effectiveGrowthRate,
  });
  
  // ... rest
};
```

#### 3. InvestmentTab - AI Projeksiyonu Geçirme Kontrolü

**Dosya:** `src/components/simulation/InvestmentTab.tsx`

```typescript
// AI projeksiyonunu Exit Plan formatına dönüştür
const aiProjectionForExitPlan = useMemo<AIProjectionForExitPlan | undefined>(() => {
  // DEBUG: AI projeksiyonunun gelip gelmediğini kontrol et
  console.log('[InvestmentTab] AI Next Year Projection:', {
    hasProjection: !!aiNextYearProjection,
    summary: aiNextYearProjection?.summary,
    investorHook: aiNextYearProjection?.investor_hook,
  });
  
  if (!aiNextYearProjection) return undefined;
  
  // ... existing code
}, [aiNextYearProjection]);
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useInvestorAnalysis.ts` | `projectFutureRevenue` - Year 1 için büyüme kaldırma (i === 1 → effectiveGrowthRate = 0) |
| `src/hooks/finance/useInvestorAnalysis.ts` | `calculateExitPlan` - Debug logları ekleme |
| `src/components/simulation/InvestmentTab.tsx` | `aiProjectionForExitPlan` - Debug logları ekleme |

---

### Düzeltilmiş Hesaplama Örneği

**Girdi:**
- AI 2027 Gelir: $580.6K
- AI 2027 Gider: $503.4K
- AI Büyüme Oranı: %57

**5 Yıllık Projeksiyon (DÜZELTİLMİŞ):**

| Yıl | Büyüme | Gelir | Gider | Net Kar |
|-----|--------|-------|-------|---------|
| 2027 | 0% (Year 1) | $580.6K | $503.4K | $77.2K |
| 2028 | 48.5% (57%×0.85) | $862.3K | $667.9K | $194.4K |
| 2029 | 25% (normalize) | $1.08M | $792.7K | $284.7K |
| 2030 | 23.8% | $1.33M | $918.5K | $413.2K |
| 2031 | 22.5% | $1.63M | $1.05M | $581.3K |

**Beklenen Sonuç:**

| Metrik | Önceki (Hatalı) | Sonraki (Doğru) |
|--------|----------------|-----------------|
| 2027 Gelir | $1.4M | $580.6K |
| 2027 Gider | $893K | $503.4K |
| AI Tablosu ile Uyum | ❌ | ✅ |
| Year 1 Büyüme | %100 | %0 |
| 5Y Toplam Gelir | $14.1M | ~$5.5M |
