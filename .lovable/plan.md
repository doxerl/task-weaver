
## Yatırım Odak Projeleri - Seçici Büyüme Çarpanı Planı

### Problem Özeti

"2027'e Geç" butonu ile yeni yıl senaryosu oluşturulurken, **tüm gelir kalemlerine** aynı büyüme oranı uygulanıyor. Kullanıcının istediği:

- **Seçili odak projeler** → AI projeksiyonuna göre büyüme çarpanı
- **Diğer projeler** → Sabit kalmalı (projectedAmount = baseAmount, yani %0 büyüme)

```text
┌─────────────────────────────────────────────────────────────────┐
│  MEVCUT MANTIK                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  createNextYearFromAI(scenarioA, scenarioB, aiProjection)      │
│                                                                 │
│  TÜM gelir kalemleri:                                          │
│  ├── SBT Tracker      $205K → $321K (+57%)                     │
│  ├── Leadership       $68K  → $107K (+57%)                     │
│  ├── Danışmanlık      $21K  → $33K  (+57%)                     │
│  └── ZDHC InCheck     $13K  → $21K  (+57%)                     │
│                                                                 │
│  SORUN: Tüm kalemler aynı çarpanla büyüyor!                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OLMASI GEREKEN MANTIK                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  createNextYearFromAI(..., focusProjects: ['SBT Tracker'])     │
│                                                                 │
│  Odak projeler (büyüme uygulanır):                             │
│  └── SBT Tracker      $205K → $321K (+57%)  ✅                 │
│                                                                 │
│  Diğer projeler (sabit kalır):                                 │
│  ├── Leadership       $68K  → $68K  (%0)    📌                 │
│  ├── Danışmanlık      $21K  → $21K  (%0)    📌                 │
│  └── ZDHC InCheck     $13K  → $13K  (%0)    📌                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Çözüm Yaklaşımı

**Temel Mantık:**
1. `focusProjects` array'i fonksiyona parametre olarak gönderilecek
2. Her gelir kalemi için:
   - Eğer `focusProjects.includes(r.category)` → AI büyüme oranı uygulanır
   - Değilse → `projectedAmount = baseAmount` (değişmez)
3. Toplam büyüme sadece odak projelerden gelecek

---

### Değişiklikler

#### 1. useScenarios.ts - Fonksiyon İmzası Güncelleme

`createNextYearFromAI` fonksiyonuna `focusProjects` parametresi eklenecek:

```typescript
const createNextYearFromAI = useCallback(async (
  scenarioA: SimulationScenario,
  scenarioB: SimulationScenario,
  aiProjection: NextYearProjection,
  focusProjects: string[] = []  // YENİ PARAMETRE
): Promise<SimulationScenario | null> => {
```

#### 2. useScenarios.ts - Gelir Hesaplama Mantığı

Mevcut `newRevenues` hesaplaması:
```typescript
// MEVCUT: Tüm kalemler aynı oranda büyür
const newRevenues = referenceScenario.revenues.map(r => {
  const ratio = currentTotalRevenue > 0 ? r.projectedAmount / currentTotalRevenue : ...;
  const itemProjectedAmount = Math.round(totalAIRevenue * ratio);
  // ...
});
```

Yeni mantık:
```typescript
// YENİ: Odak projeler büyür, diğerleri sabit
const newRevenues = referenceScenario.revenues.map(r => {
  const isFocusProject = focusProjects.includes(r.category);
  
  let itemProjectedAmount: number;
  let projectedQuarterly: QuarterlyAmounts;
  
  if (isFocusProject && focusProjects.length > 0) {
    // ODAK PROJE: Toplam AI büyümesini odak projeler arasında dağıt
    // Odak projelerin mevcut toplam cirosu
    const focusProjectsCurrentTotal = referenceScenario.revenues
      .filter(rv => focusProjects.includes(rv.category))
      .reduce((sum, rv) => sum + rv.projectedAmount, 0);
    
    // Bu odak projenin payı
    const focusRatio = focusProjectsCurrentTotal > 0 
      ? r.projectedAmount / focusProjectsCurrentTotal 
      : 1 / focusProjects.length;
    
    // Odak olmayan projelerin sabit toplamı
    const nonFocusTotal = referenceScenario.revenues
      .filter(rv => !focusProjects.includes(rv.category))
      .reduce((sum, rv) => sum + rv.projectedAmount, 0);
    
    // Odak projelere düşen AI ciro hedefi
    const focusProjectsTargetTotal = totalAIRevenue - nonFocusTotal;
    
    itemProjectedAmount = Math.round(focusProjectsTargetTotal * focusRatio);
    
    // Çeyreklik dağılım AI oranlarıyla
    projectedQuarterly = {
      q1: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q1),
      q2: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q2),
      q3: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q3),
      q4: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q4),
    };
  } else {
    // DİĞER PROJE: Sabit kal (baseAmount = projectedAmount)
    itemProjectedAmount = r.projectedAmount; // Önceki yılın projectedAmount değeri
    
    // Çeyreklik dağılım: Önceki yıldan aynen al
    projectedQuarterly = r.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 };
  }
  
  return {
    id: generateId(),
    category: r.category,
    baseAmount: r.projectedAmount,  // Önceki yılın projectedAmount = yeni baseAmount
    baseQuarterly: r.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 },
    projectedAmount: itemProjectedAmount,
    projectedQuarterly,
    description: r.description,
    isNew: false,
    startMonth: r.startMonth,
  };
});
```

#### 3. ScenarioComparisonPage.tsx - Fonksiyon Çağrısı Güncelleme

```typescript
const handleCreateNextYear = async () => {
  if (!unifiedAnalysis?.next_year_projection || !scenarioA || !scenarioB) return;
  
  // focusProjects parametresini ekle
  const newScenario = await createNextYearFromAI(
    scenarioA, 
    scenarioB, 
    unifiedAnalysis.next_year_projection,
    focusProjects  // YENİ: Seçili odak projeler
  );
  
  if (newScenario) {
    toast.success(`${newScenario.targetYear} yılı senaryosu oluşturuldu!`);
    navigate(`/finance/simulation?scenario=${newScenario.id}`);
  }
};
```

#### 4. Senaryo Notlarına Odak Bilgisi Ekleme

```typescript
const focusProjectNote = focusProjects.length > 0
  ? `\n🎯 Odak Projeler: ${focusProjects.join(', ')}\n📌 Diğer projeler sabit tutuldu.`
  : '';

const newScenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'updatedAt'> = {
  // ...
  notes: `🤖 AI tarafından oluşturuldu...${focusProjectNote}\n\n${inheritedItemsNote}...`,
};
```

---

### Örnek Senaryo

**Girdi:**
- Mevcut toplam ciro: $308K
- AI hedef ciro: $483K (+57% genel büyüme)
- Seçili odak proje: SBT Tracker ($205K mevcut)
- Diğer projeler: $103K (Leadership $68K + Danışmanlık $21K + ZDHC $14K)

**Hesaplama:**
1. Diğer projeler sabit: $103K
2. Odak projeler hedefi: $483K - $103K = $380K
3. SBT Tracker yeni değeri: $380K (tek odak proje olduğu için tamamı)

**Çıktı:**
| Proje | 2026 (Base) | 2027 (Projected) | Büyüme |
|-------|-------------|------------------|--------|
| SBT Tracker ⭐ | $205K | $380K | +85% |
| Leadership | $68K | $68K | %0 |
| Danışmanlık | $21K | $21K | %0 |
| ZDHC InCheck | $14K | $14K | %0 |
| **Toplam** | **$308K** | **$483K** | **+57%** |

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useScenarios.ts` | `createNextYearFromAI` fonksiyon imzası + gelir hesaplama mantığı |
| `src/pages/finance/ScenarioComparisonPage.tsx` | `handleCreateNextYear` fonksiyonunda `focusProjects` parametresi ekleme |

---

### Beklenen Sonuç

| Senaryo | Önceki Davranış | Yeni Davranış |
|---------|-----------------|---------------|
| Odak proje seçilmemiş | Tüm kalemler büyür | Tüm kalemler büyür (mevcut) |
| 1 odak proje seçili | Tüm kalemler büyür | Sadece odak proje büyür |
| 2 odak proje seçili | Tüm kalemler büyür | Sadece 2 odak proje büyür |

**Yatırımcı Mantığı:** 
> "Yatırımı SBT Tracker'a odaklayarak bu proje %85 büyür, diğer projeler stabil kalır. Bu, yatırımın geri dönüşünün nereden geleceğini net gösterir."
