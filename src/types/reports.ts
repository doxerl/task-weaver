// Report Period Types
export type ReportPeriod = 'yearly' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'monthly';

export interface PeriodRange {
  startMonth: number;
  endMonth: number;
}

export const PERIOD_RANGES: Record<ReportPeriod, PeriodRange> = {
  yearly: { startMonth: 1, endMonth: 12 },
  Q1: { startMonth: 1, endMonth: 3 },
  Q2: { startMonth: 4, endMonth: 6 },
  Q3: { startMonth: 7, endMonth: 9 },
  Q4: { startMonth: 10, endMonth: 12 },
  monthly: { startMonth: 1, endMonth: 1 },
};

// Income Statement Line Item
export interface IncomeStatementLine {
  code: string;
  name: string;
  indent: number;
  amount: number;
  previousAmount?: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
  isNegative?: boolean;
}

// Service Revenue Breakdown
export interface ServiceRevenue {
  categoryId: string;
  code: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  byMonth: Record<number, number>;
}

// Expense Category Breakdown
export interface ExpenseCategory {
  categoryId: string;
  code: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
  isFixed: boolean;
  byMonth: Record<number, number>;
}

// Customer Revenue
export interface CustomerRevenue {
  counterparty: string;
  amount: number;
  transactionCount: number;
  percentage: number;
}

// Monthly Data Point
export interface MonthlyDataPoint {
  month: number;
  monthName: string;
  income: number;
  expense: number;
  net: number;
  cumulativeProfit: number;
}

// Partner Transaction
export interface PartnerTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// Financing Summary
export interface FinancingSummary {
  creditUsed: number;
  creditPaid: number;
  leasingPaid: number;
  interestPaid: number;
  remainingDebt: number;
}

// Income Statement Data
export interface IncomeStatementData {
  // A. Gross Sales
  grossSales: {
    sbt: number;
    ls: number;
    zdhc: number;
    danis: number;
    diger: number;
    total: number;
  };
  // B. Sales Returns
  salesReturns: number;
  netSales: number;
  // C. Cost of Sales
  costOfSales: number;
  grossProfit: number;
  // D. Operating Expenses
  operatingExpenses: {
    personel: number;
    kira: number;
    ulasim: number;
    telekom: number;
    sigorta: number;
    ofis: number;
    muhasebe: number;
    yazilim: number;
    banka: number;
    diger: number;
    total: number;
  };
  operatingProfit: number; // EBIT
  // E. Other Income
  otherIncome: {
    faiz: number;
    kurFarki: number;
    total: number;
  };
  // F. Other Expenses
  otherExpenses: {
    faiz: number;
    kurFarki: number;
    total: number;
  };
  // Pre-tax Profit
  preTaxProfit: number;
  // G. Tax
  taxExpense: number;
  // Net Profit
  netProfit: number;
  // Margins
  profitMargin: number;
  ebitMargin: number;
  grossMargin: number;
}

// KPI Card Data
export interface KpiData {
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'neutral';
}

// Full Report Data for PDF Export
export interface FullReportData {
  year: number;
  period: ReportPeriod;
  generatedAt: string;
  kpis: {
    totalIncome: KpiData;
    totalExpenses: KpiData;
    netProfit: KpiData;
    profitMargin: KpiData;
  };
  monthlyData: MonthlyDataPoint[];
  serviceRevenue: ServiceRevenue[];
  expenseCategories: ExpenseCategory[];
  incomeStatement: IncomeStatementData;
  partnerAccount: {
    transactions: PartnerTransaction[];
    totalDebit: number;
    totalCredit: number;
    balance: number;
  };
  financing: FinancingSummary;
}

// Chart Colors
export const CHART_COLORS = {
  income: 'hsl(142, 76%, 36%)', // green-600
  expense: 'hsl(0, 84%, 60%)', // red-500
  net: 'hsl(221, 83%, 53%)', // blue-500
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted))',
  services: [
    'hsl(221, 83%, 53%)', // blue
    'hsl(142, 76%, 36%)', // green
    'hsl(45, 93%, 47%)', // amber
    'hsl(280, 87%, 60%)', // purple
    'hsl(0, 84%, 60%)', // red
  ],
};

// Month names in Turkish
export const MONTH_NAMES_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const MONTH_NAMES_SHORT_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
];
