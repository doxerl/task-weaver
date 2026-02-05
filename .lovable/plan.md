
# Deal Simulator Senaryo-Bağımlı Yapı Planı

## Problem Özeti
Şu an her iki senaryo için **tek bir ortak** `dealConfig` kullanılıyor. Bu yüzden:
1. Pozitif senaryonun "$150K yatırım" değeri, negatif senaryoya da uygulanıyor
2. AI analizi her iki senaryo için aynı yatırım koşullarını değerlendiriyor
3. "Yatırım al vs Yatırım alma" karşılaştırması doğru yapılamıyor

## Çözüm Stratejisi
Her senaryonun **kendi `dealConfig`** değerini kullanmasını sağlamak ve AI analizine **her iki senaryonun deal config'ini ayrı ayrı** göndermek.

---

## Teknik Değişiklikler

### 1. ScenarioComparisonPage.tsx - Senaryo-Bazlı DealConfig Okuma

**Mevcut (Satır 584-588):**
```tsx
const { dealConfig, updateDealConfig } = useInvestorAnalysis();
```

**Yeni:**
```tsx
// Her senaryonun kendi dealConfig'ini oku
const dealConfigA = useMemo(() => scenarioA?.dealConfig || {
  investmentAmount: 0,
  equityPercentage: 0,
  sectorMultiple: 5,
  valuationType: 'post-money'
}, [scenarioA?.dealConfig]);

const dealConfigB = useMemo(() => scenarioB?.dealConfig || {
  investmentAmount: 0,
  equityPercentage: 0,
  sectorMultiple: 5,
  valuationType: 'post-money'
}, [scenarioB?.dealConfig]);

// Pozitif senaryonun dealConfig'ini ana hesaplamalar için kullan
const dealConfig = dealConfigA;
```

### 2. useUnifiedAnalysis.ts - Çift DealConfig Desteği

**runUnifiedAnalysis fonksiyonuna ek parametre:**
```tsx
runUnifiedAnalysis(
  scenarioA,
  scenarioB,
  summaryA,
  summaryB,
  ...
  dealConfigA,  // Pozitif senaryo yatırım koşulları
  dealConfigB   // Negatif senaryo yatırım koşulları (veya yatırım almama)
)
```

**Request Body güncellemesi:**
```tsx
const requestBody = {
  ...
  dealConfig: dealConfigA,        // Backward compat için ana config
  dealConfigScenarioA: dealConfigA,  // Yatırım alan senaryo
  dealConfigScenarioB: dealConfigB,  // Yatırım almayan senaryo
  ...
};
```

### 3. unified-scenario-analysis Edge Function - Karşılaştırma Mantığı

**AI Prompt güncellemesi:**
```text
## YATIRIM KARŞILAŞTIRMASI
- Senaryo A (Pozitif): ${dealConfigA.investmentAmount} USD yatırım, %${dealConfigA.equityPercentage} equity
- Senaryo B (Negatif): ${dealConfigB.investmentAmount} USD yatırım, %${dealConfigB.equityPercentage} equity
  (B'de yatırım 0 ise "organik büyüme / yatırımsız senaryo" olarak değerlendir)

AI bu karşılaştırmada:
1. Yatırım etkisini (ör: "150K yatırım ile $446K gelir vs yatırımsız $149K gelir")
2. Fırsat maliyetini (opportunity cost)
3. Dilüsyon/getiri dengesini hesaplamalı
```

### 4. Varsayılan Değerler

Negatif senaryo için varsayılan dealConfig (yatırım almama):
```typescript
const DEFAULT_NO_INVESTMENT_DEAL: DealConfig = {
  investmentAmount: 0,
  equityPercentage: 0,
  sectorMultiple: 5,  // Exit multiple hala geçerli
  valuationType: 'post-money'
};
```

---

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | `dealConfigA`, `dealConfigB` useMemo ekleme, AI çağrısına ikisini de gönderme |
| `src/hooks/finance/useUnifiedAnalysis.ts` | `runUnifiedAnalysis` signature güncelleme, request body'e `dealConfigScenarioA/B` ekleme |
| `supabase/functions/unified-scenario-analysis/index.ts` | Her iki dealConfig'i prompt'a dahil etme, karşılaştırma mantığı ekleme |

---

## Veri Akışı (Düzeltilmiş)

```text
GrowthSimulation (Pozitif Senaryo Düzenleme)
    ↓ DealSimulator → dealConfig kaydet
simulation_scenarios.deal_config (A)
    ↓
GrowthSimulation (Negatif Senaryo Düzenleme) 
    ↓ DealSimulator → farklı dealConfig kaydet (veya 0 yatırım)
simulation_scenarios.deal_config (B)
    ↓
ScenarioComparisonPage
    ↓ scenarioA.dealConfig + scenarioB.dealConfig oku
    ↓
useUnifiedAnalysis → Edge Function
    ↓ Her iki dealConfig ile AI analizi
    ↓
Sonuç: "150K yatırım alırsan → $446K gelir (198% büyüme)"
       "Yatırım almazsan → $149K gelir (organik)"
```

---

## Kullanıcı Deneyimi

1. **Pozitif Senaryoda:** Kullanıcı Deal Simulator'da "$150K, %10 equity" girer
2. **Negatif Senaryoda:** Kullanıcı "$0, %0 equity" bırakır (veya farklı bir teklif)
3. **Karşılaştırma Sayfasında:** AI her iki durumu analiz eder:
   - "Yatırım alırsanız: $446K gelir, 3 yıl runway, 5.2x MOIC"
   - "Almazsanız: $149K gelir, 8 ay runway, organik büyüme"

Bu yaklaşım "opportunity cost" analizini doğru yapar ve pitch deck'te yatırımcıya ikna edici veri sunar.
