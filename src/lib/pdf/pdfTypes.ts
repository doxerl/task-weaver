// ============================================
// MERKEZI PDF ENGINE - TIP TANIMLARI
// ============================================

import type { BalanceSheet } from '@/types/finance';
import type { 
  DetailedIncomeStatementData, 
  IncomeStatementData, 
  IncomeStatementLine,
  FullReportData,
  MonthlyDataPoint 
} from '@/types/reports';
import type { VatCalculations } from '@/hooks/finance/useVatCalculations';

// ============================================
// ENGINE CONFIGURATION
// ============================================

export type PdfOrientation = 'portrait' | 'landscape';
export type PdfFormat = 'a4' | 'letter';
export type PdfCurrency = 'TRY' | 'USD';
export type PdfLanguage = 'tr' | 'en';

export interface PdfEngineConfig {
  orientation: PdfOrientation;
  format: PdfFormat;
  currency: PdfCurrency;
  language: PdfLanguage;
  companyName?: string;
  yearlyAverageRate?: number | null;
  margin?: number;
  year?: number;
}

// ============================================
// DATA TYPES FOR SECTIONS
// ============================================

// Re-export for convenience
export type BalanceSheetData = BalanceSheet;
export type { IncomeStatementData, IncomeStatementLine };
export type VatReportData = VatCalculations;

export interface SimulationData {
  scenarioName: string;
  baseYear: number;
  targetYear: number;
  revenues: any[];
  expenses: any[];
  investments: any[];
  summary: any;
  assumedExchangeRate: number;
  notes?: string;
}

export const DEFAULT_CONFIG: PdfEngineConfig = {
  orientation: 'portrait',
  format: 'a4',
  currency: 'TRY',
  language: 'tr',
  margin: 15,
};

// ============================================
// SECTION TYPES
// ============================================

export type PdfSectionType = 
  | 'cover'
  | 'balance-sheet'
  | 'balance-sheet-single'
  | 'income-statement'
  | 'detailed-income-statement'
  | 'vat-report'
  | 'simulation'
  | 'monthly-trend'
  | 'financing-summary'
  | 'table'
  | 'chart'
  | 'text';

export interface PdfSectionBase {
  type: PdfSectionType;
  title?: string;
  newPage?: boolean;
}

// Cover Section
export interface CoverSection extends PdfSectionBase {
  type: 'cover';
  data: {
    title: string;
    subtitle?: string;
    date?: string;
    tableOfContents?: string[];
  };
}

// Balance Sheet Section
export interface BalanceSheetSection extends PdfSectionBase {
  type: 'balance-sheet' | 'balance-sheet-single';
  data: BalanceSheet;
  options?: {
    year: number;
    layout?: 'summary' | 'detailed' | 'side-by-side';
  };
}

// Income Statement Section
export interface IncomeStatementSection extends PdfSectionBase {
  type: 'income-statement';
  data: {
    statement: IncomeStatementData;
    lines: IncomeStatementLine[];
    year: number;
  };
}

// Detailed Income Statement Section
export interface DetailedIncomeStatementSection extends PdfSectionBase {
  type: 'detailed-income-statement';
  data: DetailedIncomeStatementData;
}

// VAT Report Section
export interface VatReportSection extends PdfSectionBase {
  type: 'vat-report';
  data: VatCalculations;
  options?: {
    year: number;
  };
}

// Simulation Section
export interface SimulationSection extends PdfSectionBase {
  type: 'simulation';
  data: {
    scenarioName: string;
    revenues: any[];
    expenses: any[];
    investments: any[];
    summary: any;
    assumedExchangeRate: number;
    notes?: string;
  };
}

// Monthly Trend Section
export interface MonthlyTrendSection extends PdfSectionBase {
  type: 'monthly-trend';
  data: MonthlyDataPoint[];
  options?: {
    year: number;
  };
}

// Financing Summary Section
export interface FinancingSummarySection extends PdfSectionBase {
  type: 'financing-summary';
  data: {
    partnerDeposits: number;
    partnerWithdrawals: number;
    partnerBalance: number;
    creditIn: number;
    creditOut: number;
    leasingOut: number;
    remainingDebt: number;
  };
}

// Generic Table Section
export interface TableSection extends PdfSectionBase {
  type: 'table';
  data: {
    headers: string[];
    rows: (string | number)[][];
    headerColor?: [number, number, number];
  };
}

// Generic Text Section
export interface TextSection extends PdfSectionBase {
  type: 'text';
  data: {
    content: string;
    fontSize?: number;
    align?: 'left' | 'center' | 'right';
  };
}

// Union type for all sections
export type PdfSection = 
  | CoverSection
  | BalanceSheetSection
  | IncomeStatementSection
  | DetailedIncomeStatementSection
  | VatReportSection
  | SimulationSection
  | MonthlyTrendSection
  | FinancingSummarySection
  | TableSection
  | TextSection;

// ============================================
// DOCUMENT TYPE
// ============================================

export interface PdfDocument {
  filename: string;
  config: Partial<PdfEngineConfig>;
  sections: PdfSection[];
}

// ============================================
// PROGRESS TRACKING
// ============================================

export interface PdfProgress {
  current: number;
  total: number;
  stage: string;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface PdfEngineReturn {
  // Generic generator
  generatePdf: (document: PdfDocument) => Promise<void>;
  
  // Pre-configured generators
  generateBalanceSheetPdf: (
    balanceSheet: BalanceSheet,
    year: number,
    options?: {
      currency?: PdfCurrency;
      layout?: 'summary' | 'detailed' | 'single-page';
      yearlyAverageRate?: number | null;
    }
  ) => Promise<void>;
  
  generateIncomeStatementPdf: (
    statement: IncomeStatementData,
    lines: IncomeStatementLine[],
    year: number,
    options?: {
      currency?: PdfCurrency;
      yearlyAverageRate?: number | null;
    }
  ) => Promise<void>;
  
  generateDetailedIncomeStatementPdf: (
    data: DetailedIncomeStatementData,
    options?: {
      currency?: PdfCurrency;
      yearlyAverageRate?: number | null;
    }
  ) => Promise<void>;
  
  generateVatReportPdf: (
    vatData: VatCalculations,
    year: number,
    options?: {
      currency?: PdfCurrency;
    }
  ) => Promise<void>;
  
  generateSimulationPdf: (
    data: any,
    options?: {
      companyName?: string;
    }
  ) => Promise<void>;
  
  generateFullReportPdf: (
    data: FullReportData,
    additionalData: any,
    options?: {
      currency?: PdfCurrency;
      yearlyAverageRate?: number | null;
    }
  ) => Promise<void>;
  
  // State
  isGenerating: boolean;
  progress: PdfProgress;
}

// ============================================
// TABLE STYLES
// ============================================

export interface TableStyles {
  headerColor: [number, number, number];
  headerTextColor: [number, number, number];
  fontSize: number;
  cellPadding: number;
  theme: 'grid' | 'striped' | 'plain';
}

export const DEFAULT_TABLE_STYLES: TableStyles = {
  headerColor: [59, 130, 246],
  headerTextColor: [255, 255, 255],
  fontSize: 9,
  cellPadding: 2,
  theme: 'grid',
};

// ============================================
// COLOR PRESETS
// ============================================

export const PDF_COLORS = {
  primary: [59, 130, 246] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  info: [14, 165, 233] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};
