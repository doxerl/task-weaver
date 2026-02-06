

# PDF Export vs UI Kapsamlı Karşılaştırma Analizi

## Tespit Edilen Tutarsızlıklar

### 1. PdfInvestorPage - Tekrarlanan 5-Yıllık Tablo ❌
**Problem:** `PdfInvestorPage.tsx` (satır 248-317) içinde basit bir 5-yıllık projeksiyon tablosu var, ancak bu tablo:
- Sadece 6 sütun gösteriyor (Yıl, Gelir, Gider, Net Kâr, Şirket Değeri, MOIC)
- UI'daki detaylı tablo 10 sütun gösteriyor (Opening Cash, Revenue, Expense, Net Profit, Death Valley, Capital Need, Year End, Valuation, MOIC)
- `PdfFiveYearProjectionPage.tsx` (Sayfa 18) zaten aynı veriyi daha detaylı gösteriyor

**Kaynak Farkı:**
- PDF mini tablo: `pdfExitPlan.allYears` kullanıyor
- UI detaylı tablo: `multiYearCapitalPlan.years` + `exitPlan.allYears` birlikte kullanıyor

**Çözüm:** `PdfInvestorPage`'deki mini tabloyu kaldır (çünkü Sayfa 18'de detaylı versiyon zaten var)

---

### 2. PdfCapitalAnalysisPage - Eksik dealConfig Prop ❌
**Problem:** `PdfCapitalAnalysisPage.tsx` props'unda `dealConfig` tanımlı değil (types.ts satır 161-166), ancak `PdfCapitalAnalysisPageProps` tipinde `dealConfig: DealConfig` var fakat component içinde kullanılmıyor.

**Kaynak:**
```typescript
// types.ts satır 161-166
export interface PdfCapitalAnalysisPageProps {
  capitalNeedA: CapitalRequirement;
  capitalNeedB: CapitalRequirement;
  dealConfig: DealConfig; // ← Tanımlı ama kullanılmıyor!
  scenarioAName: string;
  scenarioBName: string;
}

// PdfCapitalAnalysisPage.tsx satır 17-22
export function PdfCapitalAnalysisPage({
  capitalNeedA,
  capitalNeedB,
  scenarioAName,
  scenarioBName,
}: PdfCapitalAnalysisPageProps) // ← dealConfig burada destructure edilmiyor!
```

**Çözüm:** `dealConfig`'i ya component içinde kullan ya da props'tan kaldır

---

### 3. PdfQuarterlyCashFlowPage vs QuarterlyCashFlowTable - Sütun Farkı ⚠️
**Problem:** UI tablosu 6 sütun gösteriyor (Quarter, Revenue, Expense, Net Flow, Cumulative, Need), PDF tablosu 5 sütun gösteriyor (Revenue, Expense, Net, Cumulative - Need sütunu yok invested senaryoda)

**Kaynak Tutarsızlığı:**
- UI: `QuarterlyCashFlowTable.tsx` "Need" sütununu her iki senaryo için gösteriyor
- PDF: `PdfQuarterlyCashFlowPage.tsx` "Need" sütununu hiç göstermiyor

**Çözüm:** PDF'e Capital Need sütunu ekle

---

### 4. PdfMetricsPage - Senaryo İsimleri Eksik ⚠️
**Problem:** `PdfMetricsPage.tsx` (satır 70, 90) senaryo isimlerini gösterirken sadece `scenarioA?.name` kullanıyor, yıl bilgisi yok.

**Kaynak:**
- UI: `{scenarioA?.targetYear} {scenarioA?.name}` formatında
- PDF: Sadece `{scenarioA?.name}`

**Çözüm:** PDF'e yıl bilgisini ekle

---

### 5. PdfRevenueExpensePage - Senaryo Yılları Eksik ⚠️
**Problem:** Gelir/Gider karşılaştırma tablosunda (satır 77, 86, 177, 186) senaryo isimleri gösteriliyor ama yıl bilgisi yok.

**Çözüm:** Başlıklara yıl ekle: `{scenarioA?.targetYear} {scenarioA?.name}`

---

### 6. PdfValuationPage - allYears[4] Doğrulama Eksik ⚠️
**Problem:** Refaktör sonrası `PdfValuationPage` artık `pdfExitPlan?.allYears?.[4]` kullanıyor, ancak `allYears` boş veya 5'ten az eleman içeriyorsa hata oluşabilir.

**Mevcut Kod:**
```typescript
const year5 = pdfExitPlan?.allYears?.[4]; // Index 4 = 5. yıl
const valuations = year5?.valuations;
```

**Çözüm:** Guard clause ekle: `if (!year5 || !valuations) return null;`

---

### 7. PdfAIInsightsPage - profitMargin Hesaplama Hatası ⚠️
**Problem:** `PdfAIInsightsPage.tsx` satır 90-91'de:
```typescript
const marginA = summaryA.profitMargin * 100; // ← profitMargin zaten yüzde olarak geliyor!
const marginB = summaryB.profitMargin * 100;
```

**Kaynak:**
- `ScenarioComparisonPage` satır 222: `profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0`
- `profitMargin` **zaten yüzde olarak hesaplanmış** (0-100 aralığında)

**Sonuç:** PDF'de marjlar 100x fazla gösteriliyor (örn: %25 yerine %2500)

**Çözüm:** `* 100` çarpımını kaldır

---

### 8. PdfExportContainer - Eksik Props Kontrolü ⚠️
**Problem:** Bazı opsiyonel props için null check'ler var ama bazıları için yok:

| Prop | Null Check | Durumu |
|------|-----------|--------|
| `capitalNeedA`, `capitalNeedB` | ✅ | Satır 163 |
| `pdfExitPlan` | ✅ | Satır 171 |
| `investmentTiers` | ✅ | Satır 178 |
| `scenarioComparison` | ✅ | Satır 185 |
| `quarterlyRevenueA` vb. | ✅ | Satır 196 |
| `runwayData` | ✅ | Satır 205 |
| `growthConfig` | ✅ | Satır 211 |
| `multiYearCapitalPlan` | ✅ | Satır 217 |

Tüm kontroller mevcut - Bu madde OK ✅

---

## Özet: Düzeltilmesi Gereken Sorunlar

| # | Dosya | Sorun | Öncelik |
|---|-------|-------|---------|
| 1 | `PdfInvestorPage.tsx` | Tekrarlanan mini 5-yıl tablosu | Yüksek |
| 2 | `PdfCapitalAnalysisPage.tsx` | Kullanılmayan dealConfig prop | Düşük |
| 3 | `PdfQuarterlyCashFlowPage.tsx` | Eksik "Need" sütunu | Orta |
| 4 | `PdfMetricsPage.tsx` | Eksik yıl bilgisi | Düşük |
| 5 | `PdfRevenueExpensePage.tsx` | Eksik yıl bilgisi | Düşük |
| 6 | `PdfValuationPage.tsx` | Eksik guard clause | Orta |
| 7 | `PdfAIInsightsPage.tsx` | profitMargin 100x hatası | **Kritik** |

## Önerilen Aksiyon Planı

### Faz 1: Kritik Hata Düzeltmeleri
1. `PdfAIInsightsPage.tsx` - profitMargin çarpım hatasını düzelt
2. `PdfValuationPage.tsx` - year5 guard clause ekle

### Faz 2: Yapısal İyileştirmeler  
3. `PdfInvestorPage.tsx` - Mini 5-yıl tablosunu kaldır (Sayfa 18'de zaten var)
4. `PdfQuarterlyCashFlowPage.tsx` - Capital Need sütunu ekle

### Faz 3: Kozmetik İyileştirmeler
5. `PdfMetricsPage.tsx` - Yıl bilgisi ekle
6. `PdfRevenueExpensePage.tsx` - Yıl bilgisi ekle  
7. `PdfCapitalAnalysisPage.tsx` - Kullanılmayan prop'u kaldır

