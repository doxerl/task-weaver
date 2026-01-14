import { useMemo } from 'react';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationSummary,
  ROIAnalysis,
  PaybackPeriod,
  NPVAnalysis,
  SensitivityAnalysis,
  SensitivityScenario,
} from '@/types/simulation';

// Categories considered as fixed expenses for break-even
const FIXED_EXPENSE_CATEGORIES = [
  'Personel', 'Kira', 'Muhasebe', 'Yazılım', 'Abonelik', 
  'Telekomünikasyon', 'Sigorta', 'Leasing'
];

function isFixedCategory(category: string): boolean {
  return FIXED_EXPENSE_CATEGORIES.some(fixed => 
    category.toLowerCase().includes(fixed.toLowerCase())
  );
}

/**
 * Calculate approximate IRR using binary search
 * For a single year: Investment = Profit / (1 + IRR)
 */
function calculateApproximateIRR(
  investment: number, 
  annualProfit: number, 
  years: number = 1
): number {
  if (investment <= 0 || annualProfit <= 0) return 0;
  
  // For single year, simplified formula
  if (years === 1) {
    return ((annualProfit / investment) - 1) * 100;
  }
  
  // Binary search for multi-year
  let low = -0.99;
  let high = 10; // 1000% max
  let irr = 0;
  
  for (let i = 0; i < 100; i++) {
    irr = (low + high) / 2;
    let npv = -investment;
    
    for (let y = 1; y <= years; y++) {
      npv += annualProfit / Math.pow(1 + irr, y);
    }
    
    if (Math.abs(npv) < 0.01) break;
    if (npv > 0) low = irr;
    else high = irr;
  }
  
  return irr * 100;
}

function calculateScenario(
  revenues: ProjectionItem[],
  expenses: ProjectionItem[],
  investments: InvestmentItem[],
  revenueChange: number,
  scenarioName: string
): SensitivityScenario {
  const baseRevenue = revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const adjustedRevenue = baseRevenue * (1 + revenueChange);
  const totalExpense = expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  const profit = adjustedRevenue - totalExpense;
  const margin = adjustedRevenue > 0 ? (profit / adjustedRevenue) * 100 : 0;
  const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
  const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

  return {
    name: scenarioName,
    revenueChange: revenueChange * 100,
    revenue: adjustedRevenue,
    expense: totalExpense,
    profit,
    margin,
    roi,
  };
}

interface UseROIAnalysisParams {
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  summary: SimulationSummary;
  discountRate?: number;
}

export function useROIAnalysis({
  revenues,
  expenses,
  investments,
  summary,
  discountRate = 0.10,
}: UseROIAnalysisParams): ROIAnalysis {
  return useMemo(() => {
    const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
    const projectedProfit = summary.projected.netProfit;
    const projectedRevenue = summary.projected.totalRevenue;
    const projectedExpense = summary.projected.totalExpense;

    // 1. Simple ROI
    const simpleROI = totalInvestment > 0 
      ? (projectedProfit / totalInvestment) * 100 
      : 0;

    // 2. Payback period
    const monthlyProfit = projectedProfit / 12;
    const paybackMonths = monthlyProfit > 0 
      ? totalInvestment / monthlyProfit 
      : Infinity;
    
    const paybackPeriod: PaybackPeriod = {
      months: Math.ceil(paybackMonths),
      isWithinYear: paybackMonths <= 12,
      exactMonths: paybackMonths,
    };

    // 3. Break-even analysis
    const fixedExpenses = expenses
      .filter(e => isFixedCategory(e.category))
      .reduce((sum, e) => sum + e.projectedAmount, 0);
    
    const variableExpenses = expenses
      .filter(e => !isFixedCategory(e.category))
      .reduce((sum, e) => sum + e.projectedAmount, 0);
    
    const variableRatio = projectedRevenue > 0 ? variableExpenses / projectedRevenue : 0;
    const contributionMargin = 1 - variableRatio;
    const breakEvenRevenue = contributionMargin > 0 ? fixedExpenses / contributionMargin : 0;

    // 4. NPV calculation (1 year, simplified)
    const npv = (projectedProfit / (1 + discountRate)) - totalInvestment;
    
    // 5. IRR calculation
    const irr = calculateApproximateIRR(totalInvestment, projectedProfit);

    const npvAnalysis: NPVAnalysis = {
      npv,
      discountRate: discountRate * 100,
      irr,
      isPositiveNPV: npv > 0,
    };

    // 6. Sensitivity analysis (3 scenarios)
    const sensitivity: SensitivityAnalysis = {
      pessimistic: calculateScenario(revenues, expenses, investments, -0.20, 'Pesimist (-20%)'),
      baseline: calculateScenario(revenues, expenses, investments, 0, 'Baz Senaryo'),
      optimistic: calculateScenario(revenues, expenses, investments, 0.20, 'Optimist (+20%)'),
    };

    return {
      simpleROI,
      paybackPeriod,
      breakEven: {
        revenue: breakEvenRevenue,
        margin: contributionMargin * 100,
        currentVsRequired: breakEvenRevenue > 0 ? projectedRevenue / breakEvenRevenue : 0,
      },
      npvAnalysis,
      sensitivity,
    };
  }, [revenues, expenses, investments, summary, discountRate]);
}
