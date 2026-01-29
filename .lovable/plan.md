
## AI Senaryo İsimlendirme Mantığı Düzeltmesi

### Problem Analizi

Mevcut kodda senaryo yılı hesaplama mantığı hatalı:

```text
┌─────────────────────────────────────────────────────────────────┐
│ MEVCUT (HATALI) - useScenarios.ts satır 275-276               │
├─────────────────────────────────────────────────────────────────┤
│ const nextTargetYear = currentScenario.targetYear + 1;         │
│                                                                 │
│ scenarioB.targetYear + 1 olarak sabitlenmiş                    │
│                                                                 │
│ SORUN: scenarioA daha ileri yılda olabilir!                    │
└─────────────────────────────────────────────────────────────────┘
```

**Örnek durumlar:**
| Senaryo A | Senaryo B | Mevcut Sonuç | Beklenen Sonuç |
|-----------|-----------|--------------|----------------|
| 2026 Negatif | 2026 Pozitif | 2027 ✓ | 2027 ✓ |
| 2027 Büyüme | 2026 Pozitif | **2027 ✗** | **2028** |
| 2028 | 2027 | **2028 ✗** | **2029** |

### Çözüm: max(A.targetYear, B.targetYear) + 1

Edge function zaten doğru hesaplıyor (satır 86-117):
```typescript
projectionYear: targetYearA + 1  // veya targetYearB + 1
```

Ama bu bilgi frontend'e iletilmiyor. İki yerde düzeltme yapılacak:

---

### Değişiklik 1: Edge Function - projectionYear'ı response'a ekle

**Dosya:** `supabase/functions/unified-scenario-analysis/index.ts`

Edge function'ın döndürdüğü JSON'a `projection_year` alanı eklenecek:

```typescript
// Response'a ekle
return new Response(
  JSON.stringify({
    ...analysisResult,
    projection_year: scenarioRelationship.projectionYear  // YENİ ALAN
  }),
  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

---

### Değişiklik 2: NextYearProjection tipine projectionYear ekle

**Dosya:** `src/types/simulation.ts`

```typescript
export interface NextYearProjection {
  strategy_note: string;
  virtual_opening_balance?: VirtualOpeningBalance;
  quarterly: { ... };
  summary: { ... };
  investor_hook?: InvestorHook;
  projection_year?: number;  // YENİ ALAN - AI'dan gelen hedef yıl
}
```

---

### Değişiklik 3: createNextYearFromAI fonksiyonunu güncelle

**Dosya:** `src/hooks/finance/useScenarios.ts`

```typescript
// Create next year simulation from AI projection
const createNextYearFromAI = useCallback(async (
  scenarioA: SimulationScenario,  // Her iki senaryo da geçilecek
  scenarioB: SimulationScenario,
  aiProjection: NextYearProjection
): Promise<SimulationScenario | null> => {
  
  // DOĞRU HESAPLAMA: max(A.targetYear, B.targetYear) + 1
  const nextTargetYear = aiProjection.projection_year || 
    Math.max(scenarioA.targetYear, scenarioB.targetYear) + 1;
  
  const nextBaseYear = nextTargetYear - 1;
  
  // Referans senaryo: En yüksek yıla sahip pozitif senaryo
  const referenceScenario = scenarioA.targetYear >= scenarioB.targetYear 
    ? scenarioA 
    : scenarioB;
  
  // ... mevcut kod devam eder
  
  const newScenario = {
    name: `${nextTargetYear} Global Vizyon`,  // Doğru yıl
    baseYear: nextBaseYear,
    targetYear: nextTargetYear,
    // ...
  };
}, [saveScenario, scenarios]);
```

---

### Değişiklik 4: ScenarioComparisonPage - handleCreateNextYear güncelle

**Dosya:** `src/pages/finance/ScenarioComparisonPage.tsx` (satır 1155-1162)

```typescript
const handleCreateNextYear = async () => {
  if (!unifiedAnalysis?.next_year_projection || !scenarioA || !scenarioB) return;
  
  // Her iki senaryoyu da geç
  const newScenario = await createNextYearFromAI(
    scenarioA,
    scenarioB, 
    unifiedAnalysis.next_year_projection
  );
  
  if (newScenario) {
    toast.success(`${newScenario.targetYear} yılı senaryosu oluşturuldu!`);
    navigate(`/finance/simulation?scenario=${newScenario.id}`);
  }
};
```

---

### Değişiklik 5: AIAnalysisSummaryCard - Dinamik yıl gösterimi

**Dosya:** `src/components/simulation/AIAnalysisSummaryCard.tsx`

Mevcut kod (satır 318):
```typescript
<h4>{targetYear ? targetYear + 1 : 'Sonraki Yıl'}'e Geç</h4>
```

Güncellenmiş:
```typescript
// Props'a projectionYear ekle
interface Props {
  // ... mevcut props
  projectionYear?: number;  // AI'dan gelen hedef yıl
}

// Kullanım
const displayYear = projectionYear || (targetYear ? targetYear + 1 : null);
<h4>{displayYear || 'Sonraki Yıl'}'e Geç</h4>
```

---

### Beklenen Sonuç

| Karşılaştırma | Mevcut | Düzeltme Sonrası |
|---------------|--------|------------------|
| 2026 N vs 2026 Pozitif | 2027 | 2027 ✓ |
| 2027 vs 2026 Pozitif | 2027 (hatalı) | 2028 ✓ |
| 2027 vs 2028 | 2028 (hatalı) | 2029 ✓ |

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/functions/unified-scenario-analysis/index.ts` | Response'a `projection_year` ekle |
| `src/types/simulation.ts` | `NextYearProjection` tipine alan ekle |
| `src/hooks/finance/useScenarios.ts` | `createNextYearFromAI` parametreleri ve hesaplama |
| `src/pages/finance/ScenarioComparisonPage.tsx` | `handleCreateNextYear` fonksiyonu |
| `src/components/simulation/AIAnalysisSummaryCard.tsx` | Dinamik yıl gösterimi |

### Teknik Detaylar

**Edge Function Mantığı (Mevcut - Doğru):**
```typescript
function detectScenarioRelationship(scenarioA, scenarioB) {
  // Same year = pozitif vs negatif
  if (targetYearA === targetYearB) {
    return { projectionYear: targetYearA + 1 };  // 2026 + 1 = 2027
  }
  
  // A is later = successor projection
  if (targetYearA > targetYearB) {
    return { projectionYear: targetYearA + 1 };  // 2027 + 1 = 2028
  }
  
  // B is later
  return { projectionYear: targetYearB + 1 };
}
```

Bu mantık doğru çalışıyor, sadece frontend'e iletilmesi gerekiyor.
