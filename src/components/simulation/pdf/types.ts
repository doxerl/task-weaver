/**
 * PDF Export Types
 * Type definitions for PDF export components
 */

import type {
  SimulationScenario,
  FinancialRatios,
  EnhancedSensitivityAnalysis,
  EditableProjectionItem,
  InvestmentAllocation,
  QuarterlyItemizedData,
  CapitalRequirement,
  InvestmentTier,
  InvestmentScenarioComparison,
} from '@/types/simulation';
import type { UnifiedAnalysisResult, ExitPlan } from '@/types/simulation';
import type { ChartConfig } from '@/components/ui/chart';

/**
 * Deal configuration for investment analysis
 */
export interface DealConfig {
  investmentAmount: number;
  equityPercentage: number;
  sectorMultiple: number;
  useOfFunds?: {
    product: number;
    marketing: number;
    hiring: number;
    operations: number;
  };
}

/**
 * Scenario summary calculations
 */
export interface ScenarioSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
}

/**
 * Metric item for comparison
 */
export interface MetricItem {
  label: string;
  scenarioA: number;
  scenarioB: number;
  format: 'currency' | 'percent' | 'number';
  higherIsBetter: boolean;
}

/**
 * Quarterly comparison data point
 */
export interface QuarterlyComparisonData {
  quarter: string;
  scenarioARevenue: number;
  scenarioAExpense: number;
  scenarioANet: number;
  scenarioBRevenue: number;
  scenarioBExpense: number;
  scenarioBNet: number;
}

/**
 * Cumulative quarterly data
 */
export interface CumulativeQuarterlyData {
  quarter: string;
  scenarioACumulative: number;
  scenarioBCumulative: number;
}

/**
 * Exit plan projection year
 */
export interface ExitPlanYear {
  year: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  companyValuation: number;
}

/**
 * PDF Exit Plan data
 */
export interface PdfExitPlanData {
  moic3Year: number;
  moic5Year: number;
  investorShare5Year: number;
  year5Projection?: ExitPlanYear;
  yearLabels?: {
    moic3Year?: number;
    moic5Year?: number;
  };
  allYears?: ExitPlanYear[];
  growthConfig?: {
    aggressiveGrowthRate: number;
    normalizedGrowthRate: number;
  };
}

/**
 * Main PDF Export Props
 */
export interface PdfExportContainerProps {
  presentationPdfRef: React.RefObject<HTMLDivElement>;

  // Scenarios
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  summaryA: ScenarioSummary | null;
  summaryB: ScenarioSummary | null;

  // Metrics
  metrics: MetricItem[];
  calculateDiff: (a: number, b: number) => { absolute: number; percent: number };
  formatValue: (value: number, format: 'currency' | 'percent' | 'number') => string;

  // Quarterly data
  quarterlyComparison: QuarterlyComparisonData[];
  quarterlyCumulativeData: CumulativeQuarterlyData[];
  quarterlyItemized: QuarterlyItemizedData | null;

  // Charts
  chartConfig: ChartConfig;
  cumulativeChartConfig: ChartConfig;

  // Professional analysis
  financialRatios: FinancialRatios | null;
  sensitivityAnalysis: EnhancedSensitivityAnalysis | null;

  // AI Analysis
  unifiedAnalysis: UnifiedAnalysisResult | null;

  // Deal & Investment
  dealConfig: DealConfig;
  pdfExitPlan: ExitPlan | null;

  // Projections
  editableRevenueProjection: EditableProjectionItem[];
  editableExpenseProjection: EditableProjectionItem[];

  // Focus Projects
  focusProjects: string[];
  investmentAllocation: InvestmentAllocation | null;
  focusProjectPlan: string;

  // Capital Analysis (NEW) - Optional for backward compatibility
  capitalNeedA?: CapitalRequirement | null;
  capitalNeedB?: CapitalRequirement | null;

  // Investment Options (NEW) - Optional for backward compatibility
  investmentTiers?: InvestmentTier[];
  optimalTiming?: OptimalInvestmentTiming | null;

  // Scenario Comparison (NEW) - Optional for backward compatibility
  scenarioComparison?: InvestmentScenarioComparison | null;
}

/**
 * Cover Page Props
 */
export interface PdfCoverPageProps {
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  metrics: MetricItem[];
  calculateDiff: (a: number, b: number) => { absolute: number; percent: number };
  formatValue: (value: number, format: 'currency' | 'percent' | 'number') => string;
}

/**
 * Metrics Page Props
 */
export interface PdfMetricsPageProps {
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  metrics: MetricItem[];
  calculateDiff: (a: number, b: number) => { absolute: number; percent: number };
  formatValue: (value: number, format: 'currency' | 'percent' | 'number') => string;
}

/**
 * Charts Page Props
 */
export interface PdfChartsPageProps {
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  quarterlyComparison: QuarterlyComparisonData[];
  quarterlyCumulativeData: CumulativeQuarterlyData[];
  chartConfig: ChartConfig;
  cumulativeChartConfig: ChartConfig;
}

/**
 * Financial Ratios Page Props
 */
export interface PdfFinancialRatiosPageProps {
  financialRatios: FinancialRatios | null;
  sensitivityAnalysis: EnhancedSensitivityAnalysis | null;
}

/**
 * Revenue/Expense Comparison Page Props
 */
export interface PdfRevenueExpensePageProps {
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  summaryA: ScenarioSummary | null;
  summaryB: ScenarioSummary | null;
  quarterlyItemized: QuarterlyItemizedData | null;
}

/**
 * Investor Analysis Page Props
 */
export interface PdfInvestorPageProps {
  unifiedAnalysis: UnifiedAnalysisResult | null;
  dealConfig: DealConfig;
  pdfExitPlan: PdfExitPlanData | null;
}

/**
 * Editable Projection Page Props
 */
export interface PdfProjectionPageProps {
  scenarioA: SimulationScenario | null;
  editableRevenueProjection: EditableProjectionItem[];
  editableExpenseProjection: EditableProjectionItem[];
}

/**
 * Focus Project Page Props
 */
export interface PdfFocusProjectPageProps {
  scenarioA: SimulationScenario | null;
  focusProjects: string[];
  investmentAllocation: InvestmentAllocation | null;
  focusProjectPlan: string;
  dealConfig: DealConfig;
}

/**
 * AI Insights Page Props - Extended with calculated data
 */
export interface PdfAIInsightsPageProps {
  unifiedAnalysis: UnifiedAnalysisResult | null;
  // Calculated data for evidence-based insights
  summaryA?: ScenarioSummary | null;
  summaryB?: ScenarioSummary | null;
  capitalNeedA?: CapitalRequirement | null;
  capitalNeedB?: CapitalRequirement | null;
  scenarioComparison?: InvestmentScenarioComparison | null;
  dealConfig?: DealConfig;
}

/**
 * Optimal Investment Timing - computed for PDF
 */
export interface OptimalInvestmentTiming {
  recommendedQuarter: string;
  recommendedTiming: string;
  reason: string;
  riskIfDelayed: string;
  requiredInvestment: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  quarterlyNeeds: number[];
}

/**
 * Capital Analysis Page Props
 */
export interface PdfCapitalAnalysisPageProps {
  capitalNeedA: CapitalRequirement;
  capitalNeedB: CapitalRequirement;
  dealConfig: DealConfig;
  scenarioAName: string;
  scenarioBName: string;
}

/**
 * Valuation Page Props
 */
export interface PdfValuationPageProps {
  pdfExitPlan: PdfExitPlanData | null;
  dealConfig: DealConfig;
}

/**
 * Investment Options Page Props
 */
export interface PdfInvestmentOptionsPageProps {
  investmentTiers: InvestmentTier[];
  optimalTiming: OptimalInvestmentTiming | null;
  targetYear: number;
}

/**
 * Scenario Impact Page Props
 */
export interface PdfScenarioImpactPageProps {
  scenarioComparison: InvestmentScenarioComparison;
  scenarioAName: string;
  scenarioBName: string;
  scenarioYear: number;
}

