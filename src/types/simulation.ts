// Quarterly breakdown
export interface QuarterlyAmounts {
  q1: number;  // Jan-Mar
  q2: number;  // Apr-Jun
  q3: number;  // Jul-Sep
  q4: number;  // Oct-Dec
}

export interface ProjectionItem {
  id: string;
  category: string;
  baseAmount: number;      // 2025 actual (USD)
  projectedAmount: number; // 2026 target (USD)
  baseQuarterly?: QuarterlyAmounts;      // Quarterly base values
  projectedQuarterly?: QuarterlyAmounts; // Quarterly projected values
  description: string;
  isNew: boolean;
  startMonth?: number;     // 1-12 for new items
}

// Quarterly cash flow projection
export interface QuarterlyProjection {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  months: string[];
  revenue: number;
  expense: number;
  investment: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  cumulativeBurn: number;
}

// Burn rate analysis
export interface BurnRateAnalysis {
  monthlyBurnRate: number;          // Average monthly cash burn
  grossBurnRate: number;            // Total monthly expense
  netBurnRate: number;              // Expense - Revenue (negative = cash generation)
  quarterlyBurn: QuarterlyAmounts;
  runwayMonths: number;             // How many months can survive with current cash
  runwayEndDate: string;            // Estimated cash depletion date
  cashDeficitWithoutInvestment: number; // Total deficit if no investment
  cashSurplusWithoutInvestment: number; // Total surplus if no investment (positive scenario)
  criticalQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
  quarterlyProjectionsWithInvestment: QuarterlyProjection[];
  quarterlyProjectionsWithoutInvestment: QuarterlyProjection[];
}

export interface InvestmentItem {
  id: string;
  name: string;
  amount: number;          // USD
  description: string;
  month: number;           // 1-12 (legacy, kept for backward compatibility)
  quarterly?: QuarterlyAmounts; // Quarterly distribution of investment
}

export interface SimulationScenario {
  id: string;
  name: string;
  baseYear: number;             // e.g., 2025 (last completed year)
  targetYear: number;           // e.g., 2026 (scenario year)
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  assumedExchangeRate: number;  // TL/USD for display
  notes: string;
  scenarioType?: 'positive' | 'negative';  // Scenario role: positive = investment, negative = risk
  version?: number;             // Version number for tracking updates
  createdAt?: string;
  updatedAt?: string;
}

export interface SimulationSummary {
  base: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: number;
  };
  projected: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: number;
  };
  growth: {
    revenueGrowth: number;
    expenseGrowth: number;
    profitGrowth: number;
  };
  capitalNeeds: {
    totalInvestment: number;
    projectedProfit: number;
    netCapitalNeed: number;
  };
}
// Note: 2025 base data is now dynamically loaded from the database
// via useFinancialDataHub in useGrowthSimulation hook.
// The following constants are kept as fallbacks only.

export const FALLBACK_REVENUES_2025: Omit<ProjectionItem, 'id' | 'projectedAmount' | 'description' | 'isNew'>[] = [
  { category: 'SBT Tracker', baseAmount: 70290 },
  { category: 'Leadership Denetim', baseAmount: 55454 },
  { category: 'Danışmanlık', baseAmount: 17819 },
  { category: 'ZDHC InCheck', baseAmount: 3219 },
];

export const FALLBACK_EXPENSES_2025: Omit<ProjectionItem, 'id' | 'projectedAmount' | 'description' | 'isNew'>[] = [
  { category: 'Personel (Brüt+SGK)', baseAmount: 48272 },
  { category: 'Yazılım/Abonelik', baseAmount: 16291 },
  { category: 'Kira', baseAmount: 9165 },
  { category: 'Seyahat', baseAmount: 3535 },
  { category: 'Pazarlama/Fuar', baseAmount: 1967 },
  { category: 'Telekomünikasyon', baseAmount: 2529 },
  { category: 'Muhasebe', baseAmount: 2291 },
  { category: 'Danışmanlık Gideri', baseAmount: 4350 },
  { category: 'Diğer', baseAmount: 10185 },
];

// =====================================================
// ADVANCED CAPITAL & ROI ANALYSIS TYPES
// =====================================================

/** Monthly cash flow projection for 12-month forecasting */
export interface CashFlowProjection {
  month: number;
  monthName: string;
  openingBalance: number;
  revenue: number;
  expense: number;
  investment: number;
  netCashFlow: number;
  closingBalance: number;
  cumulativeBalance: number;
}

/** Current cash position from balance sheet */
export interface CurrentCashPosition {
  bankBalance: number;
  cashOnHand: number;
  totalLiquidity: number;
}

/** Working capital needs calculation */
export interface WorkingCapitalNeeds {
  receivables: number;
  payables: number;
  inventoryNeeds: number;
  netWorkingCapital: number;
  monthlyOperatingCash: number;
  safetyBuffer: number;
  safetyMonths: number;
}

/** Break-even analysis results */
export interface BreakEvenAnalysis {
  monthlyFixedCosts: number;
  variableExpenseRatio: number;
  contributionMargin: number;
  breakEvenRevenue: number;
  breakEvenMonth: number | null;
  monthsToBreakEven: number;
  currentVsRequired: number;
}

/** Enhanced capital needs calculation */
export interface EnhancedCapitalNeeds {
  totalInvestment: number;
  workingCapitalNeed: number;
  safetyBuffer: number;
  totalCapitalRequired: number;
  availableCash: number;
  estimatedProfit: number;
  netCapitalGap: number;
  peakCashDeficit: number;
  deficitMonth: number | null;
  isSufficient: boolean;
}

/** Complete advanced capital analysis */
export interface AdvancedCapitalAnalysis {
  currentCash: CurrentCashPosition;
  workingCapital: WorkingCapitalNeeds;
  monthlyProjections: CashFlowProjection[];
  breakEven: BreakEvenAnalysis;
  capitalNeeds: EnhancedCapitalNeeds;
  burnRateAnalysis?: BurnRateAnalysis;
}

/** Payback period calculation */
export interface PaybackPeriod {
  months: number;
  isWithinYear: boolean;
  exactMonths: number;
}

/** NPV and IRR calculations */
export interface NPVAnalysis {
  npv: number;
  discountRate: number;
  irr: number;
  isPositiveNPV: boolean;
}

/** Sensitivity scenario results */
export interface SensitivityScenario {
  name: string;
  revenueChange: number;
  revenue: number;
  expense: number;
  profit: number;
  margin: number;
  roi: number;
}

/** Sensitivity analysis with 3 scenarios */
export interface SensitivityAnalysis {
  pessimistic: SensitivityScenario;
  baseline: SensitivityScenario;
  optimistic: SensitivityScenario;
}

/** Complete ROI analysis */
export interface ROIAnalysis {
  simpleROI: number;
  paybackPeriod: PaybackPeriod;
  breakEven: {
    revenue: number;
    margin: number;
    currentVsRequired: number;
  };
  npvAnalysis: NPVAnalysis;
  sensitivity: SensitivityAnalysis;
}

// =====================================================
// AI SCENARIO ANALYSIS TYPES
// =====================================================

/** AI-generated scenario insight */
export interface AIScenarioInsight {
  category: 'revenue' | 'profit' | 'cash_flow' | 'risk' | 'efficiency' | 'opportunity';
  severity: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  impact_analysis: string;
  data_points?: string[];
}

/** AI-generated strategic recommendation */
export interface AIRecommendation {
  priority: 1 | 2 | 3;
  title: string;
  description: string;
  action_plan: string[];
  expected_outcome: string;
  risk_mitigation?: string;
  timeframe?: string;
}

/** AI-generated quarterly analysis */
export interface QuarterlyAIAnalysis {
  overview: string;
  critical_periods: { 
    quarter: string; 
    reason: string; 
    risk_level?: 'high' | 'medium' | 'low';
  }[];
  seasonal_trends: string[];
  cash_burn_warning?: string;
  growth_trajectory: string;
  winner_by_quarter?: { 
    q1: string; 
    q2: string; 
    q3: string; 
    q4: string; 
  };
}

/** Complete AI analysis result */
export interface AIAnalysisResult {
  insights: AIScenarioInsight[];
  recommendations: AIRecommendation[];
  quarterly_analysis: QuarterlyAIAnalysis;
}

// =====================================================
// INVESTOR PITCH DECK TYPES
// =====================================================

/** Deal Configuration for Investor Pitch */
export interface DealConfiguration {
  investmentAmount: number;      // Talep edilen yatırım
  equityPercentage: number;      // Teklif edilen hisse %
  sectorMultiple: number;        // Çıkış çarpanı (SaaS: 8x, E-ticaret: 2x)
  safetyMargin: number;          // Güvenlik tamponu % (varsayılan: 20)
}

/** Capital Requirement Calculation (Death Valley Analysis) */
export interface CapitalRequirement {
  // Temel alanlar
  minCumulativeCash: number;     // En derin nakit açığı (Ölüm Vadisi)
  criticalQuarter: string;       // Nakit açığının en derin olduğu çeyrek
  requiredInvestment: number;    // Gereken yatırım (açık + güvenlik marjı)
  burnRateMonthly: number;       // Aylık nakit yakma hızı
  runwayMonths: number;          // Mevcut nakitle kaç ay gidilebilir
  selfSustaining: boolean;       // Kendi kendini finanse edebiliyor mu?
  
  // Faz 1: Yıl sonu ve break-even
  yearEndBalance: number;          // Yıl sonu nakit bakiyesi
  yearEndDeficit: boolean;         // Yıl sonu açık mı?
  breakEvenQuarter: string | null; // Break-even noktası (hangi çeyrekte kâra geçiyor)
  calculationBasis: 'death_valley' | 'year_end' | 'none'; // Hangi değer baz alındı
  
  // Faz 2: Çoklu yıl ve seçenekler
  extendedRunway: ExtendedRunwayInfo;
  investmentTiers: InvestmentTier[];
}

/** Extended Runway Information - 2 Yıllık Projeksiyon */
export interface ExtendedRunwayInfo {
  year1DeathValley: number;         // 1. yıl death valley
  year2DeathValley: number;         // 2. yıl death valley
  combinedDeathValley: number;      // 2 yıl kombine death valley
  combinedCriticalPeriod: string;   // Kritik dönem (Y1-Q2, Y2-Q3 vs)
  month18Runway: boolean;           // 18 aylık runway yeterli mi
  month24Runway: boolean;           // 24 aylık runway yeterli mi
}

/** Investment Tier - Yatırım Seçenekleri */
export interface InvestmentTier {
  tier: 'minimum' | 'recommended' | 'aggressive';
  label: string;
  amount: number;
  runwayMonths: number;
  description: string;
  safetyMargin: number;
}

/** Growth Configuration for Two-Stage Model */
export interface GrowthConfiguration {
  aggressiveGrowthRate: number;   // Year 1-2: Kullanıcı hedefi (max %100)
  normalizedGrowthRate: number;   // Year 3-5: Sektör ortalaması
  transitionYear: number;         // Geçiş yılı (default: 2)
  rawUserGrowthRate: number;      // Orijinal kullanıcı hedefi (cap öncesi)
}

// =====================================================
// INVESTMENT SCENARIO COMPARISON TYPES (Yatırım Al vs Alama)
// =====================================================

/** Investment scenario comparison result - Yatırım alırsak vs alamazsak */
export interface InvestmentScenarioComparison {
  /** Pozitif senaryo (yatırım alırsak) - Senaryo A */
  withInvestment: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    exitValuation: number;
    moic5Year: number;
    growthRate: number;
  };
  
  /** Negatif senaryo (yatırım alamazsak) - Senaryo B */
  withoutInvestment: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    organicGrowthRate: number;
  };
  
  /** Fırsat maliyeti / zarar - Yatırım alamazsak kayıplar */
  opportunityCost: {
    revenueLoss: number;           // Gelir kaybı
    profitLoss: number;            // Kâr kaybı
    valuationLoss: number;         // Değerleme kaybı (5Y)
    growthRateDiff: number;        // Büyüme oranı farkı
    percentageLoss: number;        // Yüzdesel kayıp
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  
  /** Gelecek yıllar etkisi - 5 yıllık projeksiyon farkı */
  futureImpact: {
    year1WithInvestment: number;
    year1WithoutInvestment: number;
    year3WithInvestment: number;
    year3WithoutInvestment: number;
    year5WithInvestment: number;
    year5WithoutInvestment: number;
    cumulativeDifference: number;  // Toplam değerleme farkı
    yearlyProjections: Array<{
      year: number;
      yearLabel: string;
      withInvestment: number;
      withoutInvestment: number;
      difference: number;
    }>;
  };
}

/** Sector-based normalized growth rates */
export const SECTOR_NORMALIZED_GROWTH: Record<string, number> = {
  'saas': 0.30,      // %30
  'fintech': 0.35,   // %35
  'ecommerce': 0.25, // %25
  'marketplace': 0.28, // %28
  'default': 0.25    // %25
};

// =====================================================
// VALUATION ENGINE TYPES
// =====================================================

/** Valuation breakdown from multiple methods */
export interface ValuationBreakdown {
  revenueMultiple: number;    // Revenue x Sector Multiple
  ebitdaMultiple: number;     // EBITDA x EBITDA Multiple
  dcf: number;                // Discounted Cash Flow valuation
  vcMethod: number;           // VC Method (Exit / ROI)
  weighted: number;           // Weighted average of all methods
}

/** Weights for valuation methods */
export interface ValuationWeights {
  revenueMultiple: number;    // Default: 0.30
  ebitdaMultiple: number;     // Default: 0.25
  dcf: number;                // Default: 0.30
  vcMethod: number;           // Default: 0.15
}

/** Configuration for valuation calculations */
export interface ValuationConfiguration {
  discountRate: number;        // DCF discount rate (e.g., 0.30 for 30%)
  terminalGrowthRate: number;  // Terminal growth rate (e.g., 0.03 for 3%)
  expectedROI: number;         // VC expected ROI (e.g., 10 for 10x)
  capexRatio: number;          // CapEx as ratio of revenue (e.g., 0.10)
  taxRate: number;             // Corporate tax rate (e.g., 0.22)
  weights: ValuationWeights;   // Weights for each valuation method
}

/** Multi-Year Financial Projection - Enhanced with EBITDA and Valuations */
export interface MultiYearProjection {
  year: number;                  // Relative year (1, 2, 3, 4, 5)
  actualYear: number;            // Actual calendar year (2027, 2028, 2029, 2030, 2031)
  revenue: number;
  expenses: number;
  netProfit: number;
  cumulativeProfit: number;
  companyValuation: number;      // Now uses weighted valuation
  appliedGrowthRate?: number;    // Applied growth rate for transparency
  growthStage?: 'aggressive' | 'normalized'; // Growth phase
  // NEW: EBITDA and advanced valuations
  ebitda?: number;               // EBITDA value
  ebitdaMargin?: number;         // EBITDA margin (%)
  freeCashFlow?: number;         // Free Cash Flow
  valuations?: ValuationBreakdown; // All valuation methods
}

/** Exit Plan for Investors */
export interface ExitPlan {
  postMoneyValuation: number;    // Yatırım / Hisse %
  year3Projection: MultiYearProjection;
  year5Projection: MultiYearProjection;
  investorShare3Year: number;    // 3. yıl yatırımcı payı değeri
  investorShare5Year: number;    // 5. yıl yatırımcı payı değeri
  moic3Year: number;             // 3 yıllık MOIC (Multiple on Invested Capital)
  moic5Year: number;             // 5 yıllık MOIC
  breakEvenYear: number | null;  // Başa baş yılı
  potentialAcquirers: string[];  // Potansiyel alıcılar (AI tarafından)
  exitStrategy: 'series_b' | 'strategic_sale' | 'ipo' | 'hold' | 'unknown';
  yearLabels?: {                 // Actual year references for display
    scenarioYear: number;        // 2026
    moic3Year: number;           // 2029
    moic5Year: number;           // 2031
  };
  growthConfig?: GrowthConfiguration; // İki aşamalı büyüme konfigürasyonu
  allYears?: MultiYearProjection[];   // 5 yıllık detaylı projeksiyon
}

/** AI Investor Analysis Result */
export interface AIInvestorAnalysis {
  capitalStory: string;          // Sermaye hikayesi özeti
  opportunityCost: string;       // Yatırımsızlık maliyeti
  investorROI: string;           // Yatırımcı getiri analizi
  exitNarrative: string;         // Çıkış senaryosu anlatısı
  potentialAcquirers: string[];  // Potansiyel alıcılar
  riskFactors: string[];         // Risk faktörleri
  keyMetrics: {
    capitalEfficiency: number;   // Her 1$ yatırımın getirdiği ciro
    paybackMonths: number;       // Geri ödeme süresi
    burnMultiple: number;        // Burn / Net ARR
  };
  recommendedExit: 'series_b' | 'strategic_sale' | 'ipo' | 'hold';
}

// =====================================================
// UNIFIED ANALYSIS TYPES
// =====================================================

/** Pitch Deck Slide */
export interface PitchSlide {
  slide_number: number;
  title: string;
  key_message: string;
  content_bullets: string[];
  speaker_notes: string;
}

/** Next Year Quarterly Projection */
export interface NextYearQuarterlyData {
  revenue: number;
  expenses: number;
  cash_flow: number;
  key_event: string;
}

/** Virtual Opening Balance for Next Year */
export interface VirtualOpeningBalance {
  opening_cash: number;
  war_chest_status: 'Hazır' | 'Yakın' | 'Uzak';
  intangible_growth: string;
}

/** Investor Hook Data */
export interface InvestorHook {
  revenue_growth_yoy: string;
  margin_improvement: string;
  valuation_multiple_target: string;
  competitive_moat: string;
}

/** Next Year Projection from AI - ENHANCED with Globalization Vision */
export interface NextYearProjection {
  strategy_note: string;
  virtual_opening_balance?: VirtualOpeningBalance;
  quarterly: {
    q1: NextYearQuarterlyData;
    q2: NextYearQuarterlyData;
    q3: NextYearQuarterlyData;
    q4: NextYearQuarterlyData;
  };
  summary: {
    total_revenue: number;
    total_expenses: number;
    net_profit: number;
    ending_cash: number;
  };
  investor_hook?: InvestorHook;
  projection_year?: number;  // AI'dan gelen hedef yıl: max(A.targetYear, B.targetYear) + 1
}

/** Enhanced Executive Summary (structured) */
export interface EnhancedExecutiveSummary {
  short_pitch: string;
  revenue_items: string;
  scenario_comparison: string;
  investment_impact: string;
}

/** Deal Analysis from AI */
export interface DealAnalysis {
  deal_score: number;
  valuation_verdict: 'premium' | 'fair' | 'cheap';
  investor_attractiveness: string;
  risk_factors: string[];
}

/** Pitch Deck from AI */
export interface PitchDeck {
  slides: PitchSlide[];
  executive_summary: string | EnhancedExecutiveSummary;
}

/** Helper function to get executive summary as string */
export const getExecutiveSummaryText = (summary: string | EnhancedExecutiveSummary | undefined): string => {
  if (!summary) return '';
  if (typeof summary === 'string') return summary;
  return summary.short_pitch || '';
};

/** Complete Unified Analysis Result */
export interface UnifiedAnalysisResult {
  // Senaryo Analizi
  insights: AIScenarioInsight[];
  recommendations: AIRecommendation[];
  quarterly_analysis: QuarterlyAIAnalysis;
  
  // Deal Değerlendirmesi
  deal_analysis: DealAnalysis;
  
  // Pitch Deck
  pitch_deck: PitchDeck;
  
  // Gelecek Yıl Projeksiyonu
  next_year_projection: NextYearProjection;
}

// =====================================================
// ANALYSIS HISTORY TYPES
// =====================================================

/** Analysis history item for tracking past analyses */
export interface AnalysisHistoryItem {
  id: string;
  createdAt: Date;
  analysisType: 'scenario_comparison' | 'investor_pitch' | 'unified';
  insights?: AIScenarioInsight[];
  recommendations?: AIRecommendation[];
  quarterlyAnalysis?: QuarterlyAIAnalysis;
  investorAnalysis?: AIInvestorAnalysis;
  dealConfig?: DealConfiguration;
  dealAnalysis?: DealAnalysis;
  pitchDeck?: PitchDeck;
  nextYearProjection?: NextYearProjection;
  scenarioADataHash?: string;
  scenarioBDataHash?: string;
}

// =====================================================
// YEARLY BALANCE SHEET TYPE (for historical data)
// =====================================================

/** Historical balance sheet from yearly_balance_sheets table */
export interface YearlyBalanceSheet {
  id: string;
  user_id: string;
  year: number;
  cash_on_hand: number | null;
  bank_balance: number | null;
  trade_receivables: number | null;
  trade_payables: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  current_profit: number | null;
  retained_earnings: number | null;
  paid_capital: number | null;
  bank_loans: number | null;
  is_locked: boolean | null;
  // Optional fields that may exist in DB
  total_equity?: number | null;
  closing_notes?: string | null;
}

// =====================================================
// QUARTERLY ITEMIZED DATA TYPE (for AI analysis)
// =====================================================

/** Quarterly breakdown of a single item (revenue or expense) */
export interface QuarterlyItemBreakdown {
  category: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

/** Difference between scenarios for a single item */
export interface QuarterlyItemDiff {
  category: string;
  diffQ1: number;
  diffQ2: number;
  diffQ3: number;
  diffQ4: number;
  totalDiff: number;
  percentChange: number;
}

/** Complete quarterly itemized data for AI analysis */
export interface QuarterlyItemizedData {
  scenarioA: {
    revenues: QuarterlyItemBreakdown[];
    expenses: QuarterlyItemBreakdown[];
  };
  scenarioB: {
    revenues: QuarterlyItemBreakdown[];
    expenses: QuarterlyItemBreakdown[];
  };
  diffs: {
    revenues: QuarterlyItemDiff[];
    expenses: QuarterlyItemDiff[];
  };
}

/** Default sector multiples */
export const SECTOR_MULTIPLES: Record<string, number> = {
  'SaaS': 8,
  'E-commerce': 2,
  'Fintech': 6,
  'Marketplace': 5,
  'B2B Services': 4,
  'Consulting': 3,
};

/** Default deal configuration */
export const DEFAULT_DEAL_CONFIG: DealConfiguration = {
  investmentAmount: 150000,
  equityPercentage: 10,
  sectorMultiple: 8,
  safetyMargin: 20,
};

// =====================================================
// PROFESSIONAL ANALYSIS TYPES (New)
// =====================================================

/** Sector benchmarks for financial ratio comparison */
export const SECTOR_BENCHMARKS_DATA = {
  'B2B Services': {
    currentRatio: { good: 1.8, average: 1.3, poor: 1.0 },
    quickRatio: { good: 1.5, average: 1.0, poor: 0.7 },
    netMargin: { good: 18, average: 12, poor: 5 },
    debtToEquity: { good: 0.5, average: 1.0, poor: 2.0 },
    receivablesDays: { good: 30, average: 45, poor: 60 },
    returnOnEquity: { good: 20, average: 15, poor: 8 }
  }
};

/** Financial ratios calculated from balance sheet */
export interface FinancialRatios {
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    receivablesRatio: number;
  };
  profitability: {
    returnOnAssets: number;
    returnOnEquity: number;
    netMargin: number;
  };
}

/** Item trend analysis for revenues/expenses */
export interface ItemTrendAnalysis {
  category: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
  volatilityLevel: 'high' | 'medium' | 'low';
  seasonalityIndex: number;
  overallGrowth: number;
  concentrationRisk: number;
  shareOfTotal: number;
}

/** Complete trend analysis for all items */
export interface TrendAnalysisResult {
  revenues: ItemTrendAnalysis[];
  expenses: ItemTrendAnalysis[];
}

/** Sensitivity analysis scenario */
export interface SensitivityImpact {
  change: number;
  revenue: number;
  profit: number;
  margin: number;
  valuation: number;
  moic: number;
  runway: number;
}

/** Complete sensitivity analysis */
export interface EnhancedSensitivityAnalysis {
  revenueImpact: SensitivityImpact[];
  expenseImpact: {
    change: number;
    expense: number;
    profit: number;
    margin: number;
  }[];
}

/** Break-even analysis result */
export interface BreakEvenResult {
  months: {
    month: string;
    cumRevenue: number;
    cumExpense: number;
    isBreakEven: boolean;
  }[];
  breakEvenMonth: string;
  monthsToBreakEven: number;
  requiredMonthlyRevenue: number;
}

/** Enhanced insight with confidence score */
export interface EnhancedInsight extends AIScenarioInsight {
  confidence_score?: number;
  assumptions?: string[];
  supporting_data?: {
    metric: string;
    value: number;
    benchmark?: number;
  }[];
}

/** Enhanced recommendation with confidence */
export interface EnhancedRecommendation extends AIRecommendation {
  confidence_score?: number;
  risks?: string[];
  alternatives?: string[];
}

/** Risk matrix item */
export interface RiskMatrixItem {
  risk: string;
  category: 'financial' | 'operational' | 'market' | 'regulatory';
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  riskScore: number;
  mitigation: string;
}

/** Professional analysis data bundle sent to AI */
export interface ProfessionalAnalysisData {
  financialRatios: FinancialRatios | null;
  itemTrendAnalysis: TrendAnalysisResult | null;
  sensitivityAnalysis: EnhancedSensitivityAnalysis | null;
  breakEvenAnalysis: BreakEvenResult | null;
}

// =====================================================
// FOCUS PROJECT & EDITABLE PROJECTION TYPES
// =====================================================

/** Investment allocation breakdown */
export interface InvestmentAllocation {
  product: number;      // Product development %
  marketing: number;    // Marketing %
  hiring: number;       // Personnel %
  operations: number;   // Operational expenses %
}

/** Single focus project item */
export interface FocusProjectItem {
  projectName: string;
  currentRevenue: number;
  projectedRevenue: number;
}

/** Focus project info for AI analysis - supports multiple projects */
export interface FocusProjectInfo {
  projects: FocusProjectItem[];
  combinedCurrentRevenue: number;
  combinedProjectedRevenue: number;
  description?: string;
  growthPlan: string;
  investmentAllocation: InvestmentAllocation;
  yearContext?: {                // Year context for projections
    baseYear: number;            // 2025 - Last completed year
    scenarioYear: number;        // 2026 - Scenario target year
    projectionYears: {
      year2: number;             // 2027
      year3: number;             // 2029 (3-year MOIC)
      year5: number;             // 2031 (5-year MOIC)
    };
  };
}

/** Editable projection item for next year */
export interface EditableProjectionItem {
  category: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
  aiGenerated: boolean;
  userEdited: boolean;
}

/** Editable projection state */
export interface EditableProjection {
  revenues: EditableProjectionItem[];
  expenses: EditableProjectionItem[];
  aiOriginal: boolean;
  lastEditedAt?: Date;
}

/** Quarterly itemized projection from AI */
export interface QuarterlyItemizedProjection {
  revenues: Record<string, number>;
  expenses: Record<string, number>;
  total_revenue: number;
  total_expense: number;
  net_cash_flow: number;
  key_milestone: string;
}

/** Focus project analysis from AI */
export interface FocusProjectAnalysis {
  project_name: string;
  current_revenue: number;
  projected_revenue: number;
  growth_percentage: number;
  key_actions: string[];
  investment_usage: Record<string, string>;
  risks?: string[];
}

/** Enhanced next year projection with itemized data */
export interface EnhancedNextYearProjection extends NextYearProjection {
  quarterly_itemized?: {
    q1: QuarterlyItemizedProjection;
    q2: QuarterlyItemizedProjection;
    q3: QuarterlyItemizedProjection;
    q4: QuarterlyItemizedProjection;
  };
  focus_project_analysis?: FocusProjectAnalysis;
}
