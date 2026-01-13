export type CategoryType = 'INCOME' | 'EXPENSE' | 'PARTNER' | 'FINANCING' | 'INVESTMENT' | 'EXCLUDED';

export type CostCenter = 'DELIVERY' | 'ADMIN' | 'SALES' | null;

export interface TransactionCategory {
  id: string;
  user_id: string | null;
  name: string;
  code: string;
  type: CategoryType;
  color: string;
  icon: string;
  keywords: string[];
  vendor_patterns: string[];
  is_financing: boolean;
  is_excluded: boolean;
  affects_partner_account: boolean;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  // Tekdüzen Hesap Planı fields
  account_code: string | null;      // e.g., '600', '622', '632'
  account_subcode: string | null;   // e.g., '632.01', '632.02'
  cost_center: CostCenter;          // DELIVERY, ADMIN, SALES
  is_kkeg: boolean;                 // Kanunen Kabul Edilmeyen Gider
  // Parent-child relationship for sub-categories
  parent_category_id: string | null;
  depth: number;
  // Virtual property for children (populated client-side)
  children?: TransactionCategory[];
}

export interface UploadedBankFile {
  id: string;
  user_id: string;
  file_name: string;
  file_type: 'pdf' | 'xlsx' | 'xls';
  file_size?: number;
  file_url?: string;
  bank_name?: string;
  period_start?: string;
  period_end?: string;
  total_transactions: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  processing_error?: string;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  file_id: string;
  user_id: string;
  row_number?: number;
  raw_date?: string;
  raw_description?: string;
  raw_amount?: string;
  transaction_date: string;
  description: string;
  amount: number;
  balance?: number;
  category_id?: string;
  category?: TransactionCategory;
  ai_suggested_category_id?: string;
  ai_confidence: number;
  is_manually_categorized: boolean;
  is_income: boolean;
  is_excluded: boolean;
  reference_no?: string;
  counterparty?: string;
  notes?: string;
  created_at: string;
  // VAT separation fields
  net_amount?: number;
  vat_amount?: number;
  vat_rate?: number;
  is_commercial?: boolean;
}

export interface ReceiptTransactionMatch {
  id: string;
  receipt_id: string;
  bank_transaction_id: string;
  match_type: 'full' | 'partial' | 'vat_only';
  matched_amount: number;
  is_auto_suggested: boolean;
  is_confirmed: boolean;
  created_at: string;
  user_id: string;
}

export type DocumentType = 'received' | 'issued';
export type ReceiptSubtype = 'slip' | 'invoice';
export type MatchStatus = 'unmatched' | 'suggested' | 'matched' | 'manual';

export interface Receipt {
  id: string;
  user_id: string;
  file_name: string;
  file_type: 'image' | 'pdf';
  file_url: string;
  thumbnail_url?: string;
  ocr_raw_text?: string;
  ocr_confidence: number;
  
  // Document type
  document_type: DocumentType;
  receipt_subtype?: ReceiptSubtype;
  
  // Seller (issuer) information
  seller_name?: string;
  seller_tax_no?: string;
  seller_address?: string;
  
  // Buyer (recipient) information
  buyer_name?: string;
  buyer_tax_no?: string;
  buyer_address?: string;
  
  // Legacy fields (kept for compatibility)
  vendor_name?: string;
  vendor_tax_no?: string;
  
  receipt_date?: string;
  receipt_no?: string;
  
  // Detailed amounts
  subtotal?: number;
  total_amount?: number;
  tax_amount?: number;
  
  // Tax breakdown
  vat_rate?: number;
  vat_amount?: number;
  withholding_tax_rate?: number;
  withholding_tax_amount?: number;
  stamp_tax_amount?: number;
  
  currency: string;
  category_id?: string;
  category?: TransactionCategory;
  ai_suggested_category_id?: string;
  is_manually_categorized: boolean;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  is_verified: boolean;
  is_included_in_report: boolean;
  
  // Bank transaction matching
  linked_bank_transaction_id?: string;
  match_status: MatchStatus;
  match_confidence: number;
  
  month?: number;
  year?: number;
  notes?: string;
  created_at: string;
}

export interface FinancialReport {
  id: string;
  user_id: string;
  report_name: string;
  report_year: number;
  report_month?: number;
  total_income: number;
  total_expenses: number;
  total_receipt_expenses: number;
  operating_profit: number;
  profit_margin: number;
  partner_withdrawals: number;
  partner_deposits: number;
  net_partner_balance: number;
  total_financing_in: number;
  report_data?: Record<string, any>;
  pdf_url?: string;
  created_at: string;
}

export interface FinancialCalculations {
  totalIncome: number;
  totalExpenses: number;
  operatingProfit: number;
  profitMargin: number;
  partnerOut: number;
  partnerIn: number;
  netPartnerBalance: number;
  financingIn: number;
  financingOut: number;
  investmentOut: number;
  receiptTotal: number;
  byCategory: Record<string, { income: number; expense: number; name: string; color: string }>;
  byMonth: Record<number, { income: number; expense: number }>;
  byInvestmentType: Record<string, { amount: number; name: string; code: string }>;
  uncategorizedCount: number;
  // VAT calculations
  calculatedVat: number;
  deductibleVat: number;
  netVatPayable: number;
  netRevenue: number;
  netCost: number;
}

export type BalanceImpact = 'equity_increase' | 'equity_decrease' | 'asset_increase' | 'liability_increase' | 'none';

export interface ParsedTransaction {
  index: number;
  row_number: number;
  date: string;
  original_date: string;
  description: string;
  amount: number;
  original_amount: string;
  balance: number | null;
  reference: string | null;
  counterparty: string | null;
  transaction_type: string;
  channel: string | null;
  needs_review: boolean;
  confidence: number;
  suggestedCategoryId?: string | null;
  aiConfidence?: number;
  // AI category code for debugging
  aiCategoryCode?: string;
  // New AI categorization fields
  aiReasoning?: string;
  affectsPnl?: boolean;
  balanceImpact?: BalanceImpact;
  // Manual amount editing fields
  isAmountManuallyChanged?: boolean;
  originalAmountValue?: number;
  // Excel label column (if available)
  excelLabel?: string;
}

export interface ParseSummary {
  total_rows_in_file: number;
  header_rows_skipped: number;
  footer_rows_skipped: number;
  empty_rows_skipped: number;
  transaction_count: number;
  needs_review_count: number;
  total_income: number;
  total_expense: number;
  date_range: { start: string; end: string };
}

export interface BankInfo {
  detected_bank: string | null;
  account_number: string | null;
  iban: string | null;
  currency: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  summary: ParseSummary;
  bank_info: BankInfo;
}

export interface CategorizationResult {
  index: number;
  categoryCode: string;
  categoryType: CategoryType;
  confidence: number;
  reasoning: string;
  counterparty: string | null;
  affects_pnl: boolean;
  balance_impact: BalanceImpact;
}

// Legacy interface for backwards compatibility
export interface CategoryResult {
  index: number;
  categoryCode: string;
  confidence: number;
}

// Financial Settings
export interface FinancialSettings {
  id: string;
  user_id: string;
  paid_capital: number;
  retained_earnings: number;
  fiscal_year_start: number;
  cash_on_hand: number;
  inventory_value: number;
  equipment_value: number;        // Demirbaşlar (geçmiş)
  vehicles_value: number;         // Taşıtlar (geçmiş)
  accumulated_depreciation: number;
  bank_loans: number;
  trade_receivables: number;      // Ticari Alacaklar - Manuel giriş
  trade_payables: number;         // Ticari Borçlar - Manuel giriş
  // New fields for detailed balance sheet
  unpaid_capital: number;         // Ödenmemiş Sermaye (-)
  legal_reserves: number;         // Yasal Yedekler
  other_vat: number;              // Diğer KDV
  personnel_payables: number;     // Personele Borçlar
  tax_payables: number;           // Ödenecek Vergi ve Fonlar
  social_security_payables: number; // Ödenecek SGK Kesintileri
  deferred_tax_liabilities: number; // Vadesi Geçmiş Ert. Vergi
  calculated_vat_payable: number; // Hesaplanan KDV
  fixtures_value: number;         // Demirbaşlar (yeni alan)
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Balance Sheet calculated structure
export interface BalanceSheet {
  asOfDate: string;
  year: number;
  
  // Aktif (Assets)
  currentAssets: {
    cash: number;
    banks: number;
    receivables: number;
    partnerReceivables: number;  // Ortaklardan Alacaklar
    vatReceivable: number;  // İndirilecek KDV
    otherVat?: number;      // Diğer KDV
    inventory: number;
    prepaidExpenses: number;
    total: number;
  };
  fixedAssets: {
    equipment: number;
    vehicles: number;
    depreciation: number;
    total: number;
  };
  totalAssets: number;
  
  // Pasif (Liabilities + Equity)
  shortTermLiabilities: {
    payables: number;
    vatPayable: number;
    taxPayable: number;
    partnerPayables: number;
    personnelPayables?: number;
    taxPayables?: number;
    socialSecurityPayables?: number;
    loanInstallments: number;  // Önümüzdeki 12 ay içinde ödenecek kredi taksitleri
    total: number;
  };
  longTermLiabilities: {
    bankLoans: number;
    total: number;
  };
  equity: {
    paidCapital: number;
    retainedEarnings: number;
    currentProfit: number;
    total: number;
  };
  totalLiabilities: number;
  
  // Balance check
  isBalanced: boolean;
  difference: number;
}

// =====================================================
// BANK IMPORT SESSION TYPES
// =====================================================

export type ImportSessionStatus = 'parsing' | 'categorizing' | 'review' | 'approved' | 'cancelled';

export interface BankImportSession {
  id: string;
  user_id: string;
  file_name: string;
  file_hash: string | null;
  file_id: string | null;
  status: ImportSessionStatus;
  total_transactions: number;
  categorized_count: number;
  low_confidence_count: number;
  total_income: number;
  total_expense: number;
  detected_bank: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  ai_tokens_used: number;
  ai_cost_usd: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface BankImportTransaction {
  id: string;
  session_id: string;
  user_id: string;
  row_number: number;
  transaction_date: string;
  original_date: string | null;
  description: string;
  amount: number;
  original_amount: string | null;
  balance: number | null;
  reference: string | null;
  counterparty: string | null;
  transaction_type: string | null;
  channel: string | null;
  ai_category_code: string | null;
  ai_category_type: string | null;
  ai_confidence: number;
  ai_reasoning: string | null;
  ai_affects_pnl: boolean | null;
  ai_balance_impact: string | null;
  ai_counterparty: string | null;
  user_category_id: string | null;
  user_modified: boolean;
  user_notes: string | null;
  final_category_id: string | null;
  needs_review: boolean;
  reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// BATCH PROCESSING TYPES
// =====================================================

export interface FailedBatch {
  batchIndex: number;
  rowRange: { start: number; end: number };
  error: string;
  retryCount: number;
}

export interface BatchProcessingResult {
  transactions: ParsedTransaction[];
  failedBatches: FailedBatch[];
  expectedRowCount: number;
  actualRowCount: number;
}
