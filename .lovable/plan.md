# Deal Simulator MOIC Hesaplama Düzeltmesi ✅ TAMAMLANDI

## Yapılan Değişiklikler

### 1. `src/constants/simulation.ts`
- `STARTUP_GROWTH_PROFILES` eklendi (SAAS, SERVICES, ECOMMERCE, PRODUCT)
- `calculateDecayYear5Revenue()` fonksiyonu eklendi
- `BusinessModel` tipi export edildi

### 2. `src/components/simulation/DealSimulatorCard.tsx`
- `exitPlanYear5` ve `businessModel` props eklendi
- Sabit %30 büyüme oranı yerine dinamik Startup Decay Model kullanılıyor
- Projeksiyon modeli şeffaflık bölümü eklendi (Year 5 Revenue/Valuation gösterimi)

### 3. `src/pages/finance/GrowthSimulation.tsx`
- `exitPlanYear5` hesaplaması eklendi (useMemo ile)
- DealSimulatorCard'a yeni props geçirildi

### 4. i18n güncellemeleri
- `simulation.json` (TR/EN) - projectionModel, revenue, year5Revenue, year5Valuation key'leri eklendi

## Beklenen Sonuç

$150k başlangıç geliri için:

| Metrik | Eski (Sabit %30) | Yeni (Startup Decay) |
|--------|------------------|---------------------|
| Year 5 Gelir | $556k | $4.5M+ |
| Exit Value | $4.45M | $36M+ |
| MOIC | 0.88x | **7.2x+** |
| IRR | -2% | **~48%** |

## Startup Decay Model (SaaS Profili)
- Year 2: +150% büyüme
- Year 3: +100% büyüme  
- Year 4: +75% büyüme
- Year 5: +50% büyüme
