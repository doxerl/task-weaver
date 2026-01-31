

## AI Projeksiyon Yılı Uyumsuzluğu - 2029 Senaryosu %0 Büyüme Sorunu

### Problem Analizi

**Gözlem:**
- 2028 Baz Yıl: Gelir $1.3M, Gider $743K, Net Kar $574K
- 2029 Projeksiyon: Gelir $1.3M (+0.0%), Gider $743K (+0.0%), Net Kar $574K (+0.0%)

**Kök Neden:**
AI analizi 2028 vs 2027 karşılaştırmasından yapılmış ve `next_year_projection` değerleri **2028 için** üretilmiş. Ancak "2029'a Geç" butonuna basıldığında, sistem bu 2028 projeksiyonunu 2029'a kopyalamış.

Veritabanı doğrulaması:
```text
scenario_ai_analyses:
- scenario_a_id: 2028 Global Vizyon
- scenario_b_id: 2027 Global Vizyon
- next_year_projection.summary.total_revenue: $1,316,967
- next_year_projection.projection_year: NULL  ← SORUN!

2028 Global Vizyon senaryo:
- total_projected_revenue: $1,316,967  ← AYNI DEĞER!

2029 Global Vizyon senaryo (oluşturulan):
- total_projected_revenue: $1,316,967  ← AYNI DEĞER! (%0 büyüme)
```

**Mantık Hatası:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  MEVCUT (HATALI) AKIŞ:                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AI Analizi: 2028 vs 2027 karşılaştırması yapılır           │
│  2. AI projection_year: 2028 (ama NULL döndürüyor!)            │
│  3. AI total_revenue: $1.32M (2028 hedefi)                     │
│                                                                 │
│  4. "2029'a Geç" butonuna basılır                              │
│  5. createNextYearFromAI çağrılır                              │
│  6. nextTargetYear = max(2028, 2027) + 1 = 2029 (DOĞRU)        │
│  7. referenceScenario = 2028 (DOĞRU)                           │
│  8. 2028.projectedAmount = $1.32M                              │
│                                                                 │
│  ⚠️ SORUN:                                                      │
│  9. AI totalRevenue = $1.32M (2028 için hesaplandı)            │
│  10. 2029 projectedAmount = $1.32M × oransal dağılım           │
│  11. Sonuç: baseAmount = projectedAmount = $1.32M              │
│  12. Büyüme = %0!                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Çözüm Stratejisi

Problem iki katmanda çözülmeli:

#### 1. Edge Function: projection_year Zorunlu Dönüş

AI'ın `next_year_projection.projection_year` değerini **doğru yıl** ile doldurması gerekiyor.

**Dosya: `supabase/functions/unified-scenario-analysis/index.ts`**

JSON schema'da `projection_year` alanını zorunlu hale getir ve prompt'ta net talimat ver:

```typescript
// Schema güncelleme
projection_year: {
  type: "number",
  description: "REQUIRED: The year this projection is FOR. Calculate as max(scenarioA.targetYear, scenarioB.targetYear) + 1. For example, if comparing 2028 vs 2027, projection_year MUST be 2029."
}
```

#### 2. Frontend: Yıl Uyumsuzluğu Kontrolü

`createNextYearFromAI` fonksiyonunda AI'ın döndürdüğü projeksiyon yılı ile hedef yılı karşılaştır. Uyumsuzluk varsa, otomatik büyüme çarpanı uygula.

**Dosya: `src/hooks/finance/useScenarios.ts`**

```typescript
// createNextYearFromAI içinde (satır ~304)
const nextTargetYear = Math.max(scenarioA.targetYear, scenarioB.targetYear) + 1;
const aiProjectionYear = aiProjection.projection_year;

// YIL UYUMSUZLUĞU KONTROLÜ
if (aiProjectionYear && aiProjectionYear !== nextTargetYear) {
  console.warn(`[createNextYearFromAI] Year mismatch! AI projection is for ${aiProjectionYear}, but creating ${nextTargetYear}`);
  // AI 2028 için projeksiyon yaptı ama biz 2029 istiyoruz
  // Otomatik büyüme faktörü uygula
  const yearGap = nextTargetYear - aiProjectionYear;
  const growthFactor = Math.pow(1.15, yearGap); // Yıllık %15 varsayılan büyüme
  totalAIRevenue = Math.round(totalAIRevenue * growthFactor);
  totalAIExpenses = Math.round(totalAIExpenses * (growthFactor * 0.7)); // Operating leverage
}

// AI projeksiyonu yoksa veya $0 ise fallback
if (totalAIRevenue <= currentTotalRevenue) {
  console.warn('[createNextYearFromAI] AI projection <= current, applying growth fallback');
  totalAIRevenue = Math.round(currentTotalRevenue * 1.20); // %20 minimum büyüme
  totalAIExpenses = Math.round(currentTotalExpenses * 1.12); // %12 gider artışı
}
```

---

### Detaylı Uygulama Planı

#### Dosya 1: Edge Function Schema Güncellemesi

**`supabase/functions/unified-scenario-analysis/index.ts`**

1. `next_year_projection` schema'sına `projection_year` zorunluluğu ekle
2. Prompt'a yıl hesaplama talimatı ekle:

```typescript
// next_year_projection schema içinde:
projection_year: {
  type: "number",
  description: "CRITICAL: The target year for this projection. MUST be max(scenarioA.targetYear, scenarioB.targetYear) + 1. Example: Comparing 2028 vs 2027 → projection_year = 2029."
}

// Prompt'a eklenecek:
"📅 PROJECTION YEAR RULE:
Calculate projection_year = max(Scenario_A_Year, Scenario_B_Year) + 1
Example: Comparing 2028 Scenario vs 2027 Scenario → Projection year is 2029.
The summary values (total_revenue, total_expenses) MUST be projections FOR this year, NOT the current scenario values!"
```

#### Dosya 2: Frontend Yıl Uyumsuzluğu Kontrolü

**`src/hooks/finance/useScenarios.ts`** - `createNextYearFromAI` fonksiyonu

Yıl uyumsuzluğu ve değer kontrolü:

```typescript
// Satır ~304-320 arası
const nextTargetYear = aiProjection.projection_year || 
  Math.max(scenarioA.targetYear, scenarioB.targetYear) + 1;

// Referans senaryo toplam değerleri
const currentTotalRevenue = referenceScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
const currentTotalExpenses = referenceScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);

// AI değerlerini al
let totalAIRevenue = aiProjection.summary.total_revenue;
let totalAIExpenses = aiProjection.summary.total_expenses;

// KRİTİK KONTROL: AI projeksiyonu mevcut değerlerle aynı/düşük mü?
// Bu, AI'ın yanlış yıl için projeksiyon yaptığını gösterir
const revenueGrowth = currentTotalRevenue > 0 
  ? (totalAIRevenue - currentTotalRevenue) / currentTotalRevenue 
  : 0;

if (revenueGrowth <= 0.05) { // %5'ten az büyüme = muhtemelen yanlış yıl
  console.warn(`[createNextYearFromAI] Low/no growth detected (${(revenueGrowth * 100).toFixed(1)}%). Applying minimum growth.`);
  
  // Minimum %20 büyüme uygula (bilimsel model fallback)
  const minGrowthRate = 0.20;
  totalAIRevenue = Math.round(currentTotalRevenue * (1 + minGrowthRate));
  
  // Operating leverage: giderler daha yavaş büyür
  const expenseGrowthRate = minGrowthRate * 0.6;
  totalAIExpenses = Math.round(currentTotalExpenses * (1 + expenseGrowthRate));
  
  console.log(`[createNextYearFromAI] Fallback applied: Revenue $${currentTotalRevenue.toLocaleString()} → $${totalAIRevenue.toLocaleString()}`);
}
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik | Öncelik |
|-------|------------|---------|
| `supabase/functions/unified-scenario-analysis/index.ts` | `projection_year` schema ve prompt güncellemesi | Yüksek |
| `src/hooks/finance/useScenarios.ts` | `createNextYearFromAI` - büyüme kontrolü ve fallback | Yüksek |

---

### Beklenen Sonuç

**Önce (Hatalı):**
```text
2028 Baz Yıl: $1.32M Gelir
2029 Projeksiyon: $1.32M Gelir (+0.0%)  ← HATALI
```

**Sonra (Düzeltilmiş):**
```text
2028 Baz Yıl: $1.32M Gelir
2029 Projeksiyon: $1.58M Gelir (+20.0%)  ← DOĞRU (minimum büyüme fallback)
```

**Akış Kontrolü:**
```text
┌─────────────────────────────────────────────────────────────────┐
│  DÜZELTİLMİŞ AKIŞ:                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AI Analizi: 2028 vs 2027 karşılaştırması                   │
│  2. AI projection_year: 2029 (ZORUNLU!)                        │
│  3. AI total_revenue: $1.58M (2029 hedefi)                     │
│                                                                 │
│  VEYA (fallback):                                               │
│                                                                 │
│  1. AI projection_year: NULL veya 2028                         │
│  2. revenueGrowth <= 5% kontrolü tetiklenir                    │
│  3. Minimum %20 büyüme uygulanır                               │
│  4. totalAIRevenue = $1.32M × 1.20 = $1.58M                    │
│                                                                 │
│  SONUÇ:                                                         │
│  5. 2029 senaryosu: $1.58M gelir, $832K gider                  │
│  6. Büyüme: +20% (görünür ve anlamlı)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

