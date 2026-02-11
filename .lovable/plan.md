
# Radikal PDF Degisiklik: Tarayici Tabanli Print Modeli

## Mevcut Sistem (Kaldirilacak)

Suanki yaklasim:
1. 18 adet ayri `Pdf*Page.tsx` bileseni gizli bir container'da render ediliyor (`left: -9999px`)
2. `html2canvas` ile her sayfa ayri canvas'a yakalaniyor  
3. `jsPDF` ile canvas goruntuleri JPEG olarak PDF'e ekleniyor
4. Veri senkronizasyonu icin ayri useMemo hesaplamalari gerekiyor (kok neden sorunu)

**Sorunlari:** Veri tutarsizligi, i18n eksiklikleri, cift hesaplama yolu, buyuk dosya boyutu, yavas islem

## Yeni Sistem: `window.print()` Tabanli

Tarayicinin yerlesik `Ctrl+P` / `window.print()` yetenegini kullanarak:
- UI'daki **gercek DOM**'u dogrudan yakala
- Ayri PDF bilesenleri yerine, mevcut UI bilesenlerini `@media print` ile duzenle
- Veri tutarsizligi sorunu tamamen ortadan kalkar (tek kaynak)

## Uygulama Plani

### Adim 1: Print CSS Altyapisini Guncelle

**Dosya:** `src/lib/pdf/styles/print.css` ve `src/index.css`

- `@page` kuralini `landscape` olarak ayarla (yatay A4)
- Sayfa kenar bosluklarini optimize et
- Gizlenmesi gereken elementleri genislet (header, scenario selector, butonlar, sheet'ler, accordion trigger'lari)
- Tablo ve grafik bolunme kurallarini guclendir:
  - `break-inside: avoid` tum Card, Table, Chart container'larina
  - `page-break-before: always` her ana bolum oncesi
- Recharts SVG'lerinin print'te dogru boyutlanmasini sagla
- Renk koruma (`print-color-adjust: exact`) tum elementlere

### Adim 2: Print-Ready Siniflar Ekle

**Dosya:** `src/pages/finance/ScenarioComparisonPage.tsx`

Mevcut UI bolumlerine print kontrol siniflarini ekle:

| Bolum | Sinif | Davranis |
|-------|-------|----------|
| `<header>` (sticky nav) | `print-hidden` | Print'te gizle |
| Scenario selector `<Card>` | `print-hidden` | Print'te gizle |
| Order warning banner | `print-hidden` | Print'te gizle |
| AI Summary Card | `print-page-break` | Yeni sayfada basla |
| Metrics Cards Grid | `avoid-break` | Bolunmesin |
| Charts Grid | `print-page-break` + `avoid-break` | Yeni sayfada, bolunmesin |
| Financial Ratios Accordion | `print-page-break` | Accordion'u acik goster |
| InvestmentTab | `print-page-break` | Her alt bolum ayri sayfa |
| Editable Projection Tables | `print-page-break` + `avoid-break` | Yeni sayfada |
| InvestmentConfigSummary | `avoid-break` | Bolunmesin |

### Adim 3: Print-Only Kapak Sayfasi

**Yeni Dosya:** `src/components/simulation/PrintCoverPage.tsx`

Sadece print'te gorunen (`print-only` sinifi) bir kapak sayfasi bileseni:
- Senaryo isimleri ve yillari
- Olusturulma tarihi  
- Anahtar metrikler (toplam gelir, gider, net kar)
- Sirket/rapor basligi

Bu bilesen `ScenarioComparisonPage` JSX'ine eklenir ama ekranda gizlidir.

### Adim 4: Accordion/Collapsible Print Davranisi

**Dosya:** `src/index.css` (veya `print.css`)

```css
@media print {
  /* Accordion icerigini her zaman ac */
  [data-state="closed"] > [data-radix-collapsible-content],
  [data-state="closed"] > .AccordionContent {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }
  
  /* Accordion trigger okunu gizle */
  [data-radix-accordion-trigger] svg {
    display: none !important;
  }
}
```

### Adim 5: Export Butonunu Degistir

**Dosya:** `src/pages/finance/ScenarioComparisonPage.tsx`

`handleExportPresentationPdf` fonksiyonunu basitlestir:

```typescript
const handlePrint = useCallback(() => {
  // Gecici olarak body'ye landscape sinifi ekle
  document.body.classList.add('print-landscape');
  window.print();
  // Print dialog kapandiktan sonra temizle
  document.body.classList.remove('print-landscape');
}, []);
```

### Adim 6: Kaldirilacak Dosyalar ve Kodlar

**Tamamen kaldirilacak dosyalar (24 dosya):**
- `src/components/simulation/pdf/PdfCoverPage.tsx`
- `src/components/simulation/pdf/PdfMetricsPage.tsx`
- `src/components/simulation/pdf/PdfChartsPage.tsx`
- `src/components/simulation/pdf/PdfFinancialRatiosPage.tsx`
- `src/components/simulation/pdf/PdfRevenueExpensePage.tsx`
- `src/components/simulation/pdf/PdfInvestorPage.tsx`
- `src/components/simulation/pdf/PdfCapitalAnalysisPage.tsx`
- `src/components/simulation/pdf/PdfValuationPage.tsx`
- `src/components/simulation/pdf/PdfInvestmentOptionsPage.tsx`
- `src/components/simulation/pdf/PdfScenarioImpactPage.tsx`
- `src/components/simulation/pdf/PdfProjectionPage.tsx`
- `src/components/simulation/pdf/PdfFocusProjectPage.tsx`
- `src/components/simulation/pdf/PdfAIInsightsPage.tsx`
- `src/components/simulation/pdf/PdfQuarterlyCashFlowPage.tsx`
- `src/components/simulation/pdf/PdfFutureImpactPage.tsx`
- `src/components/simulation/pdf/PdfRunwayChartPage.tsx`
- `src/components/simulation/pdf/PdfGrowthModelPage.tsx`
- `src/components/simulation/pdf/PdfFiveYearProjectionPage.tsx`
- `src/components/simulation/pdf/PdfExportContainer.tsx`
- `src/components/simulation/pdf/PdfPageWrapper.tsx`
- `src/components/simulation/pdf/types.ts`
- `src/components/simulation/pdf/index.ts`
- `src/styles/pdfExport.ts` (inline stiller artik gereksiz)
- `src/constants/simulation.ts` icindeki `PDF_DIMENSIONS` (artik tarayici yonetiyor)

**Kaldirilacak kodlar:**
- `ScenarioComparisonPage.tsx` icinden: `PdfExportContainer` ve tum PDF-ozel useMemo hook'lari (`pdfExitPlan`, `pdfMultiYearCapitalPlan`, `pdfRunwayData`, `pdfGrowthConfig`, `pdfQuarterlyRevenue/Expense*`, `scenarioComparisonData`, `pdfAiProjectionForExitPlan`)
- `presentationPdfRef` ref'i
- `usePdfEngine` icindeki `generatePdfFromElement` ve `html2canvas` import'lari (bu sayfaya ozel)

**NOT:** `usePdfEngine.ts`'deki diger fonksiyonlar (BalanceSheet PDF, Income Statement PDF vb.) baska sayfalar tarafindan kullaniliyor, bu yuzden hook tamamen kaldirilmaz. Sadece ScenarioComparison'a ozel kisimlar temizlenir.

### Adim 7: InvestmentTab Icerisindeki Print Kurallari

InvestmentTab bileseni icerideki her bolumu (Capital Analysis, Valuation, Scenario Impact, Runway Chart vb.) `avoid-break` sinifi ile isaretleyerek tablo ve grafiklerin sayfa arasinda bolunmesini onle.

## Korunacak Dosyalar (Baska Sayfalarda Kullaniliyor)

| Dosya | Neden |
|-------|-------|
| `src/hooks/finance/usePdfEngine.ts` | Balance Sheet, Income Statement, Dashboard PDF'leri icin |
| `src/lib/pdf/config/pdf.ts` | Genel PDF konfigurasyonu |
| `src/lib/pdf/core/*` | Diger sayfalarin HTML-to-PDF pipeline'i |
| `src/lib/pdf/builders/*` | Data-driven PDF builder (tablolar icin) |
| `src/lib/pdf/renderers/*` | Balance Sheet / Income Statement renderer'lari |
| `PdfGrowthAnalysisPage.tsx` | GrowthComparisonPage tarafindan kullaniliyor |
| `PdfMilestoneTimelinePage.tsx` | GrowthComparisonPage tarafindan kullaniliyor |

## Beklenen Sonuclar

1. **%100 veri dogrulugu** - PDF tam olarak ekrandaki veriyi gosteriyor
2. **~20 dosya azaltma** - Kod karmasikligi buyuk olcude dusecek  
3. **i18n sorunu tamamen cozulmus** - Ayri ceviri yoluna gerek yok
4. **Anlik PDF** - html2canvas bekleme suresi ortadan kalkiyor
5. **Kullanici kontrol** - Print dialog'unda kagit boyutu, kenar boslugu, renk ayarlari yapilabilir
