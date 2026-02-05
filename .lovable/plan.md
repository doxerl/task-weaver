
# Investor-Grade Simülasyon Motoru Yükseltme Planı

## Vizyon

**Hedef:** Kârı değil nakdi yöneten, terms/dilution'ı simüle eden, belirsizliği (sensitivity/MC) sayısallaştıran, kanıt + hesap izi veren bir yatırım simülasyon motoru.

**Temel Prensip:** Deterministik motor (tablolar, cap table, waterfall, IRR/MOIC, cash conversion, runway) kodla hesaplanır; LLM sadece yorum, risk dili, öneri planı, pitch deck narrative ve memo yazımı için kullanılır.

---

## Faz 1: P1 - Yatırımcı Güveni için Şart (4-6 hafta)

### 1.1 Cap Table + Terms + Dilution + Exit Waterfall

**Yeni Tipler (`src/types/simulation.ts`):**
```typescript
interface CapTableEntry {
  holder: string;
  shares: number;
  percentage: number;
  type: 'common' | 'preferred' | 'options' | 'safe';
}

interface DealTerms {
  instrument: 'Equity' | 'SAFE' | 'Convertible';
  pre_money?: number;
  post_money?: number;
  option_pool_existing: number;
  option_pool_new: number;
  liq_pref: '1x_non_participating' | '1x_participating' | '2x_non_participating';
  pro_rata: boolean;
  founder_vesting: { years: number; cliff_years: number };
  anti_dilution: 'none' | 'weighted_avg' | 'full_ratchet';
}

interface CapTableConfig {
  current: CapTableEntry[];
  future_rounds_assumptions: FutureRoundAssumption[];
}

interface ExitWaterfall {
  exit_value: number;
  liquidation_preference_payout: number;
  remaining_for_common: number;
  proceeds_by_holder: { holder: string; proceeds: number; moic: number }[];
}
```

**Yeni Dosya:** `src/lib/capTableCalculator.ts`
- `calculatePostMoneyCapTable()` - Yatırım sonrası pay tablosu
- `calculateDilutionPath()` - Seed → A → B → Exit dilution simülasyonu
- `calculateExitWaterfall()` - Çıkış dağılımı (liq pref, participating, pro-rata)
- `calculateOwnershipAtExit()` - Mevcut fonksiyon genişletilecek

**UI Bileşeni:** `src/components/simulation/CapTableEditor.tsx`
- Mevcut pay dağılımı girişi
- Gelecek tur varsayımları
- Deal terms konfigürasyonu
- Görsel dilution path grafiği

---

### 1.2 Working Capital + Cash Conversion Cycle + 13-Week Cash

**Yeni Tipler (`src/types/simulation.ts`):**
```typescript
interface WorkingCapitalConfig {
  ar_days: number;           // Alacak tahsil günü
  ap_days: number;           // Borç ödeme günü
  inventory_days?: number;   // Stok günü (opsiyonel)
  deferred_revenue_days?: number;
}

interface TaxFinancingConfig {
  corporate_tax_rate: number;
  tax_payment_lag_days: number;
  vat_withholding_mode?: 'monthly' | 'quarterly';
  debt_schedule?: DebtItem[];
}

interface CapexDepreciationConfig {
  capex_by_category: Record<string, number>;
  depreciation_years: number;
  method: 'straight_line' | 'declining_balance';
}

interface ThirteenWeekCashForecast {
  week: number;
  opening_balance: number;
  ar_collections: number;
  ap_payments: number;
  payroll: number;
  other_operating: number;
  debt_service: number;
  net_cash_flow: number;
  closing_balance: number;
}
```

**Yeni Dosya:** `src/lib/cashFlowEngine.ts`
- `calculateCashConversionCycle()` - CCC = AR Days + Inventory Days - AP Days
- `generate13WeekCashForecast()` - Haftalık nakit projeksiyonu
- `generateMonthlyCashForecast()` - Aylık nakit projeksiyonu
- `calculateNetWorkingCapitalChange()` - ΔNWC hesabı
- `reconcilePnLToCash()` - Net Income → EBITDA → OCF → Ending Cash köprüsü

**UI Bileşeni:** `src/components/simulation/CashFlowDashboard.tsx`
- 13-haftalık nakit tablosu
- Cash conversion cycle göstergesi
- Reconciliation köprü diyagramı

---

### 1.3 Unit Economics / Driver Layer

**Yeni Tipler (`src/types/simulation.ts`):**
```typescript
type BusinessModelType = 'B2B_SaaS' | 'B2C_SaaS' | 'ECOM' | 'CONSULTING' | 'MARKETPLACE' | 'OTHER';

interface UnitEconomicsInput {
  // SaaS
  mrr?: number;
  arr?: number;
  arpa?: number;
  gross_margin?: number;
  logo_churn?: number;
  nrr?: number;
  cac?: number;
  ltv?: number;
  payback_months?: number;
  
  // E-commerce
  traffic?: number;
  conversion?: number;
  aov?: number;
  repeat_rate?: number;
  return_rate?: number;
  fulfillment_cost?: number;
  
  // Consulting
  billable_hc?: number;
  utilization?: number;
  blended_rate?: number;
  project_margin?: number;
}
```

**Yeni Dosya:** `src/lib/unitEconomicsEngine.ts`
- `calculateLTV()` - LTV = ARPA × Gross Margin / Churn
- `calculateCAC()` - CAC payback hesabı
- `calculateNRR()` - Net Revenue Retention
- `projectRevenueFromDrivers()` - Driver'lardan gelir projeksiyonu
- `distributeToLineItems()` - Driver toplamlarını mevcut kalem yapısına dağıt

**UI Bileşeni:** `src/components/simulation/UnitEconomicsPanel.tsx`
- İş modeli seçici
- Driver girişleri (model tipine göre dinamik)
- LTV/CAC göstergeleri
- Cohort analizi (opsiyonel)

---

### 1.4 Sensitivity (Tornado) + 3'lü Outcome

**Yeni Tipler (`src/types/simulation.ts`):**
```typescript
interface SensitivityConfig {
  mode: 'tornado' | 'scenario_matrix' | 'monte_carlo';
  shock_range: number; // ±%
  drivers: string[];   // ['growth_rate', 'gross_margin', 'churn', 'cac']
}

interface TornadoResult {
  driver: string;
  base_value: number;
  low_value: number;
  high_value: number;
  valuation_at_low: number;
  valuation_at_high: number;
  valuation_swing: number;  // high - low
  runway_at_low: number;
  runway_at_high: number;
}

interface ScenarioMatrix {
  base: ScenarioOutcome;
  bull: ScenarioOutcome;
  bear: ScenarioOutcome;
}

interface ScenarioOutcome {
  name: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  valuation: number;
  runway_months: number;
  moic: number;
  probability?: number;
}
```

**Yeni Dosya:** `src/lib/sensitivityEngine.ts`
- `generateTornadoAnalysis()` - Her driver için ±shock etkisi
- `generateScenarioMatrix()` - Base/Bull/Bear senaryoları
- `calculateExpectedValue()` - Probability-weighted ortalama
- `runMonteCarloSimulation()` - (P3 için opsiyonel) N simülasyon

**UI Bileşeni:** `src/components/simulation/SensitivityPanel.tsx`
- Tornado chart (horizontal bar)
- Scenario comparison cards
- Runway sensitivity heatmap

---

### 1.5 Evidence Paths + Calc Trace + Data Needed

**Yeni Tipler (`src/types/simulation.ts`):**
```typescript
interface EvidenceTrace {
  evidence_paths: string[];    // JSON paths: ["dealConfig.investmentAmount", "summaryA.totalRevenue"]
  calc_trace: string;          // "MOIC = $3.2M × 8% / $250K = 1.02x"
  data_needed?: string[];      // ["customer_count", "churn_rate"] - eksik veriler
  confidence_score: number;    // 0-100
  assumptions?: string[];      // Yapılan varsayımlar
}

// Her insight ve recommendation için zorunlu
interface AIScenarioInsightV2 extends AIScenarioInsight {
  evidence: EvidenceTrace;
}

interface AIRecommendationV2 extends AIRecommendation {
  evidence: EvidenceTrace;
}
```

**Edge Function Güncellemesi:** `supabase/functions/unified-scenario-analysis/index.ts`
- Tool schema'ya `evidence_paths`, `calc_trace`, `data_needed` alanları ekle
- Prompt kurallarına:
  - "Sayı varsa → evidence_paths + calc_trace ZORUNLU"
  - "Sayı yoksa → data_needed ZORUNLU (uydurma yasak)"
  - "Benchmark yalnızca benchmarksConfig.records içinden"

---

## Faz 2: P2 - Karar Kalitesini Büyütür (3-4 hafta)

### 2.1 IRR + Exit Timeline Sensitivity

- IRR hesabı için `src/lib/irrCalculator.ts`
- 3/5/7 yıllık exit timeline karşılaştırması
- Dilution etkisiyle adjusted MOIC

### 2.2 Multi-dim Risk Scoring (Radar)

```typescript
interface DealScoreBreakdown {
  traction: { score: number; weight: number; evidence: string };
  unit_economics: { score: number; weight: number; evidence: string };
  cash_risk: { score: number; weight: number; evidence: string };
  terms: { score: number; weight: number; evidence: string };
  exit_clarity: { score: number; weight: number; evidence: string };
  data_quality: { score: number; weight: number; evidence: string };
  total: number;
  formula: string;
}
```

- Radar chart UI bileşeni
- Ağırlık düzenleme arayüzü

### 2.3 Benchmarks/Comparables

```typescript
interface BenchmarksConfig {
  dataset_id: string;
  last_updated: string;
  sources_provenance: string[];
  records: ComparableRecord[];
}

interface ComparableRecord {
  company_name: string;
  sector: string;
  stage: string;
  revenue_multiple: number;
  ebitda_multiple: number;
  source: string;
}
```

- Küratörlü veri seti (JSON dosyası)
- AI promptta yalnızca bu verilere referans izni

### 2.4 Pitch Deck Narrative Revamp

- Why Now slide ekleme
- GTM (Go-To-Market) slide ekleme
- Team slide detaylandırma
- Her slide için evidence_paths zorunluluğu

---

## Faz 3: P3 - Ürünü Vazgeçilmez Yapar (2-3 hafta)

### 3.1 Investment Memo PDF (2 sayfa)

- `src/lib/pdf/renderers/InvestmentMemoRenderer.ts`
- Executive Summary + Key Metrics + Risks + Recommendation
- Cap table + Exit waterfall görselleştirme

### 3.2 Forecast vs Actual + Proaktif Uyarılar

- Gerçek veri ile projeksiyon karşılaştırması
- Sapma eşiklerinde otomatik uyarı
- Dashboard widget

### 3.3 Macro Stress Layer (Opsiyonel)

- Kur senaryoları (TL/USD ±20%)
- Enflasyon etkisi
- Faiz oranı değişimi

---

## Output Şeması Güncellemesi

```typescript
interface EnhancedAnalysisOutput {
  // Mevcut alanlar korunur
  insights: AIScenarioInsightV2[];
  recommendations: AIRecommendationV2[];
  quarterly_analysis: QuarterlyAIAnalysis;
  
  // Finans tabloları (YENİ)
  statements: {
    pnl: PnLStatement;
    cash_flow: CashFlowStatement;  // Operating/Investing/Financing
    balance_sheet: BalanceSheet;
    reconciliation_bridge: ReconciliationBridge;
  };
  
  // Deal analizi (GENİŞLETİLMİŞ)
  deal_analysis: {
    deal_score: number;
    deal_score_breakdown: DealScoreBreakdown;
    valuation_verdict: 'premium' | 'fair' | 'cheap';
    cap_table_current: CapTableEntry[];
    cap_table_post_money: CapTableEntry[];
    dilution_path: DilutionPathEntry[];
    exit_waterfall: ExitWaterfall;
    irr: number;
    moic: number;
    payback_year: number;
  };
  
  // Sensitivity (YENİ)
  sensitivity_results: {
    tornado: TornadoResult[];
    scenario_matrix: ScenarioMatrix;
    survival_probability?: number;
  };
  
  // Mevcut alanlar
  pitch_deck: PitchDeck;
  next_year_projection: NextYearProjection;
}
```

---

## Teknik Uygulama Planı

| Öncelik | Bileşen | Dosya(lar) | Tahmini Süre |
|---------|---------|------------|--------------|
| P1.1 | Cap Table Engine | `src/lib/capTableCalculator.ts`, `types/simulation.ts` | 1 hafta |
| P1.1 | Cap Table UI | `src/components/simulation/CapTableEditor.tsx` | 3 gün |
| P1.2 | Cash Flow Engine | `src/lib/cashFlowEngine.ts` | 1 hafta |
| P1.2 | 13-Week Forecast UI | `src/components/simulation/CashFlowDashboard.tsx` | 3 gün |
| P1.3 | Unit Economics Engine | `src/lib/unitEconomicsEngine.ts` | 4 gün |
| P1.3 | Driver Panel UI | `src/components/simulation/UnitEconomicsPanel.tsx` | 2 gün |
| P1.4 | Sensitivity Engine | `src/lib/sensitivityEngine.ts` | 4 gün |
| P1.4 | Tornado/Scenario UI | `src/components/simulation/SensitivityPanel.tsx` | 3 gün |
| P1.5 | Evidence Trace | Edge function + Types güncellemesi | 3 gün |
| P2.1 | IRR Calculator | `src/lib/irrCalculator.ts` | 2 gün |
| P2.2 | Risk Radar | Component + scoring logic | 3 gün |
| P2.3 | Benchmarks | JSON dataset + prompt rules | 2 gün |
| P2.4 | Pitch Deck Revamp | Edge function prompt update | 2 gün |
| P3.1 | Investment Memo PDF | PDF renderer | 3 gün |
| P3.2 | Forecast vs Actual | Hook + UI | 3 gün |
| P3.3 | Macro Stress | Sensitivity extension | 2 gün |

---

## Prompt Harmonizasyonu Kuralları

```text
1. Anti-Hallucination Genişletme:
   - Sayı ($/%) → evidence_paths + calc_trace ZORUNLU
   - Sayı yok → data_needed ZORUNLU
   - Benchmark → YALNIZCA benchmarksConfig.records içinden

2. Confidence Score + Ek:
   - confidence < 70 → alternatif senaryo VEYA "insufficient data" etiketi

3. Finans Mantığı Guardrail:
   - Negatif EBITDA → EBITDA multiple KULLANMA, revenue multiple + uyarı
   - YoY growth > 100% → AGGRESSIVE etiketi + driver açıklaması

4. Hesaplama Izi Zorunluluğu:
   - Her MOIC/IRR → "MOIC = Exit × Equity% / Investment = $X × Y% / $Z = W.Wx"
   - Her değerleme → "Valuation = Revenue × Multiple = $X × Yx = $Z"
```

---

## Beklenen Sonuçlar

| Metrik | Mevcut | Hedef |
|--------|--------|-------|
| Yatırımcı güven skoru | ~60% | 90%+ |
| Veri şeffaflığı | Düşük (sayı var, kaynak yok) | Yüksek (her sayıda calc_trace) |
| Dilution modelleme | Basit (%40 sabit) | Dinamik (tur bazlı, ESOP, liq pref) |
| Cash visibility | Çeyreklik | 13-haftalık granüler |
| Sensitivity | ±20% tek değişken | Tornado + 3 senaryo + Monte Carlo (opsiyonel) |
| Benchmark kullanımı | Hallucination riski | Küratörlü dataset, provenance ile |

---

## Uygulama Sırası Önerisi

1. **Hafta 1-2:** Cap Table Engine + Types + Evidence Trace yapısı
2. **Hafta 3-4:** Cash Flow Engine + 13-Week + Reconciliation Bridge
3. **Hafta 5:** Unit Economics Engine + Driver Panel
4. **Hafta 6:** Sensitivity Engine + Tornado UI + Scenario Matrix
5. **Hafta 7-8:** Edge function güncellemesi + Prompt harmonizasyonu
6. **Hafta 9-10:** P2 öğeleri (IRR, Radar, Benchmarks, Pitch revamp)
7. **Hafta 11-12:** P3 öğeleri (Memo PDF, Forecast vs Actual, Macro stress)

