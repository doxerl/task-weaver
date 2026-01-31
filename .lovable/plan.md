

## "2027'e Geç" Buton Yılı Hardcoded Problemi

### Problem Analizi

Ekran görüntüsünde göründüğü gibi:
- **Senaryo A**: 2027 Global Vizyon (2027 yılı)
- **Senaryo B**: 2026 Pozitif Senaryo (2026 yılı)
- **Buton**: "2027'e Geç" yazıyor

Ancak kuralımıza göre: `projectionYear = max(2027, 2026) + 1 = 2028`

Bu nedenle buton **"2028'e Geç"** yazmalı.

### Kök Neden

**Dosya: `src/components/simulation/AIAnalysisSummaryCard.tsx` (satır 62-64)**

```typescript
const nextYearDisplay = projectionYear || 
  (unifiedAnalysis?.next_year_projection?.projection_year) ||
  (targetYear ? targetYear + 1 : null);  // ← SORUN BURADA
```

**Dosya: `src/pages/finance/ScenarioComparisonPage.tsx` (satır 1399)**

```typescript
targetYear={scenarioB?.targetYear}  // ← Sadece Senaryo B'nin yılı geçiriliyor
```

Fallback hesaplaması `scenarioB.targetYear + 1` kullanıyor (2026 + 1 = 2027), ancak doğru formül `max(scenarioA.targetYear, scenarioB.targetYear) + 1` olmalı.

### Çözüm

#### Seçenek 1: ScenarioComparisonPage'de Hesapla (Tercih Edilen)

Projeksiyon yılını doğru şekilde hesaplayıp AIAnalysisSummaryCard'a geçir:

```typescript
// ScenarioComparisonPage.tsx satır ~1399
const calculatedProjectionYear = Math.max(
  scenarioA?.targetYear || new Date().getFullYear(),
  scenarioB?.targetYear || new Date().getFullYear()
) + 1;

// Prop olarak geçir
projectionYear={unifiedAnalysis?.next_year_projection?.projection_year || calculatedProjectionYear}
```

Bu değişiklik sayesinde:
- AI analizi yapılmadan önce bile doğru yıl gösterilir
- AI analizi yapıldıktan sonra AI'ın döndürdüğü yıl kullanılır

### Değiştirilecek Dosyalar

| Dosya | Satır | Değişiklik |
|-------|-------|------------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | ~1393-1405 | `projectionYear` prop'unu `max(A.year, B.year) + 1` ile fallback hesaplamalı olarak geçir |

### Beklenen Sonuç

| Senaryo A Yılı | Senaryo B Yılı | Mevcut Buton | Düzeltilmiş Buton |
|----------------|----------------|--------------|-------------------|
| 2027 | 2026 | "2027'e Geç" | "2028'e Geç" |
| 2026 | 2026 | "2027'e Geç" | "2027'e Geç" |
| 2028 | 2027 | "2027'e Geç" | "2029'e Geç" |

### Kod Değişikliği

```typescript
// src/pages/finance/ScenarioComparisonPage.tsx - AIAnalysisSummaryCard render bölümü

// Projeksiyon yılını doğru hesapla
const maxScenarioYear = Math.max(
  scenarioA?.targetYear || new Date().getFullYear(),
  scenarioB?.targetYear || new Date().getFullYear()
);
const fallbackProjectionYear = maxScenarioYear + 1;

<AIAnalysisSummaryCard
  unifiedAnalysis={unifiedAnalysis}
  isLoading={unifiedLoading}
  onAnalyze={handleUnifiedAnalysis}
  onShowPitchDeck={() => setShowPitchDeck(true)}
  onCreateNextYear={handleCreateNextYear}
  targetYear={maxScenarioYear}  // Artık max yıl
  cachedAt={unifiedCachedInfo?.updatedAt || null}
  scenarioA={scenarioA}
  scenarioB={scenarioB}
  summaryA={summaryA}
  summaryB={summaryB}
  projectionYear={unifiedAnalysis?.next_year_projection?.projection_year || fallbackProjectionYear}
/>
```

