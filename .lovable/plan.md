
# Eksik i18n Çevirilerinin Eklenmesi

## Sorun
Ekran görüntüsünde görüldüğü gibi, sekme başlıkları ve içeriklerdeki çeviri anahtarları ham key olarak görünüyor:
- `capTable.title` 
- `Sensitivity Analysis` (kısmen var)
- `cashFlow.title`
- `cashFlow.currentCash`, `cashFlow.runway`, `cashFlow.deathValley`, `CCC`, `cashFlow.days`
- `cashFlow.forecast13Week`, `cashFlow.workingCapital`, `cashFlow.reconciliation`

Bu anahtarlar `simulation.json` dosyalarında tanımlı olmadığı için çeviri yapılmıyor.

## Çözüm
Her iki dil dosyasına (`tr/simulation.json` ve `en/simulation.json`) eksik çeviri bloklarını ekleyeceğiz.

## Eklenecek Çeviriler

### Türkçe (tr/simulation.json)
```json
{
  "capTable": {
    "title": "Pay Tablosu",
    "description": "Ortaklık yapısı ve sermaye dağılımı",
    "holder": "Ortak",
    "shares": "Pay Sayısı",
    "percentage": "Oran",
    "type": "Tür",
    "typeOptions": {
      "common": "Adi Pay",
      "preferred": "İmtiyazlı",
      "options": "Opsiyon",
      "safe": "SAFE",
      "convertible": "Convertible"
    },
    "addHolder": "Ortak Ekle",
    "futureRounds": "Gelecek Turlar",
    "addRound": "Tur Ekle",
    "roundName": "Tur Adı",
    "preMoneyValuation": "Pre-money Değerleme",
    "postMoneyValuation": "Post-money Değerleme",
    "dilution": "Sulanma"
  },
  "sensitivity": {
    "title": "Duyarlılık Analizi",
    "tornado": "Tornado",
    "scenarios": "Senaryolar",
    "tornadoTitle": "Tornado Analizi",
    "tornadoDesc": "Her değişkenin ±%10 değişiminin değerlemeye etkisi",
    "topDrivers": "En Etkili Değişkenler",
    "downside": "Düşüş",
    "upside": "Yükseliş",
    "bearCase": "Kötümser Senaryo",
    "baseCase": "Baz Senaryo",
    "bullCase": "İyimser Senaryo",
    "probability": "Olasılık",
    "revenue": "Gelir",
    "valuation": "Değerleme",
    "runway": "Runway",
    "months": "ay",
    "expectedValue": "Beklenen Değer"
  },
  "cashFlow": {
    "title": "Nakit Akışı",
    "currentCash": "Mevcut Nakit",
    "runway": "Runway",
    "deathValley": "Death Valley",
    "days": "gün",
    "forecast13Week": "13 Haftalık Tahmin",
    "workingCapital": "İşletme Sermayesi",
    "reconciliation": "Uzlaştırma",
    "cashPosition": "Nakit Pozisyonu",
    "forecastDesc": "Haftalık nakit giriş ve çıkışları",
    "week": "Hafta",
    "openingBalance": "Açılış Bakiyesi",
    "arCollections": "Alacak Tahsilatı",
    "apPayments": "Borç Ödemeleri",
    "payroll": "Maaşlar",
    "operatingCash": "Operasyonel Nakit",
    "debtService": "Borç Servisi",
    "closingBalance": "Kapanış Bakiyesi",
    "ccc": "Nakit Dönüşüm Döngüsü",
    "cccDesc": "AR Günleri + Stok Günleri - AP Günleri",
    "arDays": "Alacak Günleri",
    "apDays": "Borç Günleri",
    "inventoryDays": "Stok Günleri",
    "nwc": "Net İşletme Sermayesi",
    "nwcDesc": "Dönen Varlıklar - Kısa Vadeli Borçlar",
    "currentAssets": "Dönen Varlıklar",
    "currentLiabilities": "Kısa Vadeli Borçlar",
    "reconciliationTitle": "P&L → Nakit Uzlaştırması",
    "reconciliationDesc": "Net Kâr'dan Nakit Akışına geçiş",
    "netIncome": "Net Kâr",
    "addDepreciation": "+ Amortisman",
    "ebitda": "EBITDA",
    "wcChanges": "İşletme Sermayesi Değişimleri",
    "operatingCashFlow": "Operasyonel Nakit Akışı",
    "capex": "Yatırım Harcamaları",
    "freeCashFlow": "Serbest Nakit Akışı",
    "debtChanges": "Borç Değişimleri",
    "endingCash": "Dönem Sonu Nakit",
    "noData": "Veri bulunamadı",
    "cashPositive": "Nakit Pozitif",
    "monthsRunway": "{{count}} ay runway"
  }
}
```

### İngilizce (en/simulation.json)
```json
{
  "capTable": {
    "title": "Cap Table",
    "description": "Ownership structure and equity distribution",
    "holder": "Holder",
    "shares": "Shares",
    "percentage": "Percentage",
    "type": "Type",
    "typeOptions": {
      "common": "Common",
      "preferred": "Preferred",
      "options": "Options",
      "safe": "SAFE",
      "convertible": "Convertible"
    },
    "addHolder": "Add Holder",
    "futureRounds": "Future Rounds",
    "addRound": "Add Round",
    "roundName": "Round Name",
    "preMoneyValuation": "Pre-money Valuation",
    "postMoneyValuation": "Post-money Valuation",
    "dilution": "Dilution"
  },
  "sensitivity": {
    "title": "Sensitivity Analysis",
    "tornado": "Tornado",
    "scenarios": "Scenarios",
    "tornadoTitle": "Tornado Analysis",
    "tornadoDesc": "Impact of ±10% change in each variable on valuation",
    "topDrivers": "Top Drivers",
    "downside": "Downside",
    "upside": "Upside",
    "bearCase": "Bear Case",
    "baseCase": "Base Case",
    "bullCase": "Bull Case",
    "probability": "Probability",
    "revenue": "Revenue",
    "valuation": "Valuation",
    "runway": "Runway",
    "months": "months",
    "expectedValue": "Expected Value"
  },
  "cashFlow": {
    "title": "Cash Flow",
    "currentCash": "Current Cash",
    "runway": "Runway",
    "deathValley": "Death Valley",
    "days": "days",
    "forecast13Week": "13-Week Forecast",
    "workingCapital": "Working Capital",
    "reconciliation": "Reconciliation",
    "cashPosition": "Cash Position",
    "forecastDesc": "Weekly cash inflows and outflows",
    "week": "Week",
    "openingBalance": "Opening Balance",
    "arCollections": "AR Collections",
    "apPayments": "AP Payments",
    "payroll": "Payroll",
    "operatingCash": "Operating Cash",
    "debtService": "Debt Service",
    "closingBalance": "Closing Balance",
    "ccc": "Cash Conversion Cycle",
    "cccDesc": "AR Days + Inventory Days - AP Days",
    "arDays": "AR Days",
    "apDays": "AP Days",
    "inventoryDays": "Inventory Days",
    "nwc": "Net Working Capital",
    "nwcDesc": "Current Assets - Current Liabilities",
    "currentAssets": "Current Assets",
    "currentLiabilities": "Current Liabilities",
    "reconciliationTitle": "P&L → Cash Reconciliation",
    "reconciliationDesc": "Bridge from Net Income to Cash Flow",
    "netIncome": "Net Income",
    "addDepreciation": "+ Depreciation",
    "ebitda": "EBITDA",
    "wcChanges": "Working Capital Changes",
    "operatingCashFlow": "Operating Cash Flow",
    "capex": "Capital Expenditures",
    "freeCashFlow": "Free Cash Flow",
    "debtChanges": "Debt Changes",
    "endingCash": "Ending Cash",
    "noData": "No data available",
    "cashPositive": "Cash Positive",
    "monthsRunway": "{{count}} months runway"
  }
}
```

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `src/i18n/locales/tr/simulation.json` | `capTable`, `sensitivity`, `cashFlow` bloklarını ekle |
| `src/i18n/locales/en/simulation.json` | `capTable`, `sensitivity`, `cashFlow` bloklarını ekle |

## Uygulama Adımları
1. Her iki JSON dosyasının en üst seviyesine yeni blokları ekle
2. Bileşenlerde kullanılan tüm anahtarların karşılıklarını doğrula
3. Uygulamayı test et

## Teknik Notlar
- Yeni bloklar mevcut JSON yapısını bozmadan root seviyesine eklenecek
- Bileşenlerdeki `t('simulation:cashFlow.xxx')` çağrıları otomatik olarak çalışmaya başlayacak
- Eksik anahtarlar varsa fallback olarak İngilizce gösterilecek
