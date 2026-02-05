/**
 * Cash Flow Engine
 * Working Capital, 13-Week Cash Forecast, and P&L to Cash Reconciliation
 * 
 * @module cashFlowEngine
 */

import type {
  WorkingCapitalConfigV2,
  TaxFinancingConfig,
  ThirteenWeekCashForecast,
  CashReconciliationBridge,
  QuarterlyAmounts,
} from '@/types/simulation';

// =====================================================
// CASH CONVERSION CYCLE
// =====================================================

/**
 * Calculate Cash Conversion Cycle (CCC)
 * CCC = Days Inventory Outstanding + Days Sales Outstanding - Days Payable Outstanding
 * 
 * A negative CCC means the company gets paid before paying suppliers (good)
 * A positive CCC means capital is tied up in working capital (requires funding)
 */
export const calculateCashConversionCycle = (
  config: WorkingCapitalConfigV2
): number => {
  const inventoryDays = config.inventory_days ?? 0;
  const arDays = config.ar_days;
  const apDays = config.ap_days;
  
  return inventoryDays + arDays - apDays;
};

/**
 * Calculate Net Working Capital from revenue/expense flow
 */
export const calculateNetWorkingCapital = (
  annualRevenue: number,
  annualExpenses: number,
  config: WorkingCapitalConfigV2
): {
  accountsReceivable: number;
  accountsPayable: number;
  inventory: number;
  netWorkingCapital: number;
} => {
  // AR = Daily Revenue × AR Days
  const dailyRevenue = annualRevenue / 365;
  const accountsReceivable = dailyRevenue * config.ar_days;
  
  // AP = Daily Expenses × AP Days
  const dailyExpenses = annualExpenses / 365;
  const accountsPayable = dailyExpenses * config.ap_days;
  
  // Inventory (if applicable)
  const inventory = config.inventory_days 
    ? (dailyExpenses * 0.5) * config.inventory_days // Assume 50% of expenses are COGS-like
    : 0;
  
  // NWC = AR + Inventory - AP
  const netWorkingCapital = accountsReceivable + inventory - accountsPayable;
  
  return {
    accountsReceivable,
    accountsPayable,
    inventory,
    netWorkingCapital,
  };
};

/**
 * Calculate Change in Net Working Capital (ΔNWC)
 * Used in cash flow projections
 */
export const calculateNWCChange = (
  currentYearRevenue: number,
  currentYearExpenses: number,
  priorYearRevenue: number,
  priorYearExpenses: number,
  config: WorkingCapitalConfigV2
): number => {
  const currentNWC = calculateNetWorkingCapital(currentYearRevenue, currentYearExpenses, config);
  const priorNWC = calculateNetWorkingCapital(priorYearRevenue, priorYearExpenses, config);
  
  return currentNWC.netWorkingCapital - priorNWC.netWorkingCapital;
};

// =====================================================
// 13-WEEK CASH FORECAST
// =====================================================

interface WeeklyInputs {
  weeklyRevenue: number;
  weeklyPayroll: number;
  weeklyOtherExpenses: number;
  weeklyDebtService: number;
}

/**
 * Generate 13-Week Cash Forecast
 * Standard treasury tool for short-term liquidity management
 */
export const generate13WeekCashForecast = (
  openingCash: number,
  weeklyInputs: WeeklyInputs,
  config: WorkingCapitalConfigV2,
  startDate: Date = new Date()
): ThirteenWeekCashForecast[] => {
  const forecast: ThirteenWeekCashForecast[] = [];
  let runningBalance = openingCash;
  
  // Calculate collection/payment timing based on days
  const collectionLagWeeks = Math.round(config.ar_days / 7);
  const paymentLagWeeks = Math.round(config.ap_days / 7);
  
  // Revenue queue (delayed by AR days)
  const revenueQueue: number[] = Array(collectionLagWeeks).fill(0);
  
  // Expense queue (delayed by AP days)
  const expenseQueue: number[] = Array(paymentLagWeeks).fill(0);
  
  for (let week = 1; week <= 13; week++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(weekDate.getDate() + (week - 1) * 7);
    const weekLabel = `W${week} (${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    
    // AR Collections: revenue from X weeks ago
    revenueQueue.push(weeklyInputs.weeklyRevenue);
    const arCollections = revenueQueue.shift() ?? 0;
    
    // AP Payments: expenses from X weeks ago
    expenseQueue.push(weeklyInputs.weeklyOtherExpenses);
    const apPayments = expenseQueue.shift() ?? 0;
    
    // Payroll typically paid same week or next week
    const payroll = weeklyInputs.weeklyPayroll;
    
    // Debt service (fixed schedule)
    const debtService = weeklyInputs.weeklyDebtService;
    
    // Other operating (immediate)
    const otherOperating = 0; // Could be utilities, subscriptions, etc.
    
    // Net cash flow
    const netCashFlow = arCollections - apPayments - payroll - debtService - otherOperating;
    
    // Closing balance
    const closingBalance = runningBalance + netCashFlow;
    
    forecast.push({
      week,
      week_label: weekLabel,
      opening_balance: runningBalance,
      ar_collections: arCollections,
      ap_payments: apPayments,
      payroll,
      other_operating: otherOperating,
      debt_service: debtService,
      net_cash_flow: netCashFlow,
      closing_balance: closingBalance,
    });
    
    runningBalance = closingBalance;
  }
  
  return forecast;
};

/**
 * Generate Monthly Cash Forecast (12 months)
 */
export const generateMonthlyCashForecast = (
  openingCash: number,
  monthlyRevenue: number[],
  monthlyExpenses: number[],
  monthlyCapex: number[],
  config: WorkingCapitalConfigV2,
  taxConfig?: TaxFinancingConfig
): {
  month: number;
  monthName: string;
  openingBalance: number;
  collections: number;
  payments: number;
  netOperating: number;
  capex: number;
  taxes: number;
  debtService: number;
  netCashFlow: number;
  closingBalance: number;
}[] => {
  const forecast: ReturnType<typeof generateMonthlyCashForecast> = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let runningBalance = openingCash;
  
  // Collection/payment lag in months
  const collectionLagMonths = Math.max(1, Math.round(config.ar_days / 30));
  const paymentLagMonths = Math.max(1, Math.round(config.ap_days / 30));
  
  // Queues
  const revenueQueue: number[] = Array(collectionLagMonths).fill(0);
  const expenseQueue: number[] = Array(paymentLagMonths).fill(0);
  
  // Tax calculation (quarterly)
  const taxRate = taxConfig?.corporate_tax_rate ?? 0.22;
  const taxLagMonths = Math.round((taxConfig?.tax_payment_lag_days ?? 30) / 30);
  let accumulatedProfit = 0;
  
  for (let month = 0; month < 12; month++) {
    const revenue = monthlyRevenue[month] ?? monthlyRevenue[monthlyRevenue.length - 1] ?? 0;
    const expenses = monthlyExpenses[month] ?? monthlyExpenses[monthlyExpenses.length - 1] ?? 0;
    const capex = monthlyCapex[month] ?? 0;
    
    // Collections (lagged revenue)
    revenueQueue.push(revenue);
    const collections = revenueQueue.shift() ?? 0;
    
    // Payments (lagged expenses)
    expenseQueue.push(expenses);
    const payments = expenseQueue.shift() ?? 0;
    
    // Net operating
    const netOperating = collections - payments;
    
    // Tax (quarterly payment)
    accumulatedProfit += (revenue - expenses);
    let taxes = 0;
    if ((month + 1) % 3 === 0 && accumulatedProfit > 0) {
      taxes = accumulatedProfit * taxRate;
      accumulatedProfit = 0;
    }
    
    // Debt service (from config)
    const debtService = taxConfig?.debt_schedule?.reduce((sum, d) => {
      // Monthly payment = Principal / Months + Interest
      const monthlyInterest = (d.remaining_balance * d.interest_rate) / 12;
      return sum + monthlyInterest;
    }, 0) ?? 0;
    
    // Net cash flow
    const netCashFlow = netOperating - capex - taxes - debtService;
    const closingBalance = runningBalance + netCashFlow;
    
    forecast.push({
      month: month + 1,
      monthName: monthNames[month],
      openingBalance: runningBalance,
      collections,
      payments,
      netOperating,
      capex,
      taxes,
      debtService,
      netCashFlow,
      closingBalance,
    });
    
    runningBalance = closingBalance;
  }
  
  return forecast;
};

// =====================================================
// P&L TO CASH RECONCILIATION
// =====================================================

/**
 * Reconcile P&L to Cash Flow (Indirect Method)
 * Net Income → EBITDA → Operating Cash Flow → Ending Cash
 */
export const reconcilePnLToCash = (
  netIncome: number,
  depreciation: number,
  amortization: number,
  changeInAR: number,
  changeInAP: number,
  changeInInventory: number,
  capex: number,
  debtProceeds: number,
  debtRepayments: number,
  openingCash: number
): CashReconciliationBridge => {
  // Step 1: Net Income to EBITDA
  const ebitda = netIncome + depreciation + amortization;
  
  // Step 2: EBITDA to Operating Cash Flow
  // Increase in AR = cash outflow (we sold but didn't collect)
  // Increase in AP = cash inflow (we bought but didn't pay)
  // Increase in Inventory = cash outflow
  const operatingCashFlow = ebitda - changeInAR + changeInAP - changeInInventory;
  
  // Step 3: Investing Activities
  const investingCashFlow = -capex;
  
  // Step 4: Financing Activities
  const financingCashFlow = debtProceeds - debtRepayments;
  
  // Step 5: Net Change in Cash
  const netChangeInCash = operatingCashFlow + investingCashFlow + financingCashFlow;
  
  // Step 6: Ending Cash
  const endingCash = openingCash + netChangeInCash;
  
  return {
    net_income: netIncome,
    add_depreciation: depreciation,
    add_amortization: amortization,
    ebitda,
    change_in_ar: changeInAR,
    change_in_ap: changeInAP,
    change_in_inventory: changeInInventory,
    operating_cash_flow: operatingCashFlow,
    capex,
    investing_cash_flow: investingCashFlow,
    debt_proceeds: debtProceeds,
    debt_repayments: debtRepayments,
    financing_cash_flow: financingCashFlow,
    net_change_in_cash: netChangeInCash,
    ending_cash: endingCash,
  };
};

/**
 * Generate quarterly cash flow statement
 */
export const generateQuarterlyCashFlow = (
  quarterlyRevenue: QuarterlyAmounts,
  quarterlyExpenses: QuarterlyAmounts,
  openingCash: number,
  config: WorkingCapitalConfigV2,
  annualCapex: number = 0,
  annualDepreciation: number = 0
): {
  quarter: string;
  revenue: number;
  expenses: number;
  operatingProfit: number;
  depreciation: number;
  nwcChange: number;
  operatingCashFlow: number;
  capex: number;
  freeCashFlow: number;
  openingCash: number;
  closingCash: number;
}[] => {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
  const quarterlyData: ReturnType<typeof generateQuarterlyCashFlow> = [];
  let runningCash = openingCash;
  let priorRevenue = 0;
  let priorExpenses = 0;
  
  // Distribute annual values to quarters
  const quarterlyCapex = annualCapex / 4;
  const quarterlyDepreciation = annualDepreciation / 4;
  
  for (const q of quarters) {
    const qKey = q.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    const revenue = quarterlyRevenue[qKey];
    const expenses = quarterlyExpenses[qKey];
    const operatingProfit = revenue - expenses;
    
    // NWC change (simplified - using quarter-over-quarter delta)
    const nwcChange = calculateNWCChange(
      revenue * 4, // Annualize
      expenses * 4,
      priorRevenue * 4,
      priorExpenses * 4,
      config
    ) / 4; // Back to quarterly
    
    const operatingCashFlow = operatingProfit + quarterlyDepreciation - nwcChange;
    const freeCashFlow = operatingCashFlow - quarterlyCapex;
    const closingCash = runningCash + freeCashFlow;
    
    quarterlyData.push({
      quarter: q,
      revenue,
      expenses,
      operatingProfit,
      depreciation: quarterlyDepreciation,
      nwcChange,
      operatingCashFlow,
      capex: quarterlyCapex,
      freeCashFlow,
      openingCash: runningCash,
      closingCash,
    });
    
    runningCash = closingCash;
    priorRevenue = revenue;
    priorExpenses = expenses;
  }
  
  return quarterlyData;
};

// =====================================================
// RUNWAY CALCULATIONS
// =====================================================

/**
 * Calculate runway in months based on cash and burn rate
 */
export const calculateRunwayMonths = (
  currentCash: number,
  monthlyBurnRate: number
): number => {
  if (monthlyBurnRate <= 0) return Infinity; // Cash positive
  return Math.floor(currentCash / monthlyBurnRate);
};

/**
 * Calculate death valley (lowest cash point) from projections
 */
export const findDeathValley = (
  monthlyProjections: { closingBalance: number; month: number }[]
): { minCash: number; month: number } => {
  let minCash = Infinity;
  let minMonth = 0;
  
  for (const proj of monthlyProjections) {
    if (proj.closingBalance < minCash) {
      minCash = proj.closingBalance;
      minMonth = proj.month;
    }
  }
  
  return { minCash, month: minMonth };
};

// =====================================================
// DEFAULT CONFIGURATIONS
// =====================================================

/**
 * Create default working capital config
 */
export const createDefaultWorkingCapitalConfig = (): WorkingCapitalConfigV2 => ({
  ar_days: 45,
  ap_days: 30,
  inventory_days: 0,
  deferred_revenue_days: 0,
});

/**
 * Create default tax financing config
 */
export const createDefaultTaxFinancingConfig = (): TaxFinancingConfig => ({
  corporate_tax_rate: 0.22,
  tax_payment_lag_days: 30,
  vat_withholding_mode: 'monthly',
  debt_schedule: [],
});

/**
 * Generate calculation trace for cash flow
 */
export const generateCashFlowCalcTrace = (
  operation: 'ccc' | '13_week' | 'reconciliation',
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>
): string => {
  switch (operation) {
    case 'ccc':
      return `CCC = ${inputs.arDays} + ${inputs.inventoryDays ?? 0} - ${inputs.apDays} = ${outputs.ccc} days`;
    
    case '13_week':
      return `13-Week Forecast: Opening $${inputs.openingCash} → W13 Closing $${outputs.week13Balance} | Min: $${outputs.minBalance} at W${outputs.minWeek}`;
    
    case 'reconciliation':
      return `P&L → Cash: Net Income $${inputs.netIncome} + D&A $${inputs.da} - ΔNWC $${inputs.nwcChange} - CapEx $${inputs.capex} = Δ Cash $${outputs.netCashChange}`;
    
    default:
      return 'Cash Flow Calculation';
  }
};
