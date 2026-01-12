export type CategoryType = 'INCOME' | 'EXPENSE' | 'PARTNER' | 'FINANCING' | 'INVESTMENT' | 'EXCLUDED';

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
}

export type DocumentType = 'received' | 'issued';
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
  receiptTotal: number;
  byCategory: Record<string, { income: number; expense: number; name: string; color: string }>;
  byMonth: Record<number, { income: number; expense: number }>;
  uncategorizedCount: number;
}

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
}

export interface CategoryResult {
  index: number;
  categoryCode: string;
  confidence: number;
}
