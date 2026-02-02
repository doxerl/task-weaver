
## i18n Tam Entegrasyon Planı - Tüm UI Route'larını İngilizce Desteğine Bağlama

### Mevcut Durum Analizi

| Durum | Dosya Sayısı | Detay |
|-------|-------------|-------|
| ✅ i18n Entegre | 5 dosya | `Settings.tsx`, `Categories.tsx`, `CategoryForm.tsx`, `BottomTabBar.tsx`, `LanguageContext.tsx` |
| ❌ Hardcoded Türkçe | 25+ dosya | Tüm finance, simulation, today/week sayfaları |

**Çeviri Dosyaları Durumu:**
- `tr/common.json`, `en/common.json` - ✅ Ortak butonlar, etiketler, ayarlar mevcut
- `tr/finance.json`, `en/finance.json` - ✅ Dashboard, categories, transactions, receipts, cashFlow mevcut
- `tr/simulation.json`, `en/simulation.json` - ✅ Scenario, summary, capital, valuation mevcut
- ❌ **Eksik:** Reports, VatReport, BalanceSheet, Today/Week çevirileri

---

### Uygulama Planı

#### Faz 1: Eksik Çeviri Key'lerini Ekle

**1.1. `finance.json` dosyalarına yeni keyler:**
```json
{
  "reports": {
    "title": "Finansal Rapor / Financial Report",
    "netIncome": "Net Gelir / Net Income",
    "netExpense": "Net Gider / Net Expense",
    "netProfit": "Net Kâr / Net Profit",
    "profitMargin": "Kâr Marjı / Profit Margin",
    "fullReport": "Tam Rapor / Full Report",
    "simulation2026": "2026 Simülasyon / 2026 Simulation",
    "uncategorizedWarning": "Kategorisiz İşlem Var / Uncategorized Transactions",
    "uncategorizedDetail": "X adet işlem kategorilendirilememiş / X transactions not categorized"
  },
  "vat": {
    "title": "KDV Raporu / VAT Report",
    "calculatedVat": "Hesaplanan KDV / Calculated VAT",
    "deductibleVat": "İndirilecek KDV / Deductible VAT",
    "netVatDebt": "Net KDV Borcu / Net VAT Debt",
    "netVatCredit": "Net KDV Alacağı / Net VAT Credit",
    "monthlyDetail": "Aylık KDV Detayı / Monthly VAT Detail"
  },
  "balanceSheet": {
    "title": "Bilanço / Balance Sheet",
    "assets": "Varlıklar / Assets",
    "liabilities": "Borçlar / Liabilities",
    "equity": "Özkaynak / Equity"
  },
  "simulation": {
    "growthSimulation": "Büyüme Simülasyonu / Growth Simulation",
    "scenarioName": "Senaryo Adı / Scenario Name",
    "exchangeRate": "Varsayılan Kur / Assumed Exchange Rate",
    "revenueProjections": "Gelir Projeksiyonları / Revenue Projections",
    "expenseProjections": "Gider Projeksiyonları / Expense Projections"
  }
}
```

**1.2. `common.json` dosyalarına yeni keyler:**
```json
{
  "planner": {
    "hello": "Merhaba / Hello",
    "voicePlanning": "Sesli Planlama / Voice Planning",
    "plan": "Plan",
    "actual": "Gerçek / Actual",
    "compare": "Karşılaştır / Compare",
    "week": "Hafta / Week",
    "whatWillYouDo": "Ne yapacaksın? / What will you do?",
    "whatDidYouDo": "Ne yaptın? / What did you do?",
    "pastDayWarning": "X tarihi için kayıt ekliyorsunuz"
  },
  "months": {
    "jan": "Oca / Jan",
    "feb": "Şub / Feb",
    ...
  }
}
```

---

#### Faz 2: Finance Sayfalarını Refactör Et

**2.1. `FinanceDashboard.tsx`** (~50 hardcoded string)
```tsx
// ÖNCE:
<span className="text-xs font-medium text-center">Banka</span>
<span className="text-sm font-medium">Ciro Özeti</span>

// SONRA:
const { t } = useTranslation(['finance', 'common']);
<span className="text-xs font-medium text-center">{t('dashboard.tabs.bank')}</span>
<span className="text-sm font-medium">{t('dashboard.revenueSummary')}</span>
```

**2.2. `Reports.tsx`** (~80 hardcoded string)
```tsx
// ÖNCE:
<h1 className="text-xl font-bold flex-1">Finansal Rapor</h1>
<p className="text-xs text-muted-foreground">Net Gelir (KDV Hariç)</p>

// SONRA:
const { t } = useTranslation(['finance', 'common']);
<h1 className="text-xl font-bold flex-1">{t('reports.title')}</h1>
<p className="text-xs text-muted-foreground">{t('reports.netIncome')}</p>
```

**2.3. `VatReport.tsx`** (~40 hardcoded string)
```tsx
const { t } = useTranslation(['finance', 'common']);
<h1 className="text-xl font-bold">{t('vat.title')}</h1>
<span className="text-xs">{t('vat.calculatedVat')}</span>
```

**2.4. `BalanceSheet.tsx`** (~30 hardcoded string)

**2.5. `BankTransactions.tsx`** (~25 hardcoded string)

**2.6. `GrowthSimulation.tsx`** (~60 hardcoded string)

---

#### Faz 3: Planner Sayfalarını Refactör Et

**3.1. `Today.tsx`** (~20 hardcoded string)
```tsx
// ÖNCE:
<AppHeader title={profile?.first_name ? `Merhaba, ${profile.first_name}` : 'Sesli Planlama'} />
<TabsTrigger value="plan">Plan ({planItems.length})</TabsTrigger>
<TabsTrigger value="actual">Gerçek ({actualEntries.length})</TabsTrigger>

// SONRA:
const { t } = useTranslation('common');
<AppHeader title={profile?.first_name ? `${t('planner.hello')}, ${profile.first_name}` : t('planner.voicePlanning')} />
<TabsTrigger value="plan">{t('planner.plan')} ({planItems.length})</TabsTrigger>
<TabsTrigger value="actual">{t('planner.actual')} ({actualEntries.length})</TabsTrigger>
```

**3.2. `Week.tsx`** (~15 hardcoded string)

---

#### Faz 4: Simulation Component'larını Refactör Et

**4.1. `SummaryCards.tsx`**
**4.2. `ProjectionTable.tsx`**
**4.3. `ScenarioSelector.tsx`**
**4.4. `NewScenarioDialog.tsx`**

---

#### Faz 5: Tarih Formatlarını i18n'e Bağla

```tsx
// ÖNCE (sadece Türkçe):
import { tr } from 'date-fns/locale';
format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })

// SONRA (dil bağımlı):
import { useLanguage } from '@/contexts/LanguageContext';
const { dateLocale } = useLanguage();
format(selectedDate, 'd MMMM yyyy, EEEE', { locale: dateLocale })
```

---

### Dosya Güncelleme Listesi

| Dosya | Tip | Hardcoded String Sayısı |
|-------|-----|------------------------|
| `src/i18n/locales/tr/finance.json` | Çeviri Ekle | +50 key |
| `src/i18n/locales/en/finance.json` | Çeviri Ekle | +50 key |
| `src/i18n/locales/tr/common.json` | Çeviri Ekle | +30 key |
| `src/i18n/locales/en/common.json` | Çeviri Ekle | +30 key |
| `src/pages/finance/FinanceDashboard.tsx` | Refactör | ~50 string |
| `src/pages/finance/Reports.tsx` | Refactör | ~80 string |
| `src/pages/finance/VatReport.tsx` | Refactör | ~40 string |
| `src/pages/finance/BalanceSheet.tsx` | Refactör | ~30 string |
| `src/pages/finance/BankTransactions.tsx` | Refactör | ~25 string |
| `src/pages/finance/GrowthSimulation.tsx` | Refactör | ~60 string |
| `src/pages/Today.tsx` | Refactör | ~20 string |
| `src/pages/Week.tsx` | Refactör | ~15 string |
| `src/components/simulation/SummaryCards.tsx` | Refactör | ~15 string |
| `src/components/simulation/NewScenarioDialog.tsx` | Refactör | ~10 string |
| `src/components/AppHeader.tsx` | Refactör | Dinamik title desteği |

---

### Uygulama Sırası (Öneri)

1. **Çeviri Dosyalarını Genişlet** - Tüm eksik key'leri ekle
2. **FinanceDashboard.tsx** - Ana dashboard
3. **Reports.tsx** - En çok string içeren sayfa
4. **VatReport.tsx** - KDV raporu
5. **GrowthSimulation.tsx** - Simülasyon sayfası
6. **Today.tsx & Week.tsx** - Planner sayfaları
7. **Diğer finance sayfaları** - BalanceSheet, BankTransactions vb.
8. **Simulation component'ları** - SummaryCards, ProjectionTable vb.

---

### Sonuç

Bu refactör sonrasında:
- ✅ Tüm UI metinleri `t()` fonksiyonu ile çeviri sistemine bağlı olacak
- ✅ Header'daki LanguageToggle ile anında TR/EN geçişi yapılabilecek
- ✅ Tarih formatları kullanıcının dil tercihine göre değişecek
- ✅ Toast mesajları çoklu dil destekleyecek
- ✅ Gelecekte yeni dil eklemek için sadece JSON dosyası oluşturmak yeterli olacak
