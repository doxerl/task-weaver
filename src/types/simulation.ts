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
  baseYear: number;             // e.g., 2025
  targetYear: number;           // e.g., 2026
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  assumedExchangeRate: number;  // TL/USD for display
  notes: string;
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
