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

/** Deal configuration for investment simulation */
export interface DealConfig {
  investmentAmount: number;
  equityPercentage: number;
  sectorMultiple: number;
  valuationType: 'pre-money' | 'post-money';
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
  // Investment configuration fields (saved with scenario)
  focusProjects?: string[];
  focusProjectPlan?: string;
  investmentAllocation?: InvestmentAllocation;
  dealConfig?: DealConfig;
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
  // NEW: Dilution parameters for realistic investor returns
  valuationType?: 'pre-money' | 'post-money';  // Değerleme tipi (varsayılan: post-money)
  dilutionConfig?: DilutionConfiguration;      // Seyreltme konfigürasyonu
}

/**
 * Dilution Configuration for realistic MOIC/IRR calculations
 *
 * CRITICAL: Without dilution modeling, investor returns are systematically overstated.
 * This configuration allows modeling of:
 * - Future funding rounds (Series B, C, etc.)
 * - Employee option pool (ESOP)
 * - Liquidation preferences (optional)
 */
export interface DilutionConfiguration {
  /** Expected number of future funding rounds before exit (default: 2) */
  expectedFutureRounds: number;
  /** Average dilution per future round as decimal (default: 0.20 = 20%) */
  avgDilutionPerRound: number;
  /** Employee option pool size as decimal (default: 0.10 = 10%) */
  esopPoolSize: number;
  /** Whether ESOP is created pre-money (dilutes founders more) or post-money */
  esopPreMoney: boolean;
  /** Liquidation preference multiplier (default: 1.0 = 1x non-participating) */
  liquidationPreference: number;
  /** Whether liquidation preference is participating */
  participatingPreferred: boolean;
}

/**
 * Default dilution configuration for realistic modeling
 */
export const DEFAULT_DILUTION_CONFIG: DilutionConfiguration = {
  expectedFutureRounds: 2,
  avgDilutionPerRound: 0.20,
  esopPoolSize: 0.10,
  esopPreMoney: true,
  liquidationPreference: 1.0,
  participatingPreferred: false,
};

/**
 * Calculate ownership at exit accounting for dilution
 *
 * Formula: ownership_exit = ownership_entry × (1 - total_dilution)
 * where total_dilution = 1 - (1 - avgDilution)^numRounds × (1 - esopDilution)
 *
 * @param entryOwnership - Ownership percentage at entry (as decimal, e.g., 0.10 for 10%)
 * @param config - Dilution configuration
 * @returns Ownership percentage at exit (as decimal)
 */
export const calculateOwnershipAtExit = (
  entryOwnership: number,
  config: DilutionConfiguration = DEFAULT_DILUTION_CONFIG
): number => {
  // Calculate dilution from future rounds
  // Each round dilutes by avgDilutionPerRound, compounding
  const roundsDilutionFactor = Math.pow(
    1 - config.avgDilutionPerRound,
    config.expectedFutureRounds
  );

  // Calculate ESOP dilution (if pre-money, affects all shareholders)
  const esopDilutionFactor = config.esopPreMoney
    ? 1 - config.esopPoolSize
    : 1; // Post-money ESOP doesn't dilute existing investors

  // Total dilution factor
  const totalDilutionFactor = roundsDilutionFactor * esopDilutionFactor;

  return entryOwnership * totalDilutionFactor;
};

/**
 * Calculate investor proceeds at exit with waterfall
 *
 * Simplified waterfall:
 * 1. Liquidation preference first (if any)
 * 2. Remaining distributed pro-rata
 *
 * @param exitValue - Total company exit value
 * @param ownershipAtExit - Investor ownership at exit
 * @param investmentAmount - Original investment amount
 * @param config - Dilution configuration
 * @returns Investor proceeds at exit
 */
export const calculateExitProceeds = (
  exitValue: number,
  ownershipAtExit: number,
  investmentAmount: number,
  config: DilutionConfiguration = DEFAULT_DILUTION_CONFIG
): number => {
  const liquidationPreferenceAmount = investmentAmount * config.liquidationPreference;

  if (config.participatingPreferred) {
    // Participating preferred: Get preference + pro-rata share of remainder
    const remainder = Math.max(0, exitValue - liquidationPreferenceAmount);
    return liquidationPreferenceAmount + (remainder * ownershipAtExit);
  } else {
    // Non-participating: Choose higher of preference or pro-rata
    const proRataShare = exitValue * ownershipAtExit;
    return Math.max(liquidationPreferenceAmount, proRataShare);
  }
};

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
// =====================================================
// MULTI-YEAR CAPITAL PLAN TYPES
// =====================================================

/** Çok yıllı sermaye planı */
export interface MultiYearCapitalPlan {
  years: YearCapitalRequirement[];
  totalRequiredInvestment: number;
  cumulativeEndingCash: number;
  selfSustainingFromYear: number | null;
}

/** Tek yıl sermaye ihtiyacı detayı */
export interface YearCapitalRequirement {
  year: number;
  openingCash: number;           // Önceki yıldan devir
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetProfit: number;
  quarterlyDeficit: {            // Çeyreklik nakit açıkları
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  peakDeficit: number;           // Death Valley (en derin açık)
  peakDeficitQuarter: string;    // Hangi çeyrekte
  requiredCapital: number;       // Bu yıl gereken ek sermaye
  endingCash: number;            // Yıl sonu bakiye
  isSelfSustaining: boolean;     // Kendi kendini finanse ediyor mu
  weightedValuation: number;     // Ağırlıklı değerleme (DCF+EBITDA vb)
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

/** Category-based projection for itemized revenues/expenses */
export interface CategoryProjection {
  category: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
  growth_rate: number;  // Growth rate compared to base year (e.g., 0.45 = 45%)
}

/** Next Year Projection from AI - ENHANCED with Globalization Vision and Itemized Data */
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
  
  // NEW: Category-based itemized projections for synchronization with editable tables
  itemized_revenues?: CategoryProjection[];
  itemized_expenses?: CategoryProjection[];
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
  /** Formula breakdown showing how deal_score was calculated */
  deal_score_formula?: string;
  /** Score components for transparency */
  score_components?: {
    moic_score?: number;
    margin_score?: number;
    growth_score?: number;
    risk_score?: number;
  };
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
// EXPENSE CATEGORY TYPES (For Category-Based Projections)
// =====================================================

/**
 * Expense categories for growth modeling
 * Each category has different elasticity relative to revenue growth
 */
export type ExpenseCategory = 'COGS' | 'SALES_MARKETING' | 'R_D' | 'G_A' | 'OTHER';

/**
 * Configuration for how an expense category grows relative to revenue
 */
export interface ExpenseCategoryElasticity {
  /** Category identifier */
  category: ExpenseCategory;
  /** Multiplier relative to revenue growth (1.0 = same as revenue, 0.5 = half) */
  elasticity: number;
  /** Minimum growth rate floor (e.g., inflation baseline) */
  minGrowth: number;
  /** Maximum reasonable growth cap */
  maxGrowth: number;
  /** Human-readable description */
  description: string;
}

/**
 * Default elasticity configurations for each expense category
 *
 * COGS (Cost of Goods Sold): Direct costs that scale 1:1 with revenue
 * SALES_MARKETING: High during growth phase, can show efficiency gains
 * R_D (Research & Development): Semi-fixed, mostly team costs
 * G_A (General & Administrative): Largely fixed overhead
 * OTHER: Default elasticity for uncategorized expenses
 */
export const EXPENSE_CATEGORY_ELASTICITIES: Record<ExpenseCategory, ExpenseCategoryElasticity> = {
  'COGS': {
    category: 'COGS',
    elasticity: 1.0,
    minGrowth: 0,
    maxGrowth: 1.5,
    description: 'Satılan Malın Maliyeti - doğrudan gelirle ölçeklenir'
  },
  'SALES_MARKETING': {
    category: 'SALES_MARKETING',
    elasticity: 0.8,
    minGrowth: 0.05,
    maxGrowth: 1.5,
    description: 'Satış ve Pazarlama - büyüme döneminde yüksek, verimlilik mümkün'
  },
  'R_D': {
    category: 'R_D',
    elasticity: 0.5,
    minGrowth: 0.05,
    maxGrowth: 0.8,
    description: 'Ar-Ge - çoğunlukla sabit ekip maliyetleri'
  },
  'G_A': {
    category: 'G_A',
    elasticity: 0.3,
    minGrowth: 0.03,
    maxGrowth: 0.5,
    description: 'Genel Yönetim Giderleri - büyük ölçüde sabit'
  },
  'OTHER': {
    category: 'OTHER',
    elasticity: 0.6,
    minGrowth: 0,
    maxGrowth: 1.0,
    description: 'Diğer giderler - varsayılan elastikiyet'
  }
};

// =====================================================
// AI EVIDENCE CHAIN TYPES (For Transparent Analysis)
// =====================================================

/**
 * Evidence chain for AI-generated insights
 * Ensures transparency about data sources and assumptions
 */
export interface EvidenceChain {
  /** Which data point(s) this insight is based on */
  sourceData: string;
  /** List of assumptions made in the analysis */
  assumptions: string[];
  /** Known limitations of this analysis */
  limitations?: string;
  /** How the number/conclusion was derived */
  calculationMethod?: string;
}

/**
 * Enhanced insight with evidence chain and confidence scoring
 */
export interface EvidencedInsight {
  /** Insight title */
  title: string;
  /** Detailed description with data support */
  description: string;
  /** Category of insight */
  category: 'revenue' | 'expense' | 'efficiency' | 'opportunity' | 'risk';
  /** Confidence score 0-100 based on data quality */
  confidence: number;
  /** Evidence chain showing data source */
  evidence: EvidenceChain;
}

/**
 * Risk analysis item for balanced AI output
 */
export interface RiskAnalysisItem {
  /** Risk description */
  risk: string;
  /** Probability assessment */
  probability: 'low' | 'medium' | 'high';
  /** Impact description */
  impact: string;
  /** Mitigation strategy */
  mitigation: string;
  /** Related opportunity (for balance) */
  relatedOpportunity?: string;
}

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
// DATABASE ROW TYPES (Supabase schema)
// =====================================================

/** Database row type for scenario_ai_analyses table */
export interface ScenarioAIAnalysisRow {
  id: string;
  user_id: string;
  scenario_a_id: string;
  scenario_b_id: string;
  analysis_type: 'unified' | 'scenario_comparison' | 'investor_pitch';
  insights: AIScenarioInsight[] | null;
  recommendations: AIRecommendation[] | null;
  quarterly_analysis: QuarterlyAIAnalysis | null;
  deal_score: number | null;
  valuation_verdict: 'premium' | 'fair' | 'cheap' | null;
  investor_analysis: {
    investor_attractiveness?: string;
    risk_factors?: string[];
    capitalStory?: string;
    exitNarrative?: string;
    investorROI?: string;
    keyMetrics?: {
      capitalEfficiency: number;
      paybackMonths: number;
      burnMultiple: number;
    };
    opportunityCost?: string;
    potentialAcquirers?: string[];
    recommendedExit?: 'series_b' | 'strategic_sale' | 'ipo' | 'hold';
  } | null;
  pitch_deck: PitchDeck | null;
  next_year_projection: NextYearProjection | null;
  focus_projects: string[] | null;
  focus_project_plan: string | null;
  investment_allocation: InvestmentAllocation | null;
  edited_revenue_projection: EditableProjectionItem[] | null;
  edited_expense_projection: EditableProjectionItem[] | null;
  projection_user_edited: boolean | null;
  deal_config_snapshot: DealConfiguration | null;
  scenario_a_data_hash: string | null;
  scenario_b_data_hash: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Database row type for scenario_analysis_history table */
export interface ScenarioAnalysisHistoryRow {
  id: string;
  user_id: string;
  scenario_a_id: string;
  scenario_b_id: string;
  analysis_type: 'unified' | 'scenario_comparison' | 'investor_pitch';
  insights: AIScenarioInsight[] | null;
  recommendations: AIRecommendation[] | null;
  quarterly_analysis: QuarterlyAIAnalysis | null;
  investor_analysis: Record<string, unknown> | null;
  deal_config: DealConfiguration | null;
  scenario_a_data_hash: string | null;
  scenario_b_data_hash: string | null;
  created_at: string;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/** Type guard for AIScenarioInsight array */
export function isValidInsightArray(data: unknown): data is AIScenarioInsight[] {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'category' in item &&
    'severity' in item &&
    'title' in item &&
    'description' in item
  );
}

/** Type guard for AIRecommendation array */
export function isValidRecommendationArray(data: unknown): data is AIRecommendation[] {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'priority' in item &&
    'title' in item &&
    'description' in item
  );
}

/** Type guard for QuarterlyAIAnalysis */
export function isValidQuarterlyAnalysis(data: unknown): data is QuarterlyAIAnalysis {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return 'overview' in obj && typeof obj.overview === 'string';
}

/** Type guard for PitchDeck */
export function isValidPitchDeck(data: unknown): data is PitchDeck {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return 'slides' in obj && Array.isArray(obj.slides);
}

/** Type guard for NextYearProjection */
export function isValidNextYearProjection(data: unknown): data is NextYearProjection {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return 'strategy_note' in obj && 'quarterly' in obj && 'summary' in obj;
}

/** Type guard for InvestmentAllocation */
export function isValidInvestmentAllocation(data: unknown): data is InvestmentAllocation {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.product === 'number' &&
    typeof obj.marketing === 'number' &&
    typeof obj.hiring === 'number' &&
    typeof obj.operations === 'number'
  );
}

/** Type guard for EditableProjectionItem array */
export function isValidEditableProjectionArray(data: unknown): data is EditableProjectionItem[] {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'category' in item &&
    typeof (item as EditableProjectionItem).category === 'string'
  );
}

/** Safe array access - returns empty array if input is not an array */
export function safeArray<T>(arr: T[] | null | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

/** Safe object access with default value */
export function safeObject<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  defaultValue: T
): T {
  return obj && typeof obj === 'object' ? obj : defaultValue;
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
  /** Organic growth rate for non-focus projects (0-15%, default 0) */
  organicGrowthRate?: number;
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

// =====================================================
// CAP TABLE TYPES
// =====================================================

/**
 * Shareholder type in cap table
 */
export type ShareholderType = 'founder' | 'co-founder' | 'investor' | 'esop' | 'advisor' | 'employee';

/**
 * Vesting schedule for shares
 */
export interface VestingSchedule {
  /** Total vesting period in months (typically 48) */
  totalMonths: number;
  /** Cliff period in months (typically 12) */
  cliffMonths: number;
  /** Start date of vesting */
  startDate: string;
  /** Vesting schedule type */
  scheduleType: 'linear' | 'back-loaded' | 'front-loaded';
  /** Percentage vested so far */
  vestedPercent: number;
}

/**
 * Individual shareholder in cap table
 */
export interface Shareholder {
  /** Unique identifier */
  id: string;
  /** Name of shareholder */
  name: string;
  /** Type of shareholder */
  type: ShareholderType;
  /** Number of shares held */
  shares: number;
  /** Ownership percentage (basic) */
  ownershipPercent: number;
  /** Fully diluted ownership percentage */
  fullyDilutedPercent: number;
  /** Investment amount (for investors) */
  investmentAmount?: number;
  /** Share price at investment */
  pricePerShare?: number;
  /** Vesting schedule (for ESOP/employees) */
  vestingSchedule?: VestingSchedule;
  /** Notes about the shareholder */
  notes?: string;
}

/**
 * Funding round information
 */
export interface FundingRound {
  /** Unique identifier */
  id: string;
  /** Round name (Seed, Series A, etc.) */
  name: string;
  /** Date of the round */
  date: string;
  /** Amount raised */
  amountRaised: number;
  /** Pre-money valuation */
  preMoneyValuation: number;
  /** Post-money valuation */
  postMoneyValuation: number;
  /** Shares issued */
  sharesIssued: number;
  /** Price per share */
  pricePerShare: number;
  /** Lead investor name */
  leadInvestor?: string;
  /** List of participating investors */
  investors: string[];
  /** Liquidation preference multiplier */
  liquidationPreference: number;
  /** Is participating preferred */
  participatingPreferred: boolean;
}

/**
 * ESOP (Employee Stock Option Pool) configuration
 */
export interface ESOPPool {
  /** Total shares allocated to pool */
  totalShares: number;
  /** Shares allocated to employees */
  allocatedShares: number;
  /** Shares available for future grants */
  availableShares: number;
  /** Pool size as percentage of fully diluted */
  poolPercent: number;
  /** Whether pool is pre-money or post-money */
  isPreMoney: boolean;
}

/**
 * Complete Cap Table structure
 */
export interface CapTable {
  /** Company name */
  companyName: string;
  /** List of shareholders */
  shareholders: Shareholder[];
  /** Total authorized shares */
  authorizedShares: number;
  /** Total issued shares */
  issuedShares: number;
  /** Fully diluted shares (issued + ESOP reserved) */
  fullyDilutedShares: number;
  /** ESOP pool configuration */
  esopPool: ESOPPool;
  /** List of funding rounds */
  rounds: FundingRound[];
  /** Last updated date */
  lastUpdated: string;
}

/**
 * Create default empty cap table
 */
export const createDefaultCapTable = (companyName: string): CapTable => ({
  companyName,
  shareholders: [
    {
      id: 'founder-1',
      name: 'Kurucu',
      type: 'founder',
      shares: 8000000,
      ownershipPercent: 80,
      fullyDilutedPercent: 72,
      notes: 'Kurucu ortak',
    },
    {
      id: 'esop-pool',
      name: 'ESOP Havuzu',
      type: 'esop',
      shares: 1000000,
      ownershipPercent: 10,
      fullyDilutedPercent: 10,
      notes: 'Çalışan opsiyon havuzu',
    },
  ],
  authorizedShares: 10000000,
  issuedShares: 9000000,
  fullyDilutedShares: 10000000,
  esopPool: {
    totalShares: 1000000,
    allocatedShares: 0,
    availableShares: 1000000,
    poolPercent: 10,
    isPreMoney: true,
  },
  rounds: [],
  lastUpdated: new Date().toISOString(),
});

// =====================================================
// UNIT ECONOMICS TYPES
// =====================================================

/**
 * Unit Economics metrics for investor analysis
 */
export interface UnitEconomics {
  /** Customer Acquisition Cost */
  cac: number;
  /** Lifetime Value */
  ltv: number;
  /** LTV/CAC Ratio (target > 3x) */
  ltvCacRatio: number;
  /** CAC Payback Period in months */
  paybackMonths: number;
  /** Gross Margin percentage */
  grossMargin: number;
  /** Net Revenue Retention (NRR) percentage */
  netRetention: number;
  /** Burn Multiple (Net Burn / Net New ARR) */
  burnMultiple: number;
  /** Magic Number (Net New ARR / S&M Spend) */
  magicNumber: number;
  /** Average Revenue Per User/Account */
  arpu: number;
  /** Monthly Churn Rate */
  monthlyChurnRate: number;
  /** Average Contract Value */
  acv: number;
}

/**
 * Calculate LTV from ARPU, gross margin, and churn
 */
export const calculateLTV = (
  arpu: number,
  grossMargin: number,
  monthlyChurnRate: number
): number => {
  if (monthlyChurnRate <= 0) return arpu * grossMargin * 120;
  return (arpu * grossMargin) / monthlyChurnRate;
};

/**
 * Calculate LTV/CAC ratio
 */
export const calculateLTVCACRatio = (ltv: number, cac: number): number => {
  if (cac <= 0) return 0;
  return ltv / cac;
};

/**
 * Calculate CAC payback period in months
 */
export const calculatePaybackMonths = (
  cac: number,
  arpu: number,
  grossMargin: number
): number => {
  const monthlyContribution = arpu * grossMargin;
  if (monthlyContribution <= 0) return Infinity;
  return cac / monthlyContribution;
};

/**
 * Create default unit economics
 */
export const createDefaultUnitEconomics = (): UnitEconomics => ({
  cac: 0,
  ltv: 0,
  ltvCacRatio: 0,
  paybackMonths: 0,
  grossMargin: 0.7,
  netRetention: 1.0,
  burnMultiple: 0,
  magicNumber: 0,
  arpu: 0,
  monthlyChurnRate: 0.02,
  acv: 0,
});

// =====================================================
// INVESTOR-GRADE CAP TABLE TYPES (P1.1)
// =====================================================

/** Cap Table Entry - Individual shareholder */
export interface CapTableEntry {
  holder: string;
  shares: number;
  percentage: number;
  type: 'common' | 'preferred' | 'options' | 'safe';
}

/** Deal Terms V2 - Enhanced with full term sheet parameters */
export interface DealTermsV2 {
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

/** Cap Table Configuration */
export interface CapTableConfig {
  current: CapTableEntry[];
  future_rounds_assumptions: FutureRoundAssumption[];
}

/** Future Round Assumption for dilution modeling */
export interface FutureRoundAssumption {
  round: string;               // 'Seed', 'Series A', 'Series B'
  dilution_pct: number;        // 0.15 = 15%
  investment_amount?: number;  // Expected investment
  expected_valuation?: number; // Expected valuation at round
}

/** Exit Waterfall Result */
export interface ExitWaterfallResult {
  exit_value: number;
  liquidation_preference_payout: number;
  remaining_for_common: number;
  proceeds_by_holder: { holder: string; proceeds: number; moic: number }[];
}

/** Dilution Path Entry - tracks ownership through funding rounds */
export interface DilutionPathEntry {
  round: string;
  ownership: number;
  valuation: number;
  cumulativeDilution: number;
  investmentAmount?: number;
}

// =====================================================
// EVIDENCE TRACE TYPES (P1.5)
// =====================================================

/** Evidence Trace - Required for every AI insight/recommendation with numbers */
export interface EvidenceTrace {
  evidence_paths: string[];    // JSON paths: ["dealConfig.investmentAmount", "summaryA.totalRevenue"]
  calc_trace: string;          // "MOIC = $3.2M × 8% / $250K = 1.02x"
  data_needed?: string[];      // ["customer_count", "churn_rate"] - missing data
  confidence_score: number;    // 0-100
  assumptions?: string[];      // Assumptions made
}

/** AI Scenario Insight V2 - With evidence trace */
export interface AIScenarioInsightV2 extends AIScenarioInsight {
  evidence?: EvidenceTrace;
}

/** AI Recommendation V2 - With evidence trace */
export interface AIRecommendationV2 extends AIRecommendation {
  evidence?: EvidenceTrace;
}

// =====================================================
// WORKING CAPITAL & CASH FLOW TYPES (P1.2)
// =====================================================

/** Working Capital Configuration */
export interface WorkingCapitalConfigV2 {
  ar_days: number;                    // Accounts Receivable collection days
  ap_days: number;                    // Accounts Payable payment days
  inventory_days?: number;            // Inventory holding days (optional)
  deferred_revenue_days?: number;     // Deferred revenue recognition days
}

/** Tax & Financing Configuration */
export interface TaxFinancingConfig {
  corporate_tax_rate: number;
  tax_payment_lag_days: number;
  vat_withholding_mode?: 'monthly' | 'quarterly';
  debt_schedule?: DebtItem[];
}

/** Debt Schedule Item */
export interface DebtItem {
  name: string;
  principal: number;
  interest_rate: number;
  maturity_date: string;
  payment_frequency: 'monthly' | 'quarterly' | 'annually';
  remaining_balance: number;
}

/** CapEx & Depreciation Configuration */
export interface CapexDepreciationConfig {
  capex_by_category: Record<string, number>;
  depreciation_years: number;
  method: 'straight_line' | 'declining_balance';
}

/** 13-Week Cash Forecast */
export interface ThirteenWeekCashForecast {
  week: number;
  week_label: string;
  opening_balance: number;
  ar_collections: number;
  ap_payments: number;
  payroll: number;
  other_operating: number;
  debt_service: number;
  net_cash_flow: number;
  closing_balance: number;
}

/** Cash Reconciliation Bridge */
export interface CashReconciliationBridge {
  net_income: number;
  add_depreciation: number;
  add_amortization: number;
  ebitda: number;
  change_in_ar: number;
  change_in_ap: number;
  change_in_inventory: number;
  operating_cash_flow: number;
  capex: number;
  investing_cash_flow: number;
  debt_proceeds: number;
  debt_repayments: number;
  financing_cash_flow: number;
  net_change_in_cash: number;
  ending_cash: number;
}

// =====================================================
// SENSITIVITY ANALYSIS TYPES (P1.4)
// =====================================================

/** Sensitivity Configuration */
export interface SensitivityConfigV2 {
  mode: 'tornado' | 'scenario_matrix' | 'monte_carlo';
  shock_range: number;     // ±% (e.g., 0.10 = ±10%)
  drivers: string[];       // ['growth_rate', 'gross_margin', 'churn', 'cac']
}

/** Tornado Analysis Result */
export interface TornadoResult {
  driver: string;
  base_value: number;
  low_value: number;
  high_value: number;
  valuation_at_low: number;
  valuation_at_high: number;
  valuation_swing: number;
  runway_at_low: number;
  runway_at_high: number;
}

/** Scenario Matrix (Base/Bull/Bear) */
export interface ScenarioMatrixV2 {
  base: ScenarioOutcomeV2;
  bull: ScenarioOutcomeV2;
  bear: ScenarioOutcomeV2;
}

/** Scenario Outcome for matrix */
export interface ScenarioOutcomeV2 {
  name: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  valuation: number;
  runway_months: number;
  moic: number;
  irr?: number;
  probability?: number;
}

// =====================================================
// UNIT ECONOMICS DRIVER TYPES (P1.3)
// =====================================================

/** Business Model Type */
export type BusinessModelType = 'B2B_SaaS' | 'B2C_SaaS' | 'ECOM' | 'CONSULTING' | 'MARKETPLACE' | 'OTHER';

/** Unit Economics Input - model-specific drivers */
export interface UnitEconomicsInputV2 {
  // SaaS metrics
  mrr?: number;
  arr?: number;
  arpa?: number;
  gross_margin?: number;
  logo_churn?: number;
  nrr?: number;
  cac?: number;
  ltv?: number;
  payback_months?: number;
  
  // E-commerce metrics
  traffic?: number;
  conversion?: number;
  aov?: number;
  repeat_rate?: number;
  return_rate?: number;
  fulfillment_cost?: number;
  
  // Consulting metrics
  billable_hc?: number;
  utilization?: number;
  blended_rate?: number;
  project_margin?: number;
}

// =====================================================
// BENCHMARKS & COMPARABLES TYPES (P2.3)
// =====================================================

/** Benchmarks Configuration - curated dataset */
export interface BenchmarksConfig {
  dataset_id: string;
  last_updated: string;
  sources_provenance: string[];
  records: ComparableRecord[];
}

/** Comparable Company Record */
export interface ComparableRecord {
  company_name: string;
  sector: string;
  stage: string;
  revenue_multiple: number;
  ebitda_multiple: number;
  source: string;
  exit_year?: number;
}

// =====================================================
// DEAL SCORE BREAKDOWN TYPES (P2.2)
// =====================================================

/** Deal Score Breakdown - transparent scoring */
export interface DealScoreBreakdown {
  traction: { score: number; weight: number; evidence: string };
  unit_economics: { score: number; weight: number; evidence: string };
  cash_risk: { score: number; weight: number; evidence: string };
  terms: { score: number; weight: number; evidence: string };
  exit_clarity: { score: number; weight: number; evidence: string };
  data_quality: { score: number; weight: number; evidence: string };
  total: number;
  formula: string;
}

// =====================================================
// ENHANCED ANALYSIS OUTPUT TYPES
// =====================================================

/** Enhanced Sensitivity Results */
export interface SensitivityResults {
  tornado: TornadoResult[];
  scenario_matrix: ScenarioMatrixV2;
  survival_probability?: number;
}

/** Enhanced Deal Analysis with cap table */
export interface EnhancedDealAnalysis {
  deal_score: number;
  deal_score_breakdown?: DealScoreBreakdown;
  valuation_verdict: 'premium' | 'fair' | 'cheap';
  cap_table_current?: CapTableEntry[];
  cap_table_post_money?: CapTableEntry[];
  dilution_path?: DilutionPathEntry[];
  exit_waterfall?: ExitWaterfallResult;
  irr?: number;
  moic: number;
  payback_year?: number;
}
