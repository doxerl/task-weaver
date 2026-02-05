
# Düzeltme Planı: Veri Kaynaklarının Doğru Entegrasyonu

## Sorunun Özeti
Cap Table, Working Capital, Sensitivity ve Cash Flow verileri yanlış entegre edilmiş:
- **Hardcoded değerler** kullanılıyor (veritabanı yerine)
- **AI analizi sonucu** olarak hesaplanmıyor
- Compare sayfasında **senaryo karşılaştırması** yapılmıyor

## Düzeltme Adımları

### 1. Database Schema Genişletmesi
`simulation_scenarios` tablosuna eksik kolonlar eklenecek:

```sql
ALTER TABLE simulation_scenarios
ADD COLUMN cap_table_entries jsonb DEFAULT '[]',
ADD COLUMN future_rounds jsonb DEFAULT '[]',
ADD COLUMN working_capital_config jsonb DEFAULT NULL,
ADD COLUMN sensitivity_results jsonb DEFAULT NULL,
ADD COLUMN cash_flow_analysis jsonb DEFAULT NULL;
```

### 2. Type Güncellemesi
`src/types/simulation.ts` dosyasına eklenecek:

```typescript
interface SimulationScenario {
  // ... mevcut alanlar
  capTableEntries?: CapTableEntry[];
  futureRounds?: FutureRoundAssumption[];
  workingCapitalConfig?: WorkingCapitalConfigV2;
  sensitivityResults?: TornadoResult[];
  cashFlowAnalysis?: CashFlowAnalysisResult;
}
```

### 3. useScenarios Hook Güncellemesi
Yeni alanların kaydedilmesi ve okunması:
- `saveScenario()` - cap_table_entries, future_rounds, working_capital_config dahil
- `fetchScenarios()` - bu alanları okuyup mapped objeye ekle

### 4. GrowthSimulation.tsx Güncellemesi
Hardcoded state yerine:
- Senaryo yüklendiğinde `capTableEntries` ve `futureRounds`'u senaryodan yükle
- Kaydet butonuna basıldığında bu verileri senaryoya dahil et

### 5. Working Capital'ın Balance Sheet'ten Hesaplanması
`useBalanceSheet` hook'undan alacak/borç bakiyelerini okuyup gün hesaplaması:

```typescript
// AR Days = (Ticari Alacaklar / Yıllık Gelir) * 365
// AP Days = (Ticari Borçlar / Yıllık COGS) * 365
const arDays = (tradeReceivables / annualRevenue) * 365;
const apDays = (tradePayables / annualCOGS) * 365;
```

### 6. AI Analizi Entegrasyonu
Compare sayfasında AI analizi çağrıldığında:
- Senaryo A ve B'nin cap table, working capital verilerini prompt'a dahil et
- AI'dan sensitivity ve cash flow analizi iste
- Sonuçları `scenario_ai_analyses` tablosuna kaydet

### 7. ScenarioComparisonPage Read-Only Görünümü
AI analizi sonuçlarını göster:
- `sensitivityResults` → SensitivityPanel'e aktar (read-only)
- `cashFlowAnalysis` → CashFlowDashboard'a aktar (read-only)
- `capTableEntries` → Karşılaştırmalı Cap Table göster

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `supabase/migrations/` | Yeni kolonlar ekle |
| `src/types/simulation.ts` | CapTable, WorkingCapital, Sensitivity result tipleri |
| `src/hooks/finance/useScenarios.ts` | Yeni alanları kaydet/yükle |
| `src/pages/finance/GrowthSimulation.tsx` | State yerine senaryodan veri yükle |
| `src/hooks/finance/useBalanceSheet.ts` | AR/AP Days hesaplama fonksiyonu ekle |
| `supabase/functions/unified-scenario-analysis/` | Cap Table, Working Capital prompt'a dahil et |
| `src/pages/finance/ScenarioComparisonPage.tsx` | AI sonuçlarını read-only göster |

## Veri Akışı (Düzeltilmiş)

```text
/finance/simulation (GrowthSimulation.tsx)
├── Kullanıcı Cap Table girer → capTableEntries state
├── Kullanıcı Working Capital ayarlar → workingCapitalConfig state  
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
1. **P1 (Kritik)**: MOIC bölme hatası düzelt (investmentAmount = 0 kontrolü)
2. **P1 (Kritik)**: Cap Table verilerini DB'ye kaydet
3. **P2 (Önemli)**: Working Capital'ı Balance Sheet'ten hesapla
4. **P3 (İyileştirme)**: AI analizine entegre et
