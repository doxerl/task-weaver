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
} from '@/types/simulation';
import { FinancialDataHub } from './useFinancialDataHub';

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

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

interface UseAdvancedCapitalAnalysisParams {
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  summary: SimulationSummary;
  hub: FinancialDataHub | null;
  safetyMonths?: number;
}

export function useAdvancedCapitalAnalysis({
  revenues,
  expenses,
  investments,
  summary,
  hub,
  safetyMonths = 2.5,
}: UseAdvancedCapitalAnalysisParams): AdvancedCapitalAnalysis {
  return useMemo(() => {
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
      const investment = investmentsByMonth[month] || 0;
      const netCashFlow = revenue - expense - investment;
      const closingBalance = openingBalance + netCashFlow;

      monthlyProjections.push({
        month,
        monthName: MONTH_NAMES[month - 1],
        openingBalance,
        revenue,
        expense,
        investment,
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

    return {
      currentCash,
      workingCapital,
      monthlyProjections,
      breakEven,
      capitalNeeds,
    };
  }, [revenues, expenses, investments, summary, hub, safetyMonths]);
}
