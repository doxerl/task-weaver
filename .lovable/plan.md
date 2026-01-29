

## Veri Tutarsızlığı Analizi: İki Tablo Neden Eşleşmiyor

### Temel Problem

Ekranda görünen iki tablo **tamamen farklı veri kaynaklarından** besleniyor:

| Tablo | Dosya/Satır | Veri Kaynağı | 2027 Toplam Gelir |
|-------|-------------|--------------|-------------------|
| "2027 Gelir Projeksiyonu" | ScenarioComparisonPage.tsx (satır 876-926) | `scenarioA.revenues × 1.30` (Varsayılan %30 büyüme) | ~$580K |
| "5 Yıllık Projeksiyon Detayı" | InvestmentTab.tsx → calculateExitPlan() | `aiNextYearProjection.summary.total_revenue` | $580.6K (AI'dan) |

---

### Problem 1: Düzenlenebilir Tablo AI Verilerini Kullanmıyor

**Mevcut kod (ScenarioComparisonPage.tsx satır 882-888):**
```typescript
const growthMultiplier = 1.3; // Varsayılan %30 büyüme
const baseQ = r.projectedQuarterly || { q1: r.projectedAmount / 4, ... };
const q1 = Math.round((baseQ.q1 || r.projectedAmount / 4) * growthMultiplier);
```

Bu kod, AI'ın `next_year_projection.quarterly` içindeki **kategori bazlı gelir/gider verilerini tamamen yok sayıyor**.

**AI'ın ürettiği veri (next_year_projection.quarterly):**
```typescript
quarterly: {
  q1: { revenue: $53.7K, expenses: $89.6K },
  q2: { revenue: $98.9K, expenses: $111.4K },
  q3: { revenue: $189.9K, expenses: $148.0K },
  q4: { revenue: $238.0K, expenses: $154.3K }
}
```

**Kullanılması gereken:** AI'ın ürettiği çeyreklik veriler, ancak bunlar toplam değerler. Kategori bazlı dağılım yok.

---

### Problem 2: Kategori Bazlı Projeksiyon Eksik

AI'ın `NextYearProjection` tipi sadece **toplam** çeyreklik gelir/gider içeriyor:
```typescript
interface NextYearProjection {
  quarterly: {
    q1: { revenue: number; expenses: number; ... };
    // Kategori bazlı breakdown YOK!
  };
  summary: { total_revenue, total_expenses, net_profit };
}
```

Ancak "2027 Gelir Projeksiyonu" tablosu **kategori bazlı** (SBT Tracker, Leadership Denetim, vb.) gösteriyor.

---

### Çözüm Planı

#### 1. AI Promptunu Güncelle - Kategori Bazlı Projeksiyon İste

Edge function `unified-scenario-analysis`'a kategori bazlı projeksiyon ekle:

```typescript
// NextYearProjection tipine eklenecek:
interface CategoryProjection {
  category: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
  growth_rate: number;  // Baz yıla göre büyüme
}

interface NextYearProjection {
  // ... mevcut alanlar
  itemized_revenues?: CategoryProjection[];  // YENİ
  itemized_expenses?: CategoryProjection[];  // YENİ
}
```

#### 2. Düzenlenebilir Tabloyu AI Verileriyle Besle

ScenarioComparisonPage.tsx'deki `useEffect`'i güncelle:

```typescript
useEffect(() => {
  if (unifiedAnalysis?.next_year_projection && scenarioA) {
    const projection = unifiedAnalysis.next_year_projection;
    
    // YENİ: AI'dan gelen itemized veriler varsa kullan
    if (projection.itemized_revenues?.length) {
      const revenueItems: EditableProjectionItem[] = projection.itemized_revenues.map(item => ({
        category: item.category,
        q1: item.q1,
        q2: item.q2,
        q3: item.q3,
        q4: item.q4,
        total: item.total,
        aiGenerated: true,
        userEdited: false
      }));
      setEditableRevenueProjection(revenueItems);
    } else {
      // Fallback: Mevcut mantık (senaryo × 1.30)
    }
  }
}, [unifiedAnalysis?.next_year_projection, scenarioA]);
```

#### 3. 5 Yıllık Tabloyu Düzenlenebilir Verilerle Senkronize Et

InvestmentTab'ın `aiProjectionForExitPlan`'ı **düzenlenmiş** verileri kullanmalı:

```typescript
// ScenarioComparisonPage'den InvestmentTab'a geçirilecek:
<InvestmentTab
  // ... mevcut props
  aiNextYearProjection={unifiedAnalysis?.next_year_projection}
  editedProjectionOverride={{
    totalRevenue: editableRevenueProjection.reduce((sum, r) => sum + r.total, 0),
    totalExpenses: editableExpenseProjection.reduce((sum, e) => sum + e.total, 0),
  }}
/>
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/types/simulation.ts` | `NextYearProjection` tipine `itemized_revenues` ve `itemized_expenses` ekle |
| `supabase/functions/unified-scenario-analysis/index.ts` | AI promptuna kategori bazlı projeksiyon talimatı ekle |
| `src/pages/finance/ScenarioComparisonPage.tsx` | Düzenlenebilir tabloyu AI itemized verileriyle besle |
| `src/components/simulation/InvestmentTab.tsx` | `editedProjectionOverride` prop'u ile kullanıcı düzenlemelerini al |

---

### Beklenen Sonuç

| Metrik | Önceki | Sonraki |
|--------|--------|---------|
| 2027 Gelir Tablosu Kaynağı | Senaryo × 1.30 (hardcoded) | AI itemized verileri |
| 5 Yıllık Tablo Kaynağı | AI summary.total_revenue | Düzenlenebilir tablo toplamları |
| Veri Tutarlılığı | ❌ Farklı kaynaklar | ✅ Tek kaynak (AI → Düzenlenebilir → 5 Yıllık) |
| Kullanıcı Düzenlemeleri | 5 Yıllık tabloya yansımıyor | ✅ Otomatik senkronize |

---

### Veri Akışı (Düzeltilmiş)

```text
┌─────────────────────────────────────────────────────────────────┐
│  DÜZELTİLMİŞ VERİ AKIŞI                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI unified-scenario-analysis →                                 │
│  └── next_year_projection: {                                   │
│        itemized_revenues: [                                     │
│          { category: "SBT Tracker", q1: 26K, q2: 45.5K, ... }  │
│          { category: "Leadership Denetim", ... }               │
│        ],                                                       │
│        itemized_expenses: [...],                                │
│        summary: { total_revenue: 580.6K, ... }                 │
│      }                                                          │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  "2027 Gelir Projeksiyonu" Tablosu (Düzenlenebilir)            │
│  └── editableRevenueProjection = itemized_revenues             │
│                                                                 │
│  ↓ (Kullanıcı düzenleyebilir)                                  │
│                                                                 │
│  InvestmentTab (editedProjectionOverride prop)                 │
│  └── Year 1 = editedTotal ($580.6K veya kullanıcı değeri)      │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  "5 Yıllık Projeksiyon Detayı" Tablosu                         │
│  └── 2027: $580.6K (senkronize!)                               │
│  └── 2028+: Büyüme formülü ile                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

