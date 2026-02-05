
# Düzeltme Planı: Veri Kaynaklarının Doğru Entegrasyonu

## ✅ Tamamlanan Adımlar

### 1. ✅ Database Schema Genişletmesi
`simulation_scenarios` tablosuna yeni kolonlar eklendi:
- `cap_table_entries` (jsonb)
- `future_rounds` (jsonb)
- `working_capital_config` (jsonb)
- `sensitivity_results` (jsonb)
- `cash_flow_analysis` (jsonb)

### 2. ✅ MOIC Bölme Hatası Düzeltildi
`sensitivityEngine.ts` dosyasında `investmentAmount < 1000` kontrolü eklendi. Artık yatırım tutarı çok küçük veya sıfır olduğunda MOIC 0 döndürülüyor (880M x gibi astronomik değerler yerine).

### 3. ✅ Type Güncellemesi
`src/types/simulation.ts` dosyasına eklendi:
- `WorkingCapitalConfig` interface
- `CashFlowAnalysisResult` interface  
- `WeeklyCashForecast` interface
- `CashReconciliation` interface
- `CapTableEntry`'e 'convertible' type eklendi
- `SimulationScenario`'ya yeni alanlar eklendi

### 4. ✅ useScenarios Hook Güncellemesi
Yeni alanların kaydedilmesi ve okunması:
- `saveScenario()` - cap_table_entries, future_rounds, working_capital_config, sensitivity_results, cash_flow_analysis
- `fetchScenarios()` - bu alanları okuyup mapped objeye ekle

### 5. ✅ useBalanceSheet'e AR/AP Days Hesaplama Eklendi
Bilanço verilerinden otomatik hesaplama:
```typescript
// AR Days = (Ticari Alacaklar / Yıllık Gelir) * 365
// AP Days = (Ticari Borçlar / Yıllık COGS) * 365
// CCC = AR Days + Inventory Days - AP Days
```

## 🔜 Kalan Adımlar

### 6. GrowthSimulation.tsx Güncellemesi
Hardcoded state yerine:
- Senaryo yüklendiğinde `capTableEntries` ve `futureRounds`'u senaryodan yükle
- Kaydet butonuna basıldığında bu verileri senaryoya dahil et
- Working Capital'ı useBalanceSheet hook'undan al

### 7. AI Analizi Entegrasyonu
Compare sayfasında AI analizi çağrıldığında:
- Senaryo A ve B'nin cap table, working capital verilerini prompt'a dahil et
- AI'dan sensitivity ve cash flow analizi iste
- Sonuçları `scenario_ai_analyses` tablosuna kaydet

### 8. ScenarioComparisonPage Read-Only Görünümü
AI analizi sonuçlarını göster:
- `sensitivityResults` → SensitivityPanel'e aktar (read-only)
- `cashFlowAnalysis` → CashFlowDashboard'a aktar (read-only)
- `capTableEntries` → Karşılaştırmalı Cap Table göster

## Veri Akışı (Düzeltilmiş)

```text
/finance/simulation (GrowthSimulation.tsx)
├── Kullanıcı Cap Table girer → capTableEntries state
├── Working Capital → useBalanceSheet().workingCapitalDays'den otomatik yükle
├── [Kaydet] → simulation_scenarios tablosuna tüm veriler
└── [Risk Analizi] → /finance/simulation/compare'e yönlendir

/finance/simulation/compare (ScenarioComparisonPage.tsx)
├── Senaryo A seç → cap_table_entries, working_capital_config yükle
├── Senaryo B seç → cap_table_entries, working_capital_config yükle
├── [AI Analizi] → Edge Function çağır
│   ├── Input: revenues, expenses, cap_table, working_capital
│   └── Output: sensitivity_results, cash_flow_analysis
├── Sonuçları scenario_ai_analyses'e kaydet
└── Read-only göster: Sensitivity, Cash Flow, Cap Table karşılaştırması
```

## Öncelik Sırası
1. ✅ **P1 (Kritik)**: MOIC bölme hatası düzelt (investmentAmount = 0 kontrolü)
2. ✅ **P1 (Kritik)**: Cap Table verilerini DB'ye kaydetme altyapısı hazır
3. ✅ **P2 (Önemli)**: Working Capital'ı Balance Sheet'ten hesapla
4. 🔜 **P3 (İyileştirme)**: GrowthSimulation sayfasında senaryodan veri yükle
5. 🔜 **P4 (İyileştirme)**: AI analizine entegre et
