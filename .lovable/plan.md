
# PDF Yüzde Formatlama Hatasını Düzeltme Planı

## Problem

PDF export'ta yüzde değerleri **çift çarpılıyor**:
- **Kaynak veri:** Değerler zaten yüzde olarak hesaplanmış (örn: `profitMargin: 7.6`, `growthRate: 20`)
- **PDF bileşeni:** Aynı değerleri tekrar `* 100` ile çarpıyor
- **Sonuç:** `7.6 * 100 = 760` → `%-7408.1` gibi anlamsız değerler

| Değer | Beklenen | Gösterilen | Sebep |
|-------|----------|------------|-------|
| Profit Margin | `-74.1%` | `%-7408.1` | `-74.1 * 100 = -7410` |
| Organic Growth | `6%` veya `8%` | `%800` | `8 * 100 = 800` |
| Growth Difference | `181%` | `%18108` | `181 * 100 = 18100` |
| Revenue Loss % | `64%` | `6442%` | `64 * 100 = 6400` |

---

## Çözüm

`PdfScenarioImpactPage.tsx` dosyasındaki `* 100` çarpımlarını kaldırmak.

---

## Teknik Değişiklikler

### Dosya: `src/components/simulation/pdf/PdfScenarioImpactPage.tsx`

**Değişiklik 1 - Satır 85 (withInvestment.profitMargin):**
```typescript
// Eski
%{(withInvestment.profitMargin * 100).toFixed(1)}

// Yeni
%{withInvestment.profitMargin.toFixed(1)}
```

**Değişiklik 2 - Satır 91 (withInvestment.growthRate):**
```typescript
// Eski
%{(withInvestment.growthRate * 100).toFixed(0)}

// Yeni
%{withInvestment.growthRate.toFixed(0)}
```

**Değişiklik 3 - Satır 157 (withoutInvestment.profitMargin):**
```typescript
// Eski
%{(withoutInvestment.profitMargin * 100).toFixed(1)}

// Yeni
%{withoutInvestment.profitMargin.toFixed(1)}
```

**Değişiklik 4 - Satır 163 (withoutInvestment.organicGrowthRate):**
```typescript
// Eski
%{(withoutInvestment.organicGrowthRate * 100).toFixed(0)}

// Yeni
%{withoutInvestment.organicGrowthRate.toFixed(0)}
```

**Değişiklik 5 - Satır 266 (opportunityCost.growthRateDiff):**
```typescript
// Eski
%{(opportunityCost.growthRateDiff * 100).toFixed(0)}

// Yeni
%{opportunityCost.growthRateDiff.toFixed(0)}
```

**Değişiklik 6 - Satır 303 (opportunityCost.percentageLoss):**
```typescript
// Eski
percent: (opportunityCost.percentageLoss * 100).toFixed(0)

// Yeni
percent: opportunityCost.percentageLoss.toFixed(0)
```

---

## Dosya Değişiklikleri Özeti

| Dosya | Değişiklik |
|-------|-----------|
| `PdfScenarioImpactPage.tsx` | 6 yerde `* 100` çarpımını kaldır |

---

## Sonuç

Bu değişiklikle:
- ✅ `Profit Margin: %-7408.1` → `%-74.1`
- ✅ `Organic Growth: %800` → `%8`
- ✅ `Growth Difference: %18108` → `%181`
- ✅ `"6442% of revenue"` → `"64% of revenue"`
