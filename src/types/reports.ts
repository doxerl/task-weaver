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

// Income Statement Data - Tekdüzen Hesap Planı Format
export interface IncomeStatementData {
  // A - BRÜT SATIŞLAR (60x)
  grossSales: {
    yurtici: number;        // 600 - Yurtiçi Satışlar
    yurtdisi: number;       // 601 - Yurtdışı Satışlar
    diger: number;          // 602 - Diğer Gelirler
    total: number;
    // Legacy fields for compatibility
    sbt: number;
    ls: number;
    zdhc: number;
    danis: number;
  };
  
  // B - SATIŞ İNDİRİMLERİ (61x)
  salesReturns: number;     // 610 - Satıştan İadeler
  
  // C - NET SATIŞLAR
  netSales: number;
  
  // D - SATIŞLARIN MALİYETİ (62x)
  costOfSales: number;      // 622 - Satılan Hizmet Maliyeti
  
  // BRÜT KAR
  grossProfit: number;
  
  // E - FAALİYET GİDERLERİ (63x)
  operatingExpenses: {
    pazarlama: number;      // 631 - Pazarlama Satış Dağıtım
    genelYonetim: number;   // 632 - Genel Yönetim Giderleri
    total: number;
    // Legacy fields for compatibility
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
  };
  
  // FAALİYET KARI (EBIT)
  operatingProfit: number;
  
  // F - DİĞER FAALİYET GELİRLERİ (64x)
  otherIncome: {
    faiz: number;           // 642 - Faiz Gelirleri
    kurFarki: number;       // 646 - Kambiyo Karları
    diger: number;          // 649 - Diğer Olağan Gelirler
    total: number;
  };
  
  // 65x - DİĞER FAALİYET GİDERLERİ
  otherExpenses: {
    komisyon: number;       // 653 - Komisyon Giderleri
    kurFarki: number;       // 656 - Kambiyo Zararları
    diger: number;          // 659 - Diğer Olağan Giderler
    faiz: number;           // Legacy compatibility
    total: number;
  };
  
  // H - FİNANSMAN GİDERLERİ (66x)
  financeExpenses: number;  // 660 - Kısa Vadeli Borçlanma Giderleri
  
  // OLAĞAN KAR
  ordinaryProfit: number;
  
  // I - OLAĞANDIŞI GELİRLER (67x)
  extraordinaryIncome: number;  // 679
  
  // J - OLAĞANDIŞI GİDERLER (68x)
  extraordinaryExpenses: number; // 689
  
  // DÖNEM KARI
  preTaxProfit: number;
  
  // K - VERGİ (69x)
  taxExpense: number;       // 691 - Dönem Karı Vergi Karşılığı
  
  // DÖNEM NET KARI
  netProfit: number;
  
  // Margins
  profitMargin: number;
  ebitMargin: number;
  grossMargin: number;
  
  // KKEG Özeti (ek bilgi)
  kkegTotal: number;
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

// Detailed Income Statement Types (Resmi Format)
export interface DetailedIncomeStatementLine {
  code: string;
  name: string;
  subAmount?: number;
  totalAmount?: number;
  isHeader?: boolean;
  isSubItem?: boolean;
  isNegative?: boolean;
  isBold?: boolean;
}

export interface DetailedIncomeStatementData {
  companyName: string;
  periodStart: string;
  periodEnd: string;
  year: number;
  lines: DetailedIncomeStatementLine[];
}
