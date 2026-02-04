
# Deal Simulator MOIC Hesaplama Düzeltmesi

## Sorun Özeti

**DealSimulatorCard** bileşeninde MOIC hesaplaması için sabit %30 yıllık büyüme oranı kullanılıyor. Bu, düşük başlangıç geliri olan startuplar için yanlış (düşük) MOIC değerleri üretiyor.

### Mevcut Kod (Satır 95-98)
```typescript
const growthRate = 0.3; // SABİT - PROBLEM!
const year5Revenue = currentRevenue * Math.pow(1 + growthRate, 5);
const year5ExitValue = year5Revenue * sectorMultiple;
```

### Sayısal Örnek
- Başlangıç: $150k gelir
- Sabit %30 büyüme → Year 5: $556k
- Exit Value: $556k × 8x = $4.45M
- Yatırımcı payı: $4.45M × 5% (dilution sonrası) = $220k
- MOIC: $220k / $250k = **0.88x** ❌

### Olması Gereken (T2D3 Modeli)
- Yıl 1: $150k (base)
- Yıl 2: $450k (3x)
- Yıl 3: $1.35M (3x)
- Yıl 4: $2.7M (2x)
- Yıl 5: $5.4M (2x)
- Exit Value: $5.4M × 8x = $43.2M
- Yatırımcı payı: $43.2M × 5% = $2.16M
- MOIC: $2.16M / $250k = **8.6x** ✅

---

## Çözüm Stratejisi

### Seçenek 1: ExitPlan'dan Year5 Değerini Al (Önerilen)
DealSimulatorCard'a `exitPlan` prop'u ekleyerek mevcut hesaplanmış 5 yıllık projeksiyonu kullan.

### Seçenek 2: Startup Decay Growth Modeli Ekle
T2D3 veya Decay modelini doğrudan bileşen içinde hesapla.

**Önerilen:** Seçenek 1 - Mevcut `calculateExitPlan` fonksiyonu zaten Two-Stage Growth Model kullanıyor. Bu veriyi prop olarak geçirmek en temiz çözüm.

---

## Teknik Değişiklikler

### 1. DealSimulatorCard Props Güncelleme

**Dosya:** `src/components/simulation/DealSimulatorCard.tsx`

**Yeni prop ekle:**
```typescript
export interface DealSimulatorCardProps {
  // ... mevcut proplar
  
  // YENİ: ExitPlan'dan Year 5 projeksiyonu
  exitPlanYear5?: {
    revenue: number;
    companyValuation: number;
    appliedGrowthRate?: number;
  };
  
  // YENİ: İş modeli seçimi (T2D3/Decay/Custom için)
  businessModel?: 'saas' | 'services' | 'ecommerce' | 'product';
}
```

### 2. MOIC Hesaplama Mantığı Düzeltme

**Mevcut (Satır 95-98):**
```typescript
const growthRate = 0.3;
const year5Revenue = currentRevenue * Math.pow(1 + growthRate, 5);
const year5ExitValue = year5Revenue * sectorMultiple;
```

**Yeni:**
```typescript
// ExitPlan varsa onu kullan, yoksa fallback hesapla
let year5Revenue: number;
let year5ExitValue: number;

if (exitPlanYear5 && exitPlanYear5.companyValuation > 0) {
  // Tercih 1: Mevcut ExitPlan'dan al (en doğru)
  year5Revenue = exitPlanYear5.revenue;
  year5ExitValue = exitPlanYear5.companyValuation;
} else {
  // Fallback: Startup Decay Growth Model
  const growthRates = calculateStartupDecayGrowth(businessModel || 'saas');
  year5Revenue = calculateYear5Revenue(currentRevenue, growthRates);
  year5ExitValue = year5Revenue * sectorMultiple;
}
```

### 3. Startup Decay Growth Fonksiyonu Ekleme

**Dosya:** `src/constants/simulation.ts`

```typescript
/**
 * Startup Decay Growth Model
 * Başlangıç yüksek büyüme, zamanla normalize
 */
export const STARTUP_GROWTH_PROFILES = {
  /** SaaS/Software: T2D3 benzeri agresif */
  SAAS: {
    y1: 0,     // Base year (input)
    y2: 1.50,  // 150% growth
    y3: 1.00,  // 100% growth
    y4: 0.75,  // 75% growth
    y5: 0.50,  // 50% growth
  },
  /** Services: Daha stabil */
  SERVICES: {
    y1: 0,
    y2: 0.80,  // 80%
    y3: 0.50,  // 50%
    y4: 0.35,  // 35%
    y5: 0.25,  // 25%
  },
  /** E-commerce: Orta hızda */
  ECOMMERCE: {
    y1: 0,
    y2: 1.00,  // 100%
    y3: 0.70,  // 70%
    y4: 0.50,  // 50%
    y5: 0.35,  // 35%
  },
  /** Product/License */
  PRODUCT: {
    y1: 0,
    y2: 1.20,  // 120%
    y3: 0.80,  // 80%
    y4: 0.50,  // 50%
    y5: 0.30,  // 30%
  },
} as const;

/**
 * Calculate Year 5 revenue using decay model
 */
export const calculateDecayYear5Revenue = (
  year1Revenue: number,
  profile: keyof typeof STARTUP_GROWTH_PROFILES
): number => {
  const rates = STARTUP_GROWTH_PROFILES[profile] || STARTUP_GROWTH_PROFILES.SAAS;
  let revenue = year1Revenue;
  
  revenue *= (1 + rates.y2); // Year 2
  revenue *= (1 + rates.y3); // Year 3
  revenue *= (1 + rates.y4); // Year 4
  revenue *= (1 + rates.y5); // Year 5
  
  return revenue;
};
```

### 4. UI'da Büyüme Modeli Gösterme

DealSimulatorCard'da kullanılan büyüme modelini şeffaf şekilde göster:

```tsx
{/* Debug/Transparency Section */}
<div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
  <p>📊 Projeksiyon Modeli: {exitPlanYear5 ? 'Two-Stage Growth' : 'Startup Decay'}</p>
  <p>📈 Year 5 Gelir: {formatCompactUSD(year5Revenue)}</p>
  <p>🎯 Year 5 Değerleme: {formatCompactUSD(year5ExitValue)}</p>
</div>
```

---

## Dosya Değişiklikleri

| Dosya | Değişiklik | Öncelik |
|-------|------------|---------|
| `src/constants/simulation.ts` | `STARTUP_GROWTH_PROFILES` ve `calculateDecayYear5Revenue` ekle | Kritik |
| `src/components/simulation/DealSimulatorCard.tsx` | Props güncelle, MOIC hesaplamasını düzelt | Kritik |
| `src/pages/finance/GrowthSimulation.tsx` | ExitPlan'ı DealSimulatorCard'a geçir | Kritik |
| `src/pages/finance/ScenarioComparisonPage.tsx` | ExitPlan'ı DealSimulatorCard'a geçir (zaten var) | Düşük |

---

## Beklenen Sonuç

$150k başlangıç geliri, %8 hisse, $250k yatırım için:

| Metrik | Eski (Sabit %30) | Yeni (Decay Model) |
|--------|------------------|-------------------|
| Year 5 Gelir | $556k | $4.5M+ |
| Exit Value | $4.45M | $36M+ |
| Yatırımcı Getirisi | $220k | $1.8M+ |
| MOIC | 0.88x | **7.2x+** |
| IRR | -2% | **~48%** |

---

## İmplementasyon Adımları

1. **constants/simulation.ts** - Startup Growth Profiles ekle
2. **DealSimulatorCard.tsx** - Props ve hesaplama güncelle
3. **Parent bileşenler** - exitPlanYear5 prop'unu geçir
4. **Test** - Farklı gelir senaryoları ile MOIC doğrula

---

## Tahmini Süre

| Adım | Süre |
|------|------|
| Growth Profiles ekleme | 10 dk |
| DealSimulatorCard düzeltme | 20 dk |
| Parent bileşen entegrasyonu | 15 dk |
| Test ve doğrulama | 15 dk |
| **Toplam** | **~1 saat** |
