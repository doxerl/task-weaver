// Types for official financial data (Mizan, Income Statement, Balance Sheet)

export interface YearlyIncomeStatement {
  id: string;
  user_id: string;
  year: number;
  is_locked: boolean;
  
  // 60x Brüt Satışlar
  gross_sales_domestic: number;  // 600 Yurtiçi Satışlar
  gross_sales_export: number;    // 601 Yurtdışı Satışlar
  gross_sales_other: number;     // 602 Diğer Gelirler
  
  // 61x Satış İndirimleri
  sales_returns: number;         // 610 Satıştan İadeler
  sales_discounts: number;       // 611 Satış İskontoları
  
  // 62x Satışların Maliyeti
  cost_of_goods_sold: number;        // 620 Satılan Mamul Maliyeti
  cost_of_merchandise_sold: number;  // 621 Satılan Ticari Mal Maliyeti
  cost_of_services_sold: number;     // 622 Satılan Hizmet Maliyeti
  
  // 63x Faaliyet Giderleri
  rd_expenses: number;           // 630 Ar-Ge Giderleri
  marketing_expenses: number;    // 631 Pazarlama Satış Dağıtım
  general_admin_expenses: number;// 632 Genel Yönetim Giderleri
  
  // 64x Diğer Faaliyet Gelirleri
  dividend_income: number;       // 640 İştiraklerden Temettü
  interest_income: number;       // 642 Faiz Gelirleri
  commission_income: number;     // 643 Komisyon Gelirleri
  fx_gain: number;               // 646 Kambiyo Karları
  revaluation_gain: number;      // 647 Reeskont Faiz Gelirleri
  other_income: number;          // 649 Diğer Olağan Gelirler
  
  // 65x Diğer Faaliyet Giderleri
  commission_expenses: number;   // 653 Komisyon Giderleri
  provisions_expense: number;    // 654 Karşılık Giderleri
  fx_loss: number;               // 656 Kambiyo Zararları
  revaluation_loss: number;      // 657 Reeskont Faiz Giderleri
  other_expenses: number;        // 659 Diğer Olağan Giderler
  
  // 66x Finansman Giderleri
  short_term_finance_exp: number;// 660 Kısa Vadeli Borçlanma
  long_term_finance_exp: number; // 661 Uzun Vadeli Borçlanma
  
  // 67x Olağandışı Gelirler
  prior_period_income: number;   // 671 Önceki Dönem Gelir/Karları
  other_extraordinary_income: number; // 679 Diğer Olağandışı Gelirler
  
  // 68x Olağandışı Giderler
  prior_period_expenses: number; // 681 Önceki Dönem Gider/Zararları
  other_extraordinary_exp: number; // 689 Diğer Olağandışı Giderler
  
  // 69x Dönem Net Karı/Zararı
  corporate_tax: number;         // 691 Dönem Karı Vergi Karşılığı
  deferred_tax_expense: number;  // 692 Ertelenmiş Vergi Gideri
  
  // Calculated totals
  net_sales: number;
  gross_profit: number;
  operating_profit: number;
  net_profit: number;
  
  notes: string | null;
  source: 'manual' | 'mizan_upload' | 'api';
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalanceAccount {
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
  subAccounts?: SubAccount[];
}

export interface OfficialTrialBalance {
  id: string;
  user_id: string;
  year: number;
  month: number | null;
  accounts: Record<string, TrialBalanceAccount>;
  file_name: string | null;
  file_url: string | null;
  uploaded_at: string;
  is_approved: boolean;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Form data type for upsert operations
export type YearlyIncomeStatementFormData = Omit<
  YearlyIncomeStatement, 
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

// Account code mapping for income statement
export const INCOME_STATEMENT_ACCOUNT_MAP: Record<string, keyof YearlyIncomeStatement> = {
  '600': 'gross_sales_domestic',
  '601': 'gross_sales_export',
  '602': 'gross_sales_other',
  '610': 'sales_returns',
  '611': 'sales_discounts',
  '620': 'cost_of_goods_sold',
  '621': 'cost_of_merchandise_sold',
  '622': 'cost_of_services_sold',
  '630': 'rd_expenses',
  '631': 'marketing_expenses',
  '632': 'general_admin_expenses',
  '640': 'dividend_income',
  '642': 'interest_income',
  '643': 'commission_income',
  '646': 'fx_gain',
  '647': 'revaluation_gain',
  '649': 'other_income',
  '653': 'commission_expenses',
  '654': 'provisions_expense',
  '656': 'fx_loss',
  '657': 'revaluation_loss',
  '659': 'other_expenses',
  '660': 'short_term_finance_exp',
  '661': 'long_term_finance_exp',
  '671': 'prior_period_income',
  '679': 'other_extraordinary_income',
  '681': 'prior_period_expenses',
  '689': 'other_extraordinary_exp',
  '691': 'corporate_tax',
  '692': 'deferred_tax_expense',
};

// Account groups for display
export const INCOME_STATEMENT_GROUPS = [
  {
    title: 'BRÜT SATIŞLAR (60x)',
    accounts: [
      { code: '600', name: 'Yurtiçi Satışlar', field: 'gross_sales_domestic' },
      { code: '601', name: 'Yurtdışı Satışlar', field: 'gross_sales_export' },
      { code: '602', name: 'Diğer Gelirler', field: 'gross_sales_other' },
    ],
  },
  {
    title: 'SATIŞ İNDİRİMLERİ (61x)',
    accounts: [
      { code: '610', name: 'Satıştan İadeler', field: 'sales_returns' },
      { code: '611', name: 'Satış İskontoları', field: 'sales_discounts' },
    ],
  },
  {
    title: 'SATIŞLARIN MALİYETİ (62x)',
    accounts: [
      { code: '620', name: 'Satılan Mamul Maliyeti', field: 'cost_of_goods_sold' },
      { code: '621', name: 'Satılan Ticari Mal Maliyeti', field: 'cost_of_merchandise_sold' },
      { code: '622', name: 'Satılan Hizmet Maliyeti', field: 'cost_of_services_sold' },
    ],
  },
  {
    title: 'FAALİYET GİDERLERİ (63x)',
    accounts: [
      { code: '630', name: 'Ar-Ge Giderleri', field: 'rd_expenses' },
      { code: '631', name: 'Pazarlama Satış Dağıtım', field: 'marketing_expenses' },
      { code: '632', name: 'Genel Yönetim Giderleri', field: 'general_admin_expenses' },
    ],
  },
  {
    title: 'DİĞER FAALİYET GELİRLERİ (64x)',
    accounts: [
      { code: '640', name: 'İştiraklerden Temettü', field: 'dividend_income' },
      { code: '642', name: 'Faiz Gelirleri', field: 'interest_income' },
      { code: '643', name: 'Komisyon Gelirleri', field: 'commission_income' },
      { code: '646', name: 'Kambiyo Karları', field: 'fx_gain' },
      { code: '647', name: 'Reeskont Faiz Gelirleri', field: 'revaluation_gain' },
      { code: '649', name: 'Diğer Olağan Gelirler', field: 'other_income' },
    ],
  },
  {
    title: 'DİĞER FAALİYET GİDERLERİ (65x)',
    accounts: [
      { code: '653', name: 'Komisyon Giderleri', field: 'commission_expenses' },
      { code: '654', name: 'Karşılık Giderleri', field: 'provisions_expense' },
      { code: '656', name: 'Kambiyo Zararları', field: 'fx_loss' },
      { code: '657', name: 'Reeskont Faiz Giderleri', field: 'revaluation_loss' },
      { code: '659', name: 'Diğer Olağan Giderler', field: 'other_expenses' },
    ],
  },
  {
    title: 'FİNANSMAN GİDERLERİ (66x)',
    accounts: [
      { code: '660', name: 'Kısa Vadeli Borçlanma', field: 'short_term_finance_exp' },
      { code: '661', name: 'Uzun Vadeli Borçlanma', field: 'long_term_finance_exp' },
    ],
  },
  {
    title: 'OLAĞANDIŞI GELİRLER (67x)',
    accounts: [
      { code: '671', name: 'Önceki Dönem Gelir/Karları', field: 'prior_period_income' },
      { code: '679', name: 'Diğer Olağandışı Gelirler', field: 'other_extraordinary_income' },
    ],
  },
  {
    title: 'OLAĞANDIŞI GİDERLER (68x)',
    accounts: [
      { code: '681', name: 'Önceki Dönem Gider/Zararları', field: 'prior_period_expenses' },
      { code: '689', name: 'Diğer Olağandışı Giderler', field: 'other_extraordinary_exp' },
    ],
  },
  {
    title: 'VERGİ KARŞILIKLARI (69x)',
    accounts: [
      { code: '691', name: 'Dönem Karı Vergi Karşılığı', field: 'corporate_tax' },
      { code: '692', name: 'Ertelenmiş Vergi Gideri', field: 'deferred_tax_expense' },
    ],
  },
] as const;

// Balance sheet account groups for display
export interface BalanceSheetAccountDef {
  code: string;
  name: string;
  field: string;
  isNegative?: boolean;
}

export interface BalanceSheetGroup {
  title: string;
  type: 'asset' | 'liability' | 'equity';
  accounts: BalanceSheetAccountDef[];
}

export const BALANCE_SHEET_GROUPS: BalanceSheetGroup[] = [
  {
    title: 'DÖNEN VARLIKLAR (1xx)',
    type: 'asset',
    accounts: [
      { code: '100', name: 'Kasa', field: 'cash_on_hand' },
      { code: '102', name: 'Bankalar', field: 'bank_balance' },
      { code: '120', name: 'Alıcılar', field: 'trade_receivables' },
      { code: '131', name: 'Ortaklardan Alacaklar', field: 'partner_receivables' },
      { code: '190', name: 'Devreden KDV', field: 'vat_receivable' },
      { code: '191', name: 'İndirilecek KDV', field: 'other_vat' },
      { code: '150', name: 'Stoklar', field: 'inventory' },
    ],
  },
  {
    title: 'DURAN VARLIKLAR (2xx)',
    type: 'asset',
    accounts: [
      { code: '254', name: 'Taşıtlar', field: 'vehicles' },
      { code: '255', name: 'Demirbaşlar', field: 'fixtures' },
      { code: '256', name: 'Makine ve Cihazlar', field: 'equipment' },
      { code: '257', name: 'Birikmiş Amortisman (-)', field: 'accumulated_depreciation', isNegative: true },
    ],
  },
  {
    title: 'KISA VADELİ BORÇLAR (3xx)',
    type: 'liability',
    accounts: [
      { code: '300', name: 'Banka Kredileri', field: 'short_term_loan_debt' },
      { code: '320', name: 'Satıcılar', field: 'trade_payables' },
      { code: '331', name: 'Ortaklara Borçlar', field: 'partner_payables' },
      { code: '335', name: 'Personele Borçlar', field: 'personnel_payables' },
      { code: '360', name: 'Ödenecek Vergi', field: 'tax_payables' },
      { code: '361', name: 'Ödenecek SGK', field: 'social_security_payables' },
      { code: '391', name: 'Hesaplanan KDV', field: 'vat_payable' },
      { code: '370', name: 'Ertelenmiş Vergi Borcu', field: 'deferred_tax_liabilities' },
      { code: '379', name: 'Vergi Karşılığı', field: 'tax_provision' },
    ],
  },
  {
    title: 'UZUN VADELİ BORÇLAR (4xx)',
    type: 'liability',
    accounts: [
      { code: '400', name: 'Banka Kredileri', field: 'bank_loans' },
    ],
  },
  {
    title: 'ÖZKAYNAKLAR (5xx)',
    type: 'equity',
    accounts: [
      { code: '500', name: 'Sermaye', field: 'paid_capital' },
      { code: '501', name: 'Ödenmemiş Sermaye (-)', field: 'unpaid_capital', isNegative: true },
      { code: '570', name: 'Geçmiş Yıllar Karları', field: 'retained_earnings' },
      { code: '590', name: 'Dönem Net Karı', field: 'current_profit' },
    ],
  },
];
