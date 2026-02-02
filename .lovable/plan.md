
## ScenarioComparisonPage.tsx i18n Tam Entegrasyon Planı

### Problem Analizi

Sayfa `useTranslation` hook'unu kullanıyor ancak birçok element hala hardcoded Türkçe string içeriyor. Mevcut çeviri dosyasında key'ler var ancak sayfada kullanılmıyor.

### Tespit Edilen Hardcoded Stringler

| Satır | Mevcut Türkçe String | Eksik i18n Key |
|-------|---------------------|----------------|
| 283-286 | "Senaryo verileri güncellendi", "Son analizden bu yana veriler değişti..." | `comparison.dataChanged`, `comparison.reanalyzeSuggestion` |
| 297 | "Yeniden Analiz" | `ai.reanalyze` |
| 324 | "Analiz Geçmişi" | `comparison.analysisHistory` |
| 336-338 | "Henüz analiz geçmişi yok" | `comparison.noHistory` |
| 350-358 | "Yatırımcı analizi", "Kapsamlı analiz", "çıkarım", "öneri" | Yeni key'ler gerekli |
| 364 | "Güncel" | `comparison.current` |
| 398-400 | "Geçmiş Analiz" | `comparison.historicalAnalysis` |
| 407 | "Çıkarımlar" | `aiDetails.insights` |
| 417 | "Öneriler" | `aiDetails.recommendationsTitle` |
| 421 | "Öncelik" | Yeni: `comparison.priority` |
| 437-445 | "Sermaye Hikayesi", "Yatırımcı Getirisi", "Çıkış Senaryosu" | Yeni key'ler |
| 460 | "Bu Analizi Geri Yükle" | `comparison.restoreAnalysis` |
| 531 | "En fazla 2 proje seçebilirsiniz" | Yeni: `comparison.maxProjects` |
| 594-597 | "Toplam Gelir", "Toplam Gider", "Net Kâr", "Kâr Marjı" | `scenarioImpact.metrics.*` |
| 849 | "Yıl içinde ulaşılamadı" | Yeni: `comparison.breakEvenNotReached` |
| 964 | "Senaryo sıralaması düzeltildi" | Yeni: `comparison.orderFixed` |
| 980 | "Kullanıcı düzenlemeleri korundu..." | Yeni: `comparison.userEditsPreserved` |
| 1173 | "Çeyreklik veri eksik..." | Yeni: `comparison.quarterlyDataMissing` |
| 1267-1311 | PDF toast mesajları | `pdf.*` key'leri |
| 1330 | "yılı senaryosu oluşturuldu!" | Yeni: `comparison.scenarioCreated` |
| 1350-1351 | Chart config labels ("Kümülatif") | Yeni: `comparison.cumulative` |
| 1403-1405 | "Büyüme", "Pozitif", "Senaryo A" | `scenario.positive`, `comparison.scenarioA` |
| 1408 | "Senaryo seçin..." | Yeni: `comparison.selectScenario` |
| 1422 | "Negatif", "Pozitif" badge | `scenario.negative`, `scenario.positive` |
| 1433-1435 | "Baz", "Negatif", "Senaryo B" | Yeni: `comparison.base`, `comparison.scenarioB` |
| 1467-1471 | "Senaryo Sıralaması Hatalı", açıklama | Yeni: `comparison.wrongOrder*` |
| 1481 | "Düzelt" | Yeni: `comparison.fix` |
| 1490 | "Karşılaştırma için en az 2 kayıtlı senaryo gerekli" | `comparison.noScenarios` |
| 1498 | "Önceki analiz yükleniyor..." | Yeni: `comparison.loadingPreviousAnalysis` |
| 1590 | "Çeyreklik Net Kâr" | Yeni: `comparison.quarterlyNetProfit` |
| 1612 | "Kümülatif Nakit Akışı" | Yeni: `comparison.cumulativeCashFlow` |
| 1637 | "Profesyonel Analiz Metrikleri" | Yeni: `comparison.professionalMetrics` |
| 1647-1649 | "Senaryo Karşılaştırması", "kalem" | `comparison.title`, Yeni: `comparison.items` |
| 1688 | "Kalem Trend Analizi" | Yeni: `comparison.itemTrendAnalysis` |
| 1700 | "Finansal Oranlar" | Yeni: `comparison.financialRatios` |
| 1715 | "Duyarlılık Analizi" | Yeni: `comparison.sensitivityAnalysis` |
| 1770-1778 | "Gelir Projeksiyonu", "Gider Projeksiyonu" | Yeni: `comparison.revenueProjection`, `comparison.expenseProjection` |
| 1771 | "AI tarafından oluşturuldu - düzenleyebilirsiniz" | Yeni: `comparison.aiGeneratedEditable` |
| 1809-1812 | "Yatırımcı Pitch Deck", "AI tarafından oluşturulan 5 slaytlık..." | Yeni: `pitchDeck.*` |
| 1822 | "Görüntüleme" / "Düzenleme" | Yeni: `pitchDeck.view`, `pitchDeck.edit` |
| 1841-1842 | "Henüz pitch deck oluşturulmadı", "Önce AI analizi çalıştırın" | Yeni: `pitchDeck.noPitchDeck`, `pitchDeck.runAIFirst` |

---

### Çözüm: Faz 1 - Çeviri Dosyalarını Genişlet

**`simulation.json` - Yeni key'ler eklenecek:**

```json
{
  "comparison": {
    // Mevcut key'ler korunacak
    "loadingPreviousAnalysis": "Loading previous analysis... / Önceki analiz yükleniyor...",
    "selectScenario": "Select scenario... / Senaryo seçin...",
    "base": "Base / Baz",
    "wrongOrderTitle": "Scenario Order Incorrect / Senaryo Sıralaması Hatalı",
    "wrongOrderDescription": "Scenario A should be positive (higher profit), Scenario B should be negative (lower profit). / Senaryo A pozitif (yüksek kâr), Senaryo B negatif (düşük kâr) olmalıdır.",
    "fix": "Fix / Düzelt",
    "orderFixed": "Scenario order fixed / Senaryo sıralaması düzeltildi",
    "maxProjects": "You can select up to 2 projects / En fazla 2 proje seçebilirsiniz",
    "userEditsPreserved": "User edits preserved. Use \"Reset Edits\" to see new AI projection. / Kullanıcı düzenlemeleri korundu. Yeni AI projeksiyonunu görmek için \"Düzenlemeleri Sıfırla\" kullanın.",
    "quarterlyDataMissing": "Quarterly data missing. Please check scenarios. / Çeyreklik veri eksik. Lütfen senaryoları kontrol edin.",
    "breakEvenNotReached": "Not reached within year / Yıl içinde ulaşılamadı",
    "scenarioCreated": "{{year}} scenario created! / {{year}} yılı senaryosu oluşturuldu!",
    "cumulative": "Cumulative / Kümülatif",
    "quarterlyNetProfit": "Quarterly Net Profit / Çeyreklik Net Kâr",
    "cumulativeCashFlow": "Cumulative Cash Flow / Kümülatif Nakit Akışı",
    "professionalMetrics": "Professional Analysis Metrics / Profesyonel Analiz Metrikleri",
    "items": "items / kalem",
    "itemTrendAnalysis": "Item Trend Analysis / Kalem Trend Analizi",
    "financialRatios": "Financial Ratios / Finansal Oranlar",
    "sensitivityAnalysis": "Sensitivity Analysis / Duyarlılık Analizi",
    "revenueProjection": "Revenue Projection / Gelir Projeksiyonu",
    "expenseProjection": "Expense Projection / Gider Projeksiyonu",
    "aiGeneratedEditable": "AI generated - you can edit / AI tarafından oluşturuldu - düzenleyebilirsiniz",
    "priority": "Priority / Öncelik",
    "capitalStory": "Capital Story / Sermaye Hikayesi",
    "investorReturn": "Investor Return / Yatırımcı Getirisi",
    "exitScenario": "Exit Scenario / Çıkış Senaryosu",
    "investorAnalysis": "Investor analysis / Yatırımcı analizi",
    "comprehensiveAnalysis": "Comprehensive analysis / Kapsamlı analiz",
    "insightsCount": "{{count}} insights / {{count}} çıkarım",
    "recommendationsCount": "{{count}} recommendations / {{count}} öneri"
  },
  "pitchDeck": {
    "title": "Investor Pitch Deck / Yatırımcı Pitch Deck",
    "description": "5-slide investor presentation created by AI - you can edit / AI tarafından oluşturulan 5 slaytlık yatırımcı sunumu - düzenleyebilirsiniz",
    "view": "View / Görüntüleme",
    "edit": "Edit / Düzenleme",
    "noPitchDeck": "No pitch deck created yet. / Henüz pitch deck oluşturulmadı.",
    "runAIFirst": "Run AI analysis first. / Önce AI analizi çalıştırın."
  }
}
```

---

### Çözüm: Faz 2 - Sayfa Refaktörü

**Güncellenmesi gereken dosyalar:**

| Dosya | Değişiklik Sayısı |
|-------|------------------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | ~100 string |

**Örnek dönüşümler:**

```tsx
// ÖNCE (Satır 283-286):
<p className="text-sm font-medium text-amber-400">
  Senaryo verileri güncellendi
</p>
<p className="text-xs text-muted-foreground">
  Son analizden bu yana veriler değişti...
</p>

// SONRA:
<p className="text-sm font-medium text-amber-400">
  {t('comparison.dataChanged')}
</p>
<p className="text-xs text-muted-foreground">
  {t('comparison.reanalyzeSuggestion')}
</p>
```

```tsx
// ÖNCE (Satır 594-597):
return [
  { label: 'Toplam Gelir', scenarioA: summaryA.totalRevenue, ... },
  { label: 'Toplam Gider', scenarioA: summaryA.totalExpense, ... },
  { label: 'Net Kâr', scenarioA: summaryA.netProfit, ... },
  { label: 'Kâr Marjı', scenarioA: summaryA.profitMargin, ... },
];

// SONRA:
return [
  { label: t('scenarioImpact.metrics.totalRevenue'), scenarioA: summaryA.totalRevenue, ... },
  { label: t('scenarioImpact.metrics.netProfit'), scenarioA: summaryA.totalExpense, ... },
  { label: t('scenarioImpact.metrics.netProfit'), scenarioA: summaryA.netProfit, ... },
  { label: t('scenarioImpact.metrics.profitMargin'), scenarioA: summaryA.profitMargin, ... },
];
```

```tsx
// ÖNCE (Satır 1350-1351):
const cumulativeChartConfig: ChartConfig = {
  scenarioACumulative: { label: `${scenarioA?.name || 'A'} Kümülatif`, color: '#2563eb' },
  scenarioBCumulative: { label: `${scenarioB?.name || 'B'} Kümülatif`, color: '#16a34a' },
};

// SONRA:
const cumulativeChartConfig: ChartConfig = {
  scenarioACumulative: { label: `${scenarioA?.name || 'A'} ${t('comparison.cumulative')}`, color: '#2563eb' },
  scenarioBCumulative: { label: `${scenarioB?.name || 'B'} ${t('comparison.cumulative')}`, color: '#16a34a' },
};
```

---

### Teknik Detaylar

**1. Hook Kullanımı (mevcut, satır 469):**
```tsx
const { t, i18n } = useTranslation(['simulation', 'common']);
```

**2. Bileşen İçi Fonksiyonlara `t` Geçirme:**

`DataChangedWarning`, `AnalysisHistoryPanel`, `HistoricalAnalysisSheet` bileşenleri sayfa içinde tanımlı ve `t` fonksiyonunu prop olarak almalı veya kendi `useTranslation` hook'larını kullanmalı.

**3. metrics useMemo Refaktörü:**
`metrics` array'i `t` fonksiyonuna bağımlı olacağından, dependency array'e `t` eklenecek.

---

### Dosya Güncelleme Listesi

| Dosya | İşlem |
|-------|-------|
| `src/i18n/locales/en/simulation.json` | +30 yeni key |
| `src/i18n/locales/tr/simulation.json` | +30 yeni key |
| `src/pages/finance/ScenarioComparisonPage.tsx` | ~100 string → t() dönüşümü |

---

### Uygulama Sırası

1. Çeviri dosyalarına yeni key'ler ekle
2. `DataChangedWarning` bileşenine `t` prop'u ekle
3. `AnalysisHistoryPanel` bileşenine `t` prop'u ekle  
4. `HistoricalAnalysisSheet` bileşenine `t` prop'u ekle
5. `metrics` useMemo'yu refaktör et
6. Chart config'leri refaktör et
7. Tüm JSX içindeki hardcoded stringleri `t()` ile değiştir
8. Toast mesajlarını `t()` ile değiştir
