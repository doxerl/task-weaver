import { useMemo } from 'react';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationSummary,
  AdvancedCapitalAnalysis,
  CashFlowProjection,
  CurrentCashPosition,
  WorkingCapitalNeeds,
  BreakEvenAnalysis,
  EnhancedCapitalNeeds,
  BurnRateAnalysis,
  QuarterlyAmounts,
  QuarterlyProjection,
} from '@/types/simulation';
import { FinancialDataHub } from './useFinancialDataHub';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const QUARTER_MONTHS: Record<string, string[]> = {
  Q1: ['Oca', 'Şub', 'Mar'],
  Q2: ['Nis', 'May', 'Haz'],
  Q3: ['Tem', 'Ağu', 'Eyl'],
  Q4: ['Eki', 'Kas', 'Ara'],
};

// Categories considered as fixed expenses
const FIXED_EXPENSE_CATEGORIES = [
  'Personel', 'Kira', 'Muhasebe', 'Yazılım', 'Abonelik', 
  'Telekomünikasyon', 'Sigorta', 'Leasing'
];

function isFixedExpense(category: string): boolean {
  return FIXED_EXPENSE_CATEGORIES.some(fixed => 
    category.toLowerCase().includes(fixed.toLowerCase())
  );
}

// Helper to get quarterly amounts with fallback to even distribution
function getQuarterlyAmounts(item: ProjectionItem, useProjected: boolean = true): QuarterlyAmounts {
  const amount = useProjected ? item.projectedAmount : item.baseAmount;
  const quarterly = useProjected ? item.projectedQuarterly : item.baseQuarterly;
  
  if (quarterly) {
    return quarterly;
  }
  
  // Default: even distribution
  const perQuarter = Math.round(amount / 4);
  return {
    q1: perQuarter,
    q2: perQuarter,
    q3: perQuarter,
    q4: amount - (perQuarter * 3), // Ensure total matches
  };
}

// Calculate quarterly totals from projection items
function calculateQuarterlyTotals(items: ProjectionItem[], useProjected: boolean = true): QuarterlyAmounts {
  const totals: QuarterlyAmounts = { q1: 0, q2: 0, q3: 0, q4: 0 };
  
  items.forEach(item => {
    const quarterly = getQuarterlyAmounts(item, useProjected);
    totals.q1 += quarterly.q1;
    totals.q2 += quarterly.q2;
    totals.q3 += quarterly.q3;
    totals.q4 += quarterly.q4;
  });
  
  return totals;
}

// Calculate quarterly investment totals
function calculateQuarterlyInvestments(investments: InvestmentItem[]): QuarterlyAmounts {
  const totals: QuarterlyAmounts = { q1: 0, q2: 0, q3: 0, q4: 0 };
  
  investments.forEach(inv => {
    if (inv.month >= 1 && inv.month <= 3) totals.q1 += inv.amount;
    else if (inv.month >= 4 && inv.month <= 6) totals.q2 += inv.amount;
    else if (inv.month >= 7 && inv.month <= 9) totals.q3 += inv.amount;
    else if (inv.month >= 10 && inv.month <= 12) totals.q4 += inv.amount;
  });
  
  return totals;
}

interface UseAdvancedCapitalAnalysisParams {
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  summary: SimulationSummary;
  hub: FinancialDataHub | null;
  safetyMonths?: number;
}

export interface UseAdvancedCapitalAnalysisResult extends AdvancedCapitalAnalysis {
  burnRateAnalysis: BurnRateAnalysis;
  quarterlyRevenue: QuarterlyAmounts;
  quarterlyExpense: QuarterlyAmounts;
  quarterlyInvestment: QuarterlyAmounts;
}

export function useAdvancedCapitalAnalysis({
  revenues,
  expenses,
  investments,
  summary,
  hub,
  safetyMonths = 2.5,
}: UseAdvancedCapitalAnalysisParams): UseAdvancedCapitalAnalysisResult | null {
  return useMemo(() => {
    if (!hub) return null;

    // Calculate quarterly totals
    const quarterlyRevenue = calculateQuarterlyTotals(revenues, true);
    const quarterlyExpense = calculateQuarterlyTotals(expenses, true);
    const quarterlyInvestment = calculateQuarterlyInvestments(investments);

    // 1. Current cash position from balance data
    const bankBalance = hub?.balanceData?.bankBalance || 0;
    const cashOnHand = hub?.balanceData?.cashOnHand || 0;
    
    const currentCash: CurrentCashPosition = {
      bankBalance,
      cashOnHand,
      totalLiquidity: bankBalance + cashOnHand,
    };

    // 2. Working capital calculation
    const monthlyExpense = summary.projected.totalExpense / 12;
    const receivables = hub?.balanceData?.tradeReceivables || 0;
    const payables = hub?.balanceData?.tradePayables || 0;
    
    const workingCapital: WorkingCapitalNeeds = {
      receivables,
      payables,
      inventoryNeeds: 0, // No inventory for service business
      netWorkingCapital: receivables - payables,
      monthlyOperatingCash: monthlyExpense,
      safetyBuffer: monthlyExpense * safetyMonths,
      safetyMonths,
    };

    // 3. Calculate monthly projections
    const monthlyRevenue = summary.projected.totalRevenue / 12;
    
    // Group investments by month
    const investmentsByMonth: Record<number, number> = {};
    investments.forEach(inv => {
      investmentsByMonth[inv.month] = (investmentsByMonth[inv.month] || 0) + inv.amount;
    });

    // Calculate expenses with seasonality (some categories may vary)
    const fixedExpenses = expenses
      .filter(e => isFixedExpense(e.category))
      .reduce((sum, e) => sum + e.projectedAmount, 0);
    const variableExpenses = expenses
      .filter(e => !isFixedExpense(e.category))
      .reduce((sum, e) => sum + e.projectedAmount, 0);
    
    const monthlyFixed = fixedExpenses / 12;
    const monthlyVariable = variableExpenses / 12;

    let runningBalance = currentCash.totalLiquidity;
    const monthlyProjections: CashFlowProjection[] = [];

    for (let month = 1; month <= 12; month++) {
      const openingBalance = runningBalance;
      const revenue = monthlyRevenue;
      const expense = monthlyFixed + monthlyVariable;
      // Note: 'investment' here refers to Capital Expenditure (CapEx) - cash outflow
      // NOT funding inflow from investors. Funding inflow should be added separately if modeled.
      const capex = investmentsByMonth[month] || 0;
      
      // CORRECTED FORMULA: Net Cash Flow = Operating Cash Flow - CapEx
      // Operating Cash Flow = Revenue - Expenses
      // If modeling funding inflow, add it here: + fundingInflow
      const netCashFlow = revenue - expense - capex;
      const closingBalance = openingBalance + netCashFlow;

      monthlyProjections.push({
        month,
        monthName: MONTH_NAMES[month - 1],
        openingBalance,
        revenue,
        expense,
        investment: capex, // Kept as 'investment' for backward compatibility with interface
        netCashFlow,
        closingBalance,
        cumulativeBalance: closingBalance,
      });

      runningBalance = closingBalance;
    }

    // 4. Break-even analysis
    const totalFixed = fixedExpenses;
    const variableRatio = summary.projected.totalRevenue > 0 
      ? variableExpenses / summary.projected.totalRevenue 
      : 0;
    const contributionMargin = 1 - variableRatio;
    const breakEvenRevenue = contributionMargin > 0 ? totalFixed / contributionMargin : 0;
    
    // Find break-even month
    let breakEvenMonth: number | null = null;
    let cumulativeProfit = -investments.reduce((sum, i) => sum + i.amount, 0);
    
    for (let m = 0; m < monthlyProjections.length; m++) {
      cumulativeProfit += monthlyProjections[m].netCashFlow;
      if (cumulativeProfit >= 0 && breakEvenMonth === null) {
        breakEvenMonth = m + 1;
        break;
      }
    }

    const breakEven: BreakEvenAnalysis = {
      monthlyFixedCosts: monthlyFixed,
      variableExpenseRatio: variableRatio,
      contributionMargin,
      breakEvenRevenue,
      breakEvenMonth,
      monthsToBreakEven: breakEvenMonth || 0,
      currentVsRequired: breakEvenRevenue > 0 ? summary.projected.totalRevenue / breakEvenRevenue : 0,
    };

    // 5. Enhanced capital needs
    const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
    const totalCapitalRequired = totalInvestment + workingCapital.safetyBuffer;
    const estimatedProfit = summary.projected.netProfit;
    
    // Find peak cash deficit
    const minProjection = monthlyProjections.reduce(
      (min, p) => p.closingBalance < min.balance ? { balance: p.closingBalance, month: p.month } : min,
      { balance: Infinity, month: null as number | null }
    );

    const peakCashDeficit = minProjection.balance < 0 ? Math.abs(minProjection.balance) : 0;
    const netCapitalGap = Math.max(0, totalCapitalRequired - currentCash.totalLiquidity - estimatedProfit);

    const capitalNeeds: EnhancedCapitalNeeds = {
      totalInvestment,
      workingCapitalNeed: workingCapital.safetyBuffer,
      safetyBuffer: monthlyExpense, // 1 month additional buffer
      totalCapitalRequired,
      availableCash: currentCash.totalLiquidity,
      estimatedProfit,
      netCapitalGap,
      peakCashDeficit,
      deficitMonth: peakCashDeficit > 0 ? minProjection.month : null,
      isSufficient: netCapitalGap <= 0 && peakCashDeficit === 0,
    };

    // 6. Quarterly projections and burn rate analysis
    const quarters: ('Q1' | 'Q2' | 'Q3' | 'Q4')[] = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterKeys: ('q1' | 'q2' | 'q3' | 'q4')[] = ['q1', 'q2', 'q3', 'q4'];

    // Calculate quarterly projections WITH investment
    let quarterlyBalanceWithInv = currentCash.totalLiquidity;
    const quarterlyProjectionsWithInvestment: QuarterlyProjection[] = quarters.map((quarter, idx) => {
      const qKey = quarterKeys[idx];
      const revenue = quarterlyRevenue[qKey];
      const expense = quarterlyExpense[qKey];
      const investment = quarterlyInvestment[qKey];
      const openingBalance = quarterlyBalanceWithInv;
      const netCashFlow = revenue - expense - investment;
      const closingBalance = openingBalance + netCashFlow;
      
      quarterlyBalanceWithInv = closingBalance;
      
      return {
        quarter,
        months: QUARTER_MONTHS[quarter],
        revenue,
        expense,
        investment,
        netCashFlow,
        openingBalance,
        closingBalance,
        cumulativeBurn: investment > 0 ? investment : 0,
      };
    });

    // Calculate quarterly projections WITHOUT investment
    let quarterlyBalanceWithoutInv = currentCash.totalLiquidity;
    const quarterlyProjectionsWithoutInvestment: QuarterlyProjection[] = quarters.map((quarter, idx) => {
      const qKey = quarterKeys[idx];
      const revenue = quarterlyRevenue[qKey];
      const expense = quarterlyExpense[qKey];
      const openingBalance = quarterlyBalanceWithoutInv;
      const netCashFlow = revenue - expense;
      const closingBalance = openingBalance + netCashFlow;
      
      quarterlyBalanceWithoutInv = closingBalance;
      
      return {
        quarter,
        months: QUARTER_MONTHS[quarter],
        revenue,
        expense,
        investment: 0,
        netCashFlow,
        openingBalance,
        closingBalance,
        cumulativeBurn: 0,
      };
    });

    // Calculate burn rate metrics
    const totalRevenue = summary.projected.totalRevenue;
    const totalExpense = summary.projected.totalExpense;
    const grossBurnRate = totalExpense / 12;
    const netBurnRate = (totalExpense - totalRevenue) / 12;
    
    // Find critical quarter (lowest closing balance)
    const minQuarterWithInv = quarterlyProjectionsWithInvestment.reduce(
      (min, p) => p.closingBalance < min.balance ? { balance: p.closingBalance, quarter: p.quarter } : min,
      { balance: Infinity, quarter: null as 'Q1' | 'Q2' | 'Q3' | 'Q4' | null }
    );

    // Calculate year-end position without investment
    const yearEndWithoutInvestment = quarterlyProjectionsWithoutInvestment[3]?.closingBalance || 0;
    const cashDeficitWithoutInvestment = yearEndWithoutInvestment < 0 ? Math.abs(yearEndWithoutInvestment) : 0;
    const cashSurplusWithoutInvestment = yearEndWithoutInvestment > 0 ? yearEndWithoutInvestment : 0;

    // Calculate runway
    const runwayMonths = netBurnRate > 0 
      ? Math.floor(currentCash.totalLiquidity / netBurnRate)
      : 999; // Infinite runway if generating cash

    const burnRateAnalysis: BurnRateAnalysis = {
      monthlyBurnRate: netBurnRate,
      grossBurnRate,
      netBurnRate,
      quarterlyBurn: {
        q1: quarterlyExpense.q1 - quarterlyRevenue.q1,
        q2: quarterlyExpense.q2 - quarterlyRevenue.q2,
        q3: quarterlyExpense.q3 - quarterlyRevenue.q3,
        q4: quarterlyExpense.q4 - quarterlyRevenue.q4,
      },
      runwayMonths,
      runwayEndDate: runwayMonths < 999 
        ? new Date(Date.now() + runwayMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')
        : '',
      cashDeficitWithoutInvestment,
      cashSurplusWithoutInvestment,
      criticalQuarter: minQuarterWithInv.balance < 0 ? minQuarterWithInv.quarter : null,
      quarterlyProjectionsWithInvestment,
      quarterlyProjectionsWithoutInvestment,
    };

    return {
      currentCash,
      workingCapital,
      monthlyProjections,
      breakEven,
      capitalNeeds,
      burnRateAnalysis,
      quarterlyRevenue,
      quarterlyExpense,
      quarterlyInvestment,
    };
  }, [revenues, expenses, investments, summary, hub, safetyMonths]);
}
