
## i18n Tam Entegrasyon Planı - Reports, Simulation ve AI Çıktıları

### Sorun Analizi

| Sayfa/Bileşen | Durum | Hardcoded String |
|---------------|-------|------------------|
| `/finance/reports` (Reports.tsx) | ❌ Türkçe | ~150+ string |
| `/finance/simulation` (GrowthSimulation.tsx) | ❌ Türkçe | ~60+ string |
| `/finance/simulation/compare` (ScenarioComparisonPage.tsx) | ❌ Türkçe | ~200+ string |
| `AIAnalysisSummaryCard.tsx` | ❌ Türkçe | ~40 string |
| `AIAnalysisDetails.tsx` | ❌ Türkçe | ~30+ string |
| Edge Function (unified-scenario-analysis) | ❌ Türkçe prompt | AI yanıtları Türkçe |

### Merkezi Çözüm Yaklaşımı

**Prensip:** Bir defa değiştir → tüm sayfalar etkilensin

1. **Çeviri dosyalarına yeni key'ler ekle** (`simulation.json`, `finance.json`)
2. **Sayfalara `useTranslation` hook entegrasyonu**
3. **AI Edge Function'a dil parametresi** - Kullanıcı dilini backend'e gönder

---

### Faz 1: Çeviri Dosyalarını Genişlet

**`simulation.json` - Yeni key'ler:**
```json
{
  "comparison": {
    "title": "Senaryo Karşılaştırması / Scenario Comparison",
    "selectScenarios": "Karşılaştırılacak senaryoları seçin / Select scenarios to compare",
    "scenarioA": "Senaryo A / Scenario A",
    "scenarioB": "Senaryo B / Scenario B",
    "noScenarios": "Karşılaştırma için en az 2 senaryo gerekli / Need at least 2 scenarios"
  },
  "ai": {
    "title": "Kapsamlı AI Analizi (Gemini Pro 3) / Comprehensive AI Analysis",
    "analyzing": "Analiz Ediliyor... / Analyzing...",
    "reanalyze": "Yeniden Analiz / Reanalyze",
    "createPresentation": "Yatırımcı Sunumu Oluştur / Create Investor Presentation",
    "dealScore": "Deal Skoru / Deal Score",
    "pitchDeck": "Pitch Deck",
    "nextYear": "Sonraki Yıla Geç / Go to Next Year",
    "incompleteData": "Eksik Analiz Verileri / Incomplete Analysis Data",
    "cachedAt": "Son analiz / Last analysis",
    "dataChanged": "Senaryo verileri güncellendi / Scenario data updated"
  },
  "growthSimulation": {
    "title": "Büyüme Simülasyonu / Growth Simulation",
    "basedOn": "USD verileri baz alınarak / Based on USD data",
    "scenarioName": "Senaryo Adı / Scenario Name",
    "assumedRate": "Varsayılan Kur / Assumed Exchange Rate",
    "notes": "Notlar / Notes",
    "revenueProjections": "Gelir Projeksiyonları / Revenue Projections",
    "expenseProjections": "Gider Projeksiyonları / Expense Projections",
    "new": "Yeni / New",
    "save": "Kaydet / Save",
    "reset": "Sıfırla / Reset",
    "riskAnalysis": "Risk Analizi / Risk Analysis",
    "growth": "Büyüme / Growth",
    "pdfCreating": "PDF Oluşturuluyor / Creating PDF",
    "scenarioSaved": "Senaryo Kaydedildi / Scenario Saved",
    "createNextYear": "Sonraki Yıl Simülasyonu Oluştur / Create Next Year Simulation"
  }
}
```

**`finance.json` - Reports için yeni key'ler:**
```json
{
  "reports": {
    "title": "Finansal Rapor / Financial Report",
    "officialData": "Resmi Veri / Official Data",
    "simulation2026": "2026 Simülasyon / 2026 Simulation",
    "fullReport": "Tam Rapor / Full Report",
    "netIncome": "Net Gelir (KDV Hariç) / Net Income (excl. VAT)",
    "netExpense": "Net Gider (KDV Hariç) / Net Expense (excl. VAT)",
    "netProfit": "Net Kâr / Net Profit",
    "profitMargin": "Kâr Marjı / Profit Margin",
    "calculatedVat": "Hesaplanan KDV / Calculated VAT",
    "deductibleVat": "İndirilecek KDV / Deductible VAT",
    "netVat": "Net KDV / Net VAT",
    "payable": "Ödenecek / Payable",
    "deferred": "Devreden / Deferred",
    "tabs": {
      "summary": "Özet / Summary",
      "official": "Resmi / Official",
      "financing": "Finans / Financing",
      "cashflow": "Nakit / Cash Flow"
    },
    "charts": {
      "monthlyTrend": "Aylık Gelir vs Gider / Monthly Income vs Expense",
      "serviceRevenue": "Hizmet Bazlı Gelir / Service-Based Revenue",
      "expenseCategories": "Gider Kategorileri / Expense Categories",
      "chartPdf": "Grafik PDF / Chart PDF"
    },
    "financing": {
      "partnerAccount": "Ortak Cari Hesabı / Partner Account",
      "partnerDeposit": "Ortaktan Tahsilat / Partner Deposit",
      "partnerWithdrawal": "Ortağa Ödeme / Partner Payment",
      "netBalance": "Net Bakiye / Net Balance",
      "creditTracking": "Kredi Takibi / Credit Tracking",
      "totalCredit": "Toplam Kredi / Total Credit",
      "paidInstallments": "Ödenen Taksit / Paid Installments",
      "leasingPayment": "Leasing Ödemesi / Leasing Payment",
      "remainingDebt": "Kalan Borç / Remaining Debt",
      "paymentProgress": "Ödeme İlerlemesi / Payment Progress",
      "monthlyInstallment": "Aylık Taksit / Monthly Installment",
      "investments": "Yatırımlar / Investments",
      "vehicles": "Araçlar / Vehicles",
      "equipment": "Ekipman / Equipment",
      "other": "Diğer / Other",
      "totalInvestment": "Toplam Yatırım / Total Investment",
      "fixedExpenseTracking": "Sabit Gider Takibi / Fixed Expense Tracking",
      "monthlyFixed": "Aylık Sabit Gider / Monthly Fixed Expense",
      "monthlyInstallments": "Aylık Taksitler / Monthly Installments",
      "totalMonthly": "Toplam Aylık / Total Monthly",
      "yearlyProjection": "Yıllık Projeksiyon / Yearly Projection",
      "activeInstallments": "Aktif Taksitler / Active Installments",
      "remaining": "Kalan / Remaining"
    },
    "warnings": {
      "missingExchangeRate": "{{count}} ay için kur verisi bulunmuyor / Missing exchange rate for {{count}} months",
      "uncategorized": "Kategorisiz İşlem Var / Uncategorized Transactions",
      "uncategorizedDetail": "{{count}} adet işlem kategorilendirilememiş / {{count}} transactions not categorized",
      "goToCategories": "Kategorilendirmeye Git / Go to Categorization"
    }
  }
}
```

---

### Faz 2: Sayfa Refactörleri

**2.1. Reports.tsx (~150 string)**
```tsx
// ÖNCE:
<h1 className="text-xl font-bold flex-1">Finansal Rapor</h1>
<TabsTrigger value="dashboard">Özet</TabsTrigger>
<p className="text-xs text-muted-foreground">Net Gelir (KDV Hariç)</p>

// SONRA:
import { useTranslation } from 'react-i18next';
const { t } = useTranslation(['finance', 'common']);

<h1 className="text-xl font-bold flex-1">{t('reports.title')}</h1>
<TabsTrigger value="dashboard">{t('reports.tabs.summary')}</TabsTrigger>
<p className="text-xs text-muted-foreground">{t('reports.netIncome')}</p>
```

**2.2. GrowthSimulation.tsx (~60 string)**
```tsx
// ÖNCE:
<AppHeader title={`${targetYear} Büyüme Simülasyonu`} subtitle={`${baseYear} USD verileri baz alınarak`} />
<Button><Plus /> Yeni</Button>
<Button><Save /> Kaydet</Button>

// SONRA:
import { useTranslation } from 'react-i18next';
const { t } = useTranslation(['simulation', 'common']);

<AppHeader 
  title={t('growthSimulation.title', { year: targetYear })}
  subtitle={t('growthSimulation.basedOn', { year: baseYear })}
/>
<Button><Plus /> {t('growthSimulation.new')}</Button>
<Button><Save /> {t('growthSimulation.save')}</Button>
```

**2.3. ScenarioComparisonPage.tsx (~200 string)**
```tsx
// ÖNCE:
<CardTitle>🧠 Kapsamlı AI Analizi (Gemini Pro 3)</CardTitle>
<p>Senaryo verileri güncellendi</p>
<Button>Yeniden Analiz</Button>

// SONRA:
import { useTranslation } from 'react-i18next';
const { t } = useTranslation(['simulation', 'common']);

<CardTitle>{t('ai.title')}</CardTitle>
<p>{t('ai.dataChanged')}</p>
<Button>{t('ai.reanalyze')}</Button>
```

**2.4. AIAnalysisSummaryCard.tsx (~40 string)**
```tsx
// ÖNCE:
<CardTitle>🧠 Kapsamlı AI Analizi (Gemini Pro 3)</CardTitle>
<Button>Yatırımcı Sunumu Oluştur</Button>
<Badge>💎 Ucuz</Badge>

// SONRA:
const { t } = useTranslation(['simulation', 'common']);

<CardTitle>{t('ai.title')}</CardTitle>
<Button>{t('ai.createPresentation')}</Button>
```

---

### Faz 3: AI Edge Function - Dil Desteği

**Problem:** `unified-scenario-analysis` edge function Türkçe prompt kullanıyor, AI yanıtları hep Türkçe.

**Çözüm:** Frontend'den dil parametresi gönder, prompt'u dinamik yap.

**3.1. Hook Güncelleme (useUnifiedAnalysis.ts):**
```tsx
import { useLanguage } from '@/contexts/LanguageContext';

const { language } = useLanguage();

const runUnifiedAnalysis = async (params) => {
  const response = await supabase.functions.invoke('unified-scenario-analysis', {
    body: { 
      ...params, 
      language: language // 'en' veya 'tr'
    }
  });
};
```

**3.2. Edge Function Güncelleme:**
```typescript
// unified-scenario-analysis/index.ts
const { language = 'tr' } = await req.json();

const systemPrompt = language === 'en' 
  ? `You are a financial analyst. Respond in ENGLISH...`
  : `Sen bir finansal analistsin. TÜRKÇE yanıt ver...`;

// Slide titles, insights, recommendations hepsi seçilen dilde üretilecek
```

---

### Dosya Güncelleme Listesi

| Dosya | İşlem | Satır Değişikliği |
|-------|-------|-------------------|
| `src/i18n/locales/tr/simulation.json` | Genişlet | +100 key |
| `src/i18n/locales/en/simulation.json` | Genişlet | +100 key |
| `src/i18n/locales/tr/finance.json` | Genişlet | +80 key |
| `src/i18n/locales/en/finance.json` | Genişlet | +80 key |
| `src/pages/finance/Reports.tsx` | Refactör | ~150 string |
| `src/pages/finance/GrowthSimulation.tsx` | Refactör | ~60 string |
| `src/pages/finance/ScenarioComparisonPage.tsx` | Refactör | ~200 string |
| `src/components/simulation/AIAnalysisSummaryCard.tsx` | Refactör | ~40 string |
| `src/components/simulation/AIAnalysisDetails.tsx` | Refactör | ~30 string |
| `src/hooks/finance/useUnifiedAnalysis.ts` | Dil parametresi ekle | ~5 satır |
| `supabase/functions/unified-scenario-analysis/index.ts` | Çift dilli prompt | ~50 satır |

---

### Uygulama Sırası

1. **Çeviri dosyalarını genişlet** - simulation.json ve finance.json
2. **Reports.tsx** - En büyük etki
3. **GrowthSimulation.tsx** - Simülasyon sayfası
4. **ScenarioComparisonPage.tsx** - Karşılaştırma sayfası
5. **AI bileşenleri** - AIAnalysisSummaryCard, AIAnalysisDetails
6. **Edge function** - AI yanıtları için dil desteği

---

### Sonuç

Bu refactör sonrasında:
- ✅ Header'daki dil toggle'ı ile Reports, Simulation, Compare sayfaları anında TR/EN geçiş yapacak
- ✅ AI analiz çıktıları (insights, recommendations, pitch deck) seçilen dilde üretilecek
- ✅ Merkezi çeviri - tek dosyada değişiklik tüm sayfaları etkiliyor
- ✅ Toast mesajları, validasyon hataları, tüm UI elementleri çoklu dil destekleyecek
