import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { useFinancialSettings } from './useFinancialSettings';
import { useFixedExpenses, FixedExpenseSummary } from './useFixedExpenses';
import { usePayrollAccruals } from './usePayrollAccruals';
import { usePreviousYearBalance } from './usePreviousYearBalance';
import { separateVat, VatSeparationResult } from './utils/vatSeparation';
import { calculateDepreciation, getUsefulLifeByCategory } from '@/lib/depreciationCalculator';

// Types
export interface ProcessedTransaction {
  id: string;
  date: string;
  description: string;
  counterparty: string | null;
  categoryId: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  categoryType: 'INCOME' | 'EXPENSE' | 'FINANCING' | 'INVESTMENT' | 'PARTNER' | 'EXCLUDED';
  expenseBehavior: 'fixed' | 'semi_fixed' | 'variable';
  gross: number;
  net: number;
  vat: number;
  vatRate: number;
  isIncome: boolean;
  month: number;
  source: 'bank' | 'receipt';
  // Tekdüzen Hesap Planı fields
  accountCode: string | null;        // e.g., '600', '622', '632'
  accountSubcode: string | null;     // e.g., '632.01', '632.02'
  costCenter: 'DELIVERY' | 'ADMIN' | 'SALES' | null;
  isKkeg: boolean;
}

export interface CategorySummary {
  categoryId: string;
  code: string;
  name: string;
  gross: number;
  net: number;
  vat: number;
  count: number;
  expenseBehavior: 'fixed' | 'semi_fixed' | 'variable';
}

export interface MonthlySummary {
  month: number;
  income: { gross: number; net: number; vat: number };
  expense: { gross: number; net: number; vat: number; fixed: number; variable: number };
  financing: { in: number; out: number };
  investment: number;
  partner: { in: number; out: number };
  net: number;
}

export interface FinancingSummary {
  creditIn: number;
  creditOut: number;
  leasingOut: number;
  interestPaid: number;
  remainingDebt: number;
  creditDetails: {
    totalCredit: number;
    paidAmount: number;
    remainingAmount: number;
    monthlyPayment: number;
    paidMonths: number;
    remainingMonths: number;
  };
}

export interface InvestmentSummary {
  equipment: number;     // Makine/Ekipman (253)
  fixtures: number;      // Demirbaşlar (255) - includes sub-categories
  vehicles: number;      // Taşıtlar (254)
  other: number;
  total: number;
  byType: Record<string, number>;
}

export interface PartnerSummary {
  deposits: number;
  withdrawals: number;
  balance: number;
}

export interface CashFlowSummary {
  inflows: number;           // Tüm nakit girişleri (pozitif tutarlar)
  outflows: number;          // Tüm nakit çıkışları (negatif tutarlar)
  net: number;               // Net nakit akışı
  // Çıkış dağılımı
  outflowsByType: {
    expenses: number;        // EXPENSE kategorisi
    partnerPayments: number; // PARTNER çıkışları
    investments: number;     // INVESTMENT çıkışları
    financing: number;       // FINANCING çıkışları (kredi ödemeleri)
    other: number;           // Kategorisiz
  };
}

export interface VatSummary {
  calculated: number;      // Hesaplanan KDV (satışlardan)
  deductible: number;      // İndirilecek KDV (alışlardan)
  net: number;             // Net ödenecek (pozitif) veya devreden (negatif)
  byMonth: Record<number, { calculated: number; deductible: number; net: number }>;
}

export interface BalanceData {
  // I - DÖNEN VARLIKLAR
  // A - Hazır Değerler
  cashOnHand: number;           // 1 - Kasa
  bankBalance: number;          // 3 - Bankalar
  readyValuesTotal: number;
  
  // C - Ticari Alacaklar
  tradeReceivables: number;     // 1 - Alıcılar
  tradeReceivablesTotal: number;
  
  // H - Diğer Dönen Varlıklar
  vatDeductible: number;        // 2 - İndirilecek KDV
  otherVat: number;             // 3 - Diğer KDV
  otherCurrentAssetsTotal: number;
  
  currentAssetsTotal: number;
  
  // II - DURAN VARLIKLAR
  // D - Maddi Duran Varlıklar
  vehicles: number;             // 5 - Taşıtlar
  fixtures: number;             // 6 - Demirbaşlar
  depreciation: number;         // 8 - Birikmiş Amortismanlar (-)
  tangibleAssetsTotal: number;
  fixedAssetsTotal: number;
  
  // Toplam Aktif
  totalAssets: number;
  
  // Legacy fields for compatibility
  inventory: number;
  partnerReceivables: number;
  vatReceivable: number;
  equipment: number;
  
  // I - KISA VADELİ YABANCI KAYNAKLAR
  // A - Mali Borçlar
  shortTermBankCredits: number; // 1 - Banka Kredileri
  financialDebtsTotal: number;
  
  // B - Ticari Borçlar
  tradePayables: number;        // 1 - Satıcılar
  tradePayablesTotal: number;
  
  // C - Diğer Borçlar
  partnerPayables: number;      // 1 - Ortaklara Borçlar
  personnelPayables: number;    // 4 - Personele Borçlar
  otherDebtsTotal: number;
  
  // F - Ödenecek Vergi ve Diğer Yükümlülükler
  taxPayables: number;          // 1 - Ödenecek Vergi ve Fonlar
  socialSecurityPayables: number; // 2 - Ödenecek SGK
  deferredTaxLiabilities: number; // 3 - Vadesi Geçmiş Ert.
  taxLiabilitiesTotal: number;
  
  // G - Borç ve Gider Karşılıkları
  taxProvision: number;         // 1 - Dön.Karı Vergi ve Diğ. Yas. Yük. Kar.
  
  // I - Diğer Kısa Vadeli Yabancı Kaynaklar
  calculatedVatPayable: number; // 1 - Hesaplanan KDV
  otherShortTermTotal: number;
  
  shortTermLoanDebt: number;    // Legacy
  shortTermTotal: number;
  
  // II - UZUN VADELİ YABANCI KAYNAKLAR
  longTermBankLoans: number;
  bankLoans: number;            // Legacy
  longTermTotal: number;
  
  // III - ÖZKAYNAKLAR
  // A - Ödenmiş Sermaye
  paidCapital: number;          // 1 - Sermaye
  unpaidCapital: number;        // 2 - Ödenmemiş Sermaye (-)
  paidCapitalTotal: number;
  
  // C - Kar Yedekleri
  legalReserves: number;        // 1 - Yasal Yedekler
  profitReservesTotal: number;
  
  // D - Geçmiş Yıllar Karları
  retainedEarnings: number;     // 1 - Geçmiş Yıllar Karları
  retainedEarningsTotal: number;
  
  // F - Dönem Net Karı (Zararı)
  currentProfit: number;        // 1 - Dönem Net Karı
  currentLoss: number;          // 2 - Dönem Net Zararı
  periodResultTotal: number;
  
  equityTotal: number;
  
  // Toplam Pasif
  totalLiabilities: number;
  
  // Denge kontrolü
  isBalanced: boolean;
  difference: number;
  
  // Legacy - for vatPayable
  vatPayable: number;
  taxPayable: number;
}

export interface FinancialDataHub {
  // Loading state
  isLoading: boolean;
  
  // Processed transactions (all sources, VAT separated)
  transactions: ProcessedTransaction[];
  
  // Categorized transactions
  income: ProcessedTransaction[];
  expense: ProcessedTransaction[];
  financing: ProcessedTransaction[];
  investment: ProcessedTransaction[];
  partner: ProcessedTransaction[];
  
  // Summaries
  incomeSummary: { gross: number; net: number; vat: number };
  expenseSummary: { gross: number; net: number; vat: number; fixed: number; variable: number };
  financingSummary: FinancingSummary;
  investmentSummary: InvestmentSummary;
  partnerSummary: PartnerSummary;
  vatSummary: VatSummary;
  
  // Balance sheet data
  balanceData: BalanceData;
  
  // Breakdowns
  byCategory: Record<string, CategorySummary>;
  byMonth: Record<number, MonthlySummary>;
  
  // Fixed expenses
  fixedExpenses: FixedExpenseSummary;
  
  // Profit calculations (category-based)
  operatingProfit: number;
  netProfit: number;
  profitMargin: number;
  
  // Cash flow summary (all bank movements)
  cashFlowSummary: CashFlowSummary;
  
  // Uncategorized transaction tracking
  uncategorizedCount: number;
  uncategorizedTotal: number;
}

export function useFinancialDataHub(year: number, manualBankBalance?: number | null): FinancialDataHub {
  const { transactions: bankTx, isLoading: loadingTx } = useBankTransactions(year);
  const { receipts, isLoading: loadingReceipts } = useReceipts(year);
  const { categories, isLoading: loadingCats } = useCategories();
  const { settings, isLoading: loadingSettings } = useFinancialSettings();
  const { summary: fixedExpenses, isLoading: loadingFixed } = useFixedExpenses();
  const { accruals: payrollAccruals, summary: payrollSummary, isLoading: loadingPayroll } = usePayrollAccruals(year);
  // Önceki yılın kilitli bilançosunu al (2025 için 2024'ü getirir)
  const { previousYearBalance, isLoading: loadingPrevBalance } = usePreviousYearBalance(year - 1);
  
  const isLoading = loadingTx || loadingReceipts || loadingCats || loadingSettings || loadingFixed || loadingPayroll || loadingPrevBalance;

  const hub = useMemo<FinancialDataHub>(() => {
    if (isLoading || !categories?.length) {
      return createEmptyHub(fixedExpenses);
    }

    // Category lookup map
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    // Define category types - prioritize category.type field from database
    const getCategoryType = (cat: typeof categories[0] | null, isIncome: boolean): ProcessedTransaction['categoryType'] => {
      // Kategorisiz işlemler kar/zarara dahil edilmemeli - EXCLUDED olarak işaretle
      if (!cat) {
        console.warn('⚠️ Kategorisiz işlem tespit edildi - EXCLUDED olarak işaretleniyor');
        return 'EXCLUDED';
      }
      
      // First check the category type field from database
      const dbType = cat.type?.toUpperCase();
      if (dbType === 'EXCLUDED' || cat.is_excluded) return 'EXCLUDED';
      if (dbType === 'PARTNER' || cat.affects_partner_account) return 'PARTNER';
      if (dbType === 'FINANCING' || cat.is_financing) return 'FINANCING';
      if (dbType === 'INVESTMENT') return 'INVESTMENT';
      if (dbType === 'INCOME') return 'INCOME';
      if (dbType === 'EXPENSE') return 'EXPENSE';
      
      // Fallback: code pattern matching
      const code = cat.code || '';
      if (code.includes('EXCLUDED') || code.includes('TRANSFER')) return 'EXCLUDED';
      if (code.includes('PARTNER')) return 'PARTNER';
      if (code.includes('KREDI') || code.includes('LEASING') || code.includes('FAIZ')) return 'FINANCING';
      if (code.includes('YATIRIM') || code.includes('EKIPMAN') || code.includes('ARAC')) return 'INVESTMENT';
      if (code.includes('GELIR') || code.includes('HIZMET') || code.includes('SATIS')) return 'INCOME';
      
      return isIncome ? 'INCOME' : 'EXPENSE';
    };

    // Process bank transactions
    const processedTx: ProcessedTransaction[] = [];
    
    bankTx.filter(tx => !tx.is_excluded).forEach(tx => {
      const cat = tx.category_id ? categoryMap.get(tx.category_id) : null;
      const vatResult = separateVat({
        amount: tx.amount,
        net_amount: tx.net_amount,
        vat_amount: tx.vat_amount,
        vat_rate: tx.vat_rate,
        is_commercial: tx.is_commercial
      });
      
      const isIncome = tx.amount != null && tx.amount > 0;
      const catType = getCategoryType(cat || null, isIncome);
      const month = tx.transaction_date ? new Date(tx.transaction_date).getMonth() + 1 : 1;
      
      processedTx.push({
        id: tx.id,
        date: tx.transaction_date || '',
        description: tx.description || '',
        counterparty: tx.counterparty || null,
        categoryId: tx.category_id || null,
        categoryCode: cat?.code || null,
        categoryName: cat?.name || null,
        categoryType: catType,
        expenseBehavior: (cat as any)?.expense_behavior || 'variable',
        gross: vatResult.grossAmount,
        net: vatResult.netAmount,
        vat: vatResult.vatAmount,
        vatRate: vatResult.vatRate,
        isIncome,
        month,
        source: 'bank',
        // Tekdüzen Hesap Planı fields
        accountCode: (cat as any)?.account_code || null,
        accountSubcode: (cat as any)?.account_subcode || null,
        costCenter: (cat as any)?.cost_center || null,
        isKkeg: (cat as any)?.is_kkeg || false,
      });
    });

    // Process receipts (unlinked only to avoid double counting)
    receipts
      .filter(r => !r.linked_bank_transaction_id && r.document_type === 'received')
      .forEach(r => {
        const cat = r.category_id ? categoryMap.get(r.category_id) : null;
        const vatResult = separateVat({
          total_amount: r.total_amount,
          vat_amount: r.vat_amount,
          vat_rate: r.vat_rate
        });
        
        const month = r.receipt_date ? new Date(r.receipt_date).getMonth() + 1 : 1;
        
        processedTx.push({
          id: r.id,
          date: r.receipt_date || '',
          description: r.vendor_name || r.seller_name || r.file_name || '',
          counterparty: r.vendor_name || r.seller_name || null,
          categoryId: r.category_id || null,
          categoryCode: cat?.code || null,
          categoryName: cat?.name || null,
          categoryType: 'EXPENSE',
          expenseBehavior: (cat as any)?.expense_behavior || 'variable',
          gross: vatResult.grossAmount,
          net: vatResult.netAmount,
          vat: vatResult.vatAmount,
          vatRate: vatResult.vatRate,
          isIncome: false,
          month,
          source: 'receipt',
          // Tekdüzen Hesap Planı fields
          accountCode: (cat as any)?.account_code || null,
          accountSubcode: (cat as any)?.account_subcode || null,
          costCenter: (cat as any)?.cost_center || null,
          isKkeg: (cat as any)?.is_kkeg || false,
        });
      });

    // Also add issued receipts for VAT calculation (they represent income VAT)
    const issuedReceipts = receipts.filter(r => r.document_type === 'issued');

    // Categorize transactions - strict filtering based on categoryType
    const income = processedTx.filter(t => t.categoryType === 'INCOME');
    const expense = processedTx.filter(t => t.categoryType === 'EXPENSE');
    const financing = processedTx.filter(t => t.categoryType === 'FINANCING');
    const investment = processedTx.filter(t => t.categoryType === 'INVESTMENT');
    const partner = processedTx.filter(t => t.categoryType === 'PARTNER');

    // Income summary
    const incomeSummary = {
      gross: income.reduce((sum, t) => sum + t.gross, 0),
      net: income.reduce((sum, t) => sum + t.net, 0),
      vat: income.reduce((sum, t) => sum + t.vat, 0)
    };

    // Expense summary - personel giderleri dahil
    const fixedExpenseAmount = expense.filter(t => t.expenseBehavior === 'fixed').reduce((sum, t) => sum + t.net, 0);
    const variableExpenseAmount = expense.filter(t => t.expenseBehavior !== 'fixed').reduce((sum, t) => sum + t.net, 0);
    const personnelExpenseTotal = payrollSummary.totalPersonnelExpense;
    
    const expenseSummary = {
      gross: expense.reduce((sum, t) => sum + t.gross, 0) + personnelExpenseTotal,
      net: expense.reduce((sum, t) => sum + t.net, 0) + personnelExpenseTotal,
      vat: expense.reduce((sum, t) => sum + t.vat, 0),
      fixed: fixedExpenseAmount + personnelExpenseTotal, // Personel sabit gider
      variable: variableExpenseAmount
    };

    // Financing summary
    const creditIn = financing.filter(t => t.isIncome && t.categoryCode?.includes('KREDI')).reduce((sum, t) => sum + t.gross, 0);
    
    // Kredi ödemelerini hesapla - BR.KAMP transfer işlemlerini hariç tut (hesaplar arası aktarım)
    const creditOut = financing
      .filter(t => !t.isIncome && t.categoryCode?.includes('KREDI'))
      .filter(t => !t.description?.toUpperCase().includes('BR.KAMP')) // Transfer işlemini hariç tut
      .reduce((sum, t) => sum + Math.abs(t.gross), 0);
    
    const leasingOut = financing.filter(t => !t.isIncome && t.categoryCode?.includes('LEASING')).reduce((sum, t) => sum + Math.abs(t.gross), 0);
    const interestPaid = financing.filter(t => !t.isIncome && t.categoryCode?.includes('FAIZ')).reduce((sum, t) => sum + Math.abs(t.gross), 0);
    
    // Kredi kalan borç hesaplama
    // Ana para: creditIn veya settings'ten gelen değer
    const initialLoanAmount = creditIn || (settings?.bank_loans || 0);
    const remainingDebt = Math.max(0, initialLoanAmount - creditOut);
    
    // Aylık taksit tutarı (fixedExpenses'tan veya varsayılan)
    const monthlyInstallment = fixedExpenses.installmentDetails[0]?.monthlyAmount || 41262.64;
    
    const financingSummary: FinancingSummary = {
      creditIn,
      creditOut,
      leasingOut,
      interestPaid,
      remainingDebt,
      creditDetails: {
        totalCredit: initialLoanAmount,
        paidAmount: creditOut,
        remainingAmount: remainingDebt,
        monthlyPayment: monthlyInstallment,
        paidMonths: creditOut > 0 ? Math.round(creditOut / monthlyInstallment) : 0,
        remainingMonths: remainingDebt > 0 ? Math.ceil(remainingDebt / monthlyInstallment) : 0
      }
    };

    // Investment summary
    // Demirbaş alt kategorileri: DEMIRBAS, TELEFON, BILGISAYAR, TV
    const fixturesCodes = ['DEMIRBAS', 'TELEFON', 'BILGISAYAR', 'TV'];
    const fixturesPurchases = investment
      .filter(t => fixturesCodes.some(code => t.categoryCode?.includes(code)))
      .reduce((sum, t) => sum + t.gross, 0);
    
    const equipmentPurchases = investment
      .filter(t => t.categoryCode?.includes('EKIPMAN'))
      .reduce((sum, t) => sum + t.gross, 0);
    
    const vehiclePurchasesForSummary = investment
      .filter(t => t.categoryCode?.includes('ARAC'))
      .reduce((sum, t) => sum + t.gross, 0);
    
    const otherInvestments = investment
      .filter(t => !t.categoryCode?.includes('EKIPMAN') && 
                   !t.categoryCode?.includes('ARAC') && 
                   !fixturesCodes.some(code => t.categoryCode?.includes(code)))
      .reduce((sum, t) => sum + t.gross, 0);
    
    const investmentSummary: InvestmentSummary = {
      equipment: equipmentPurchases + (settings?.equipment_value || 0),
      fixtures: fixturesPurchases + ((settings as any)?.fixtures_value || 0),
      vehicles: vehiclePurchasesForSummary + (settings?.vehicles_value || 0),
      other: otherInvestments,
      total: 0,
      byType: {}
    };
    investmentSummary.total = investmentSummary.equipment + investmentSummary.fixtures + investmentSummary.vehicles + investmentSummary.other;

    // Partner summary
    const partnerSummary: PartnerSummary = {
      deposits: partner.filter(t => t.isIncome).reduce((sum, t) => sum + t.gross, 0),
      withdrawals: partner.filter(t => !t.isIncome).reduce((sum, t) => sum + t.gross, 0),
      balance: 0
    };
    partnerSummary.balance = partnerSummary.deposits - partnerSummary.withdrawals;

    // VAT summary
    const calculatedVat = incomeSummary.vat + issuedReceipts.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
    const deductibleVat = expenseSummary.vat;
    
    const vatByMonth: Record<number, { calculated: number; deductible: number; net: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const monthIncome = income.filter(t => t.month === m);
      const monthExpense = expense.filter(t => t.month === m);
      const monthIssued = issuedReceipts.filter(r => r.receipt_date && new Date(r.receipt_date).getMonth() + 1 === m);
      
      const calc = monthIncome.reduce((sum, t) => sum + t.vat, 0) + monthIssued.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
      const ded = monthExpense.reduce((sum, t) => sum + t.vat, 0);
      
      vatByMonth[m] = { calculated: calc, deductible: ded, net: calc - ded };
    }

    const vatSummary: VatSummary = {
      calculated: calculatedVat,
      deductible: deductibleVat,
      net: calculatedVat - deductibleVat,
      byMonth: vatByMonth
    };

    // Category breakdown
    const byCategory: Record<string, CategorySummary> = {};
    processedTx.forEach(tx => {
      if (!tx.categoryId) return;
      if (!byCategory[tx.categoryId]) {
        byCategory[tx.categoryId] = {
          categoryId: tx.categoryId,
          code: tx.categoryCode || '',
          name: tx.categoryName || '',
          gross: 0,
          net: 0,
          vat: 0,
          count: 0,
          expenseBehavior: tx.expenseBehavior
        };
      }
      byCategory[tx.categoryId].gross += tx.gross;
      byCategory[tx.categoryId].net += tx.net;
      byCategory[tx.categoryId].vat += tx.vat;
      byCategory[tx.categoryId].count += 1;
    });

    // Monthly breakdown
    const byMonth: Record<number, MonthlySummary> = {};
    for (let m = 1; m <= 12; m++) {
      const monthTx = processedTx.filter(t => t.month === m);
      const monthIncome = monthTx.filter(t => t.categoryType === 'INCOME');
      const monthExpense = monthTx.filter(t => t.categoryType === 'EXPENSE');
      const monthFinancing = monthTx.filter(t => t.categoryType === 'FINANCING');
      const monthInvestment = monthTx.filter(t => t.categoryType === 'INVESTMENT');
      const monthPartner = monthTx.filter(t => t.categoryType === 'PARTNER');
      
      // Personel giderlerini bu ay için hesapla
      const monthPayroll = payrollAccruals.find(p => p.month === m);
      const personnelExpense = monthPayroll 
        ? monthPayroll.grossSalary + monthPayroll.employerSgkPayable + monthPayroll.unemploymentPayable 
        : 0;
      
      const baseExpenseGross = monthExpense.reduce((sum, t) => sum + t.gross, 0);
      const baseExpenseNet = monthExpense.reduce((sum, t) => sum + t.net, 0);
      const baseExpenseFixed = monthExpense.filter(t => t.expenseBehavior === 'fixed').reduce((sum, t) => sum + t.net, 0);
      
      byMonth[m] = {
        month: m,
        income: {
          gross: monthIncome.reduce((sum, t) => sum + t.gross, 0),
          net: monthIncome.reduce((sum, t) => sum + t.net, 0),
          vat: monthIncome.reduce((sum, t) => sum + t.vat, 0)
        },
        expense: {
          gross: baseExpenseGross + personnelExpense,
          net: baseExpenseNet + personnelExpense,
          vat: monthExpense.reduce((sum, t) => sum + t.vat, 0),
          fixed: baseExpenseFixed + personnelExpense, // Personel sabit gider
          variable: monthExpense.filter(t => t.expenseBehavior !== 'fixed').reduce((sum, t) => sum + t.net, 0)
        },
        financing: {
          in: monthFinancing.filter(t => t.isIncome).reduce((sum, t) => sum + t.gross, 0),
          out: monthFinancing.filter(t => !t.isIncome).reduce((sum, t) => sum + t.gross, 0)
        },
        investment: monthInvestment.reduce((sum, t) => sum + t.gross, 0),
        partner: {
          in: monthPartner.filter(t => t.isIncome).reduce((sum, t) => sum + t.gross, 0),
          out: monthPartner.filter(t => !t.isIncome).reduce((sum, t) => sum + t.gross, 0)
        },
        net: monthIncome.reduce((sum, t) => sum + t.net, 0) - (baseExpenseNet + personnelExpense)
      };
    }

    // Profit calculations - kar hesabı depreciationTotal hesaplandıktan SONRA yapılacak (satır ~988)
    // Geçici değerler - gerçek kar hesabı aşağıda
    let operatingProfit = 0;
    let netProfit = 0;
    let profitMargin = 0;

    // Cash flow summary (all bank movements - nakit akışı)
    // EXCLUDED hariç tüm işlemleri hesapla
    const nonExcludedTx = processedTx.filter(t => t.categoryType !== 'EXCLUDED');
    const cashInflows = nonExcludedTx.filter(t => t.gross > 0).reduce((sum, t) => sum + t.gross, 0);
    const cashOutflows = nonExcludedTx.filter(t => t.gross < 0).reduce((sum, t) => sum + t.gross, 0);
    
    // Çıkış dağılımı kategorilere göre
    const expenseOutflows = Math.abs(expense.reduce((sum, t) => sum + Math.min(0, t.gross), 0));
    const partnerOutflows = Math.abs(partner.filter(t => !t.isIncome).reduce((sum, t) => sum + t.gross, 0));
    const investmentOutflows = Math.abs(investment.reduce((sum, t) => sum + Math.min(0, t.gross), 0));
    const financingOutflows = Math.abs(financing.filter(t => !t.isIncome).reduce((sum, t) => sum + t.gross, 0));
    const otherOutflows = Math.abs(cashOutflows) - expenseOutflows - partnerOutflows - investmentOutflows - financingOutflows;
    
    const cashFlowSummary: CashFlowSummary = {
      inflows: cashInflows,
      outflows: cashOutflows,
      net: cashInflows + cashOutflows,
      outflowsByType: {
        expenses: expenseOutflows,
        partnerPayments: partnerOutflows,
        investments: investmentOutflows,
        financing: financingOutflows,
        other: Math.max(0, otherOutflows)
      }
    };

    // Balance sheet data calculation - Türk Tekdüzen Hesap Planı formatında
    
    // ============================================
    // AÇILIŞ DEĞERLERİ: Önceki yıl kilitli bilançosundan al
    // ============================================
    // Eğer önceki yıl (year - 1) kilitli bilanço varsa, açılış değerleri oradan alınır
    // Yoksa financial_settings'ten fallback yapılır
    
    const openingBankBalance = previousYearBalance?.is_locked 
      ? (previousYearBalance.bank_balance || 0)
      : ((settings as any)?.opening_bank_balance || 0);
    
    const openingCashOnHand = previousYearBalance?.is_locked 
      ? (previousYearBalance.cash_on_hand || 0)
      : ((settings as any)?.opening_cash_on_hand || 0);
    
    console.log('📊 Açılış Değerleri:', {
      yıl: year,
      öncekiYılKilitli: previousYearBalance?.is_locked,
      öncekiYılBanka: previousYearBalance?.bank_balance,
      öncekiYılKasa: previousYearBalance?.cash_on_hand,
      kullanılanBanka: openingBankBalance,
      kullanılanKasa: openingCashOnHand
    });
    
    // Bank balance - use manual override if provided, otherwise calculate
    let bankBalance: number;
    
    // Manuel değer varsa (yearly_balance_sheets'ten gelen), onu kullan
    if (manualBankBalance != null && manualBankBalance !== 0) {
      bankBalance = manualBankBalance;
      console.log('💰 Manuel banka bakiyesi kullanılıyor:', manualBankBalance);
    } else {
      // Yoksa mevcut hesaplama mantığını uygula
      const sortedBankTx = [...bankTx].sort((a, b) => 
        new Date(b.transaction_date || 0).getTime() - new Date(a.transaction_date || 0).getTime()
      );
      
      // Try to get balance from latest transaction first
      const lastTxBalance = sortedBankTx[0]?.balance;
      
      // If balance column is null, calculate cumulative balance from transactions + opening balance
      if (lastTxBalance == null) {
        const txSortedAsc = [...bankTx].sort((a, b) => 
          new Date(a.transaction_date || 0).getTime() - new Date(b.transaction_date || 0).getTime()
        );
        // Açılış bakiyesi ile başla ve işlemleri ekle
        bankBalance = openingBankBalance + txSortedAsc.reduce((balance, tx) => {
          if (tx.is_excluded) return balance;
          return balance + (tx.amount || 0);
        }, 0);
      } else {
        bankBalance = lastTxBalance;
      }
    }
    
    // I - DÖNEN VARLIKLAR
    // A - Hazır Değerler
    // Kasa: açılış değeri (önceki yıl bilançosundan devir, hareket yok varsayılır)
    const cashOnHand = openingCashOnHand;
    const readyValuesTotal = cashOnHand + bankBalance;
    
    // C - Ticari Alacaklar
    const openingTradeReceivables = previousYearBalance?.is_locked 
      ? (previousYearBalance.trade_receivables || 0)
      : (settings?.trade_receivables || 0);
    const tradeReceivables = openingTradeReceivables;
    const tradeReceivablesTotal = tradeReceivables;
    
    // H - Diğer Dönen Varlıklar
    const vatDeductible = expenseSummary.vat;  // İndirilecek KDV
    const openingOtherVat = previousYearBalance?.is_locked 
      ? (previousYearBalance.other_vat || 0)
      : ((settings as any)?.other_vat || 0);
    const otherVat = openingOtherVat;
    const otherCurrentAssetsTotal = vatDeductible + otherVat;
    
    // Partner receivables/payables - net calculation (önceki yıldan devir + yıl içi hareketler)
    // DÜZELTİLMİŞ MANTIK: Net pozisyon hesabı - negatif borç = alacak olarak aktife yazılmalı
    const openingPartnerReceivables = previousYearBalance?.is_locked 
      ? (previousYearBalance.partner_receivables || 0)
      : 0;
    const openingPartnerPayables = previousYearBalance?.is_locked 
      ? (previousYearBalance.partner_payables || 0)
      : ((settings as any)?.partner_payables || 0);
    
    // Yıl içi partner hareketleri net etkisi
    // withdrawals = ortağa yapılan ödemeler (ortağın alacağı azalır / şirketin alacağı artar)
    // deposits = ortaktan alınan paralar (ortağın borcu azalır / şirketin alacağı azalır)
    const partnerNetMovement = partnerSummary.withdrawals - partnerSummary.deposits;
    
    // Net pozisyon hesabı: Pozitif = Ortaklardan Alacak (AKTİF), Negatif = Ortaklara Borç (PASİF)
    // Açılışta: alacak (+) - borç (-) + hareket
    const netPartnerPosition = (openingPartnerReceivables - openingPartnerPayables) + partnerNetMovement;
    
    // Pozitif pozisyon = Ortaklardan Alacak (AKTİF)
    // Negatif pozisyon = Ortaklara Borç (PASİF)
    const partnerReceivables = netPartnerPosition > 0 ? netPartnerPosition : 0;
    const partnerPayables = netPartnerPosition < 0 ? Math.abs(netPartnerPosition) : 0;
    
    console.log('👥 Ortak Hesabı Debug:', {
      openingReceivables: openingPartnerReceivables,
      openingPayables: openingPartnerPayables,
      withdrawals: partnerSummary.withdrawals,
      deposits: partnerSummary.deposits,
      netMovement: partnerNetMovement,
      netPosition: netPartnerPosition,
      finalReceivables: partnerReceivables,
      finalPayables: partnerPayables
    });
    
    // Legacy inventory and vat receivable
    const openingInventory = previousYearBalance?.is_locked 
      ? (previousYearBalance.inventory || 0)
      : (settings?.inventory_value || 0);
    const inventoryValue = openingInventory;
    const vatReceivable = vatSummary.net < 0 ? Math.abs(vatSummary.net) : 0;
    
    // Include partner receivables in current assets total
    const currentAssetsTotal = readyValuesTotal + tradeReceivablesTotal + partnerReceivables + otherCurrentAssetsTotal;

    
    // II - DURAN VARLIKLAR
    // D - Maddi Duran Varlıklar - investmentSummary'den değerleri kullan
    const vehiclesTotal = investmentSummary.vehicles;
    const fixturesValue = investmentSummary.fixtures;
    
    // Bilanço tarihi (yıl sonu)
    const asOfDate = `${year}-12-31`;
    
    // İşlem bazlı amortisman hesaplama - her yatırım işleminin kendi tarihine göre
    // Kategori faydalı ömürlerini al
    const categoryUsefulLife: Record<string, number> = {
      'TELEFON': 3,
      'BILGISAYAR': 4,
      'TV': 5,
      'DEMIRBAS': 5,
      'ARAC': 5,
      'EKIPMAN': 10
    };
    
    // Her yatırım işlemi için ayrı ayrı amortisman hesapla
    let investmentDepreciation = 0;
    const depreciationDetails: Array<{
      description: string;
      value: number;
      date: string;
      usefulLife: number;
      depreciation: number;
    }> = [];
    
    investment.forEach(tx => {
      // İşlem tarihi = alım tarihi
      const purchaseDate = tx.date;
      if (!purchaseDate) return;
      
      // Kategori koduna göre faydalı ömür belirle
      let usefulLife = 5; // varsayılan
      if (tx.categoryCode) {
        for (const [code, years] of Object.entries(categoryUsefulLife)) {
          if (tx.categoryCode.includes(code)) {
            usefulLife = years;
            break;
          }
        }
      }
      
      const result = calculateDepreciation({
        assetValue: Math.abs(tx.gross),
        purchaseDate,
        usefulLifeYears: usefulLife,
        method: 'straight_line',
        asOfDate
      });
      
      investmentDepreciation += result.accumulatedDepreciation;
      
      depreciationDetails.push({
        description: tx.description,
        value: Math.abs(tx.gross),
        date: purchaseDate,
        usefulLife,
        depreciation: result.accumulatedDepreciation
      });
    });
    
    // Settings'teki açılış değerleri için de amortisman hesapla (alım tarihi varsa)
    let settingsDepreciation = 0;
    
    const settingsVehiclesValue = settings?.vehicles_value || 0;
    const settingsFixturesValue = settings?.fixtures_value || 0;
    const settingsEquipmentValue = settings?.equipment_value || 0;
    
    // Debug log for settings depreciation
    console.log('🔧 Settings Amortisman Debug:', {
      settingsVehiclesValue,
      settingsFixturesValue,
      settingsEquipmentValue,
      vehicles_purchase_date: settings?.vehicles_purchase_date,
      fixtures_purchase_date: settings?.fixtures_purchase_date,
      equipment_purchase_date: settings?.equipment_purchase_date,
      asOfDate
    });
    
    if (settings?.vehicles_purchase_date && settingsVehiclesValue > 0) {
      const vehicleResult = calculateDepreciation({
        assetValue: settingsVehiclesValue,
        purchaseDate: settings.vehicles_purchase_date,
        usefulLifeYears: settings?.vehicles_useful_life_years || 5,
        method: 'straight_line',
        asOfDate
      });
      settingsDepreciation += vehicleResult.accumulatedDepreciation;
      console.log('🚗 Taşıt Amortisman:', vehicleResult);
    }
    
    if (settings?.fixtures_purchase_date && settingsFixturesValue > 0) {
      const fixturesResult = calculateDepreciation({
        assetValue: settingsFixturesValue,
        purchaseDate: settings.fixtures_purchase_date,
        usefulLifeYears: settings?.fixtures_useful_life_years || 5,
        method: 'straight_line',
        asOfDate
      });
      settingsDepreciation += fixturesResult.accumulatedDepreciation;
      console.log('🪑 Demirbaş Amortisman:', fixturesResult);
    }
    
    if (settings?.equipment_purchase_date && settingsEquipmentValue > 0) {
      const equipmentResult = calculateDepreciation({
        assetValue: settingsEquipmentValue,
        purchaseDate: settings.equipment_purchase_date,
        usefulLifeYears: settings?.equipment_useful_life_years || 10,
        method: 'straight_line',
        asOfDate
      });
      settingsDepreciation += equipmentResult.accumulatedDepreciation;
      console.log('⚙️ Ekipman Amortisman:', equipmentResult);
    }
    
    // Eğer hiç alım tarihi yoksa (ne işlemlerde ne settings'te), manuel değeri kullan
    const hasAnyPurchaseDate = investment.length > 0 || 
      settings?.vehicles_purchase_date || 
      settings?.fixtures_purchase_date ||
      settings?.equipment_purchase_date;
    
    const depreciationTotal = hasAnyPurchaseDate 
      ? investmentDepreciation + settingsDepreciation
      : (settings?.accumulated_depreciation || 0);
    
    console.log('📊 İşlem Bazlı Amortisman Hesabı:', {
      işlemlerdenAmortisman: investmentDepreciation,
      settingsAmortisman: settingsDepreciation,
      toplam: depreciationTotal,
      detay: depreciationDetails
    });
    
    const tangibleAssetsTotal = vehiclesTotal + fixturesValue - depreciationTotal;
    const fixedAssetsTotal = tangibleAssetsTotal;
    
    const totalAssets = currentAssetsTotal + fixedAssetsTotal;
    
    // I - KISA VADELİ YABANCI KAYNAKLAR
    // A - Mali Borçlar (Banka Kredileri - 12 ay içi)
    
    // DÜZELTİLMİŞ: Kredi borcu hesaplama
    // 1. Önceki yıldan devir eden kredi borcu
    const openingLoanDebt = previousYearBalance?.is_locked 
      ? (previousYearBalance.bank_loans || 0) + (previousYearBalance.short_term_loan_debt || 0)
      : (settings?.bank_loans || 0);
    
    // 2. Yıl içi kredi kullanımı ve ödemeleri (financingSummary'den)
    const yearCreditUsed = financingSummary.creditIn;
    const yearCreditPaid = financingSummary.creditOut;
    
    // 3. Kalan kredi borcu = açılış + kullanım - ödeme
    const remainingLoanDebt = Math.max(0, openingLoanDebt + yearCreditUsed - yearCreditPaid);
    
    console.log('🏦 Kredi Borcu Debug:', {
      openingLoanDebt,
      yearCreditUsed,
      yearCreditPaid,
      remainingLoanDebt,
      fixedExpensesInstallments: fixedExpenses.installmentDetails.length
    });
    
    // Taksit detaylarından kısa/uzun vade ayrımı
    let totalShortTermInstallments = 0;
    let totalLongTermInstallments = 0;
    
    if (fixedExpenses.installmentDetails.length > 0) {
      fixedExpenses.installmentDetails.forEach(detail => {
        const { remainingMonths, monthlyAmount } = detail;
        const shortTermMonths = Math.min(12, remainingMonths);
        const longTermMonths = Math.max(0, remainingMonths - 12);
        totalShortTermInstallments += shortTermMonths * monthlyAmount;
        totalLongTermInstallments += longTermMonths * monthlyAmount;
      });
    } else if (remainingLoanDebt > 0) {
      // Eğer taksit detayı yoksa ama borç varsa, tamamını uzun vadeli say
      totalLongTermInstallments = remainingLoanDebt;
    }
    
    const shortTermBankCredits = totalShortTermInstallments;
    const financialDebtsTotal = shortTermBankCredits;
    
    // B - Ticari Borçlar
    const tradePayables = settings?.trade_payables || 0;
    const tradePayablesTotal = tradePayables;
    
    // C - Diğer Borçlar
    // Ödenmemiş net maaş borçları → 335 Personele Borçlar (payroll_accruals'dan dinamik)
    const settingsPersonnelPayables = (settings as any)?.personnel_payables || 0;
    const personnelPayables = payrollSummary.totalNetPayable > 0 
      ? payrollSummary.totalNetPayable 
      : settingsPersonnelPayables;
    
    // DÜZELTİLMİŞ: Ortaklara borçları net pozisyon hesabından al (partnerPayables yukarıda hesaplandı)
    // Eğer partnerPayables > 0 ise şirket ortaklara borçlu demektir
    const calculatedPartnerPayables = partnerPayables; // Artık doğru hesaplanmış değer
    const otherDebtsTotal = calculatedPartnerPayables + personnelPayables;
    
    // F - Ödenecek Vergi ve Diğer Yükümlülükler
    // Ödenmemiş vergi borçları → 360 Ödenecek Vergi (payroll_accruals'dan dinamik: GV + Damga)
    const settingsTaxPayables = (settings as any)?.tax_payables || 0;
    const taxPayables = payrollSummary.totalTaxPayable > 0 
      ? payrollSummary.totalTaxPayable 
      : settingsTaxPayables;
    
    // Ödenmemiş SGK borçları → 361 SGK Borçları (payroll_accruals'dan dinamik)
    const settingsSocialSecurityPayables = (settings as any)?.social_security_payables || 0;
    const socialSecurityPayables = payrollSummary.totalSgkPayable > 0 
      ? payrollSummary.totalSgkPayable 
      : settingsSocialSecurityPayables;
    
    const deferredTaxLiabilities = (settings as any)?.deferred_tax_liabilities || 0;
    const taxLiabilitiesTotal = taxPayables + socialSecurityPayables + deferredTaxLiabilities;
    
    // G - Borç ve Gider Karşılıkları
    const taxProvision = (settings as any)?.tax_provision || 0; // Dönem karı vergi karşılığı
    
    // I - Diğer Kısa Vadeli Yabancı Kaynaklar
    const vatPayable = vatSummary.net > 0 ? vatSummary.net : 0;
    const calculatedVatPayable = (settings as any)?.calculated_vat_payable || vatPayable;
    const otherShortTermTotal = calculatedVatPayable;
    
    const shortTermLoanDebt = shortTermBankCredits;
    const shortTermTotal = financialDebtsTotal + tradePayablesTotal + otherDebtsTotal + taxLiabilitiesTotal + otherShortTermTotal;
    
    // II - UZUN VADELİ YABANCI KAYNAKLAR
    // DÜZELTİLMİŞ: Taksit detayından veya kalan borçtan uzun vadeli kısım
    const longTermBankLoans = totalLongTermInstallments > 0 ? totalLongTermInstallments : 0;
    const longTermTotal = longTermBankLoans;
    
    // III - ÖZKAYNAKLAR
    // A - Ödenmiş Sermaye
    const paidCapital = settings?.paid_capital || 0;
    const unpaidCapital = (settings as any)?.unpaid_capital || 0;
    const paidCapitalTotal = paidCapital - unpaidCapital;
    
    // C - Kar Yedekleri
    const legalReserves = (settings as any)?.legal_reserves || 0;
    const profitReservesTotal = legalReserves;
    
    // D - Geçmiş Yıllar Karları
    // DÜZELTİLMİŞ: Önceki yılın dönem karını geçmiş yıllar karlarına devret
    const settingsRetainedEarnings = settings?.retained_earnings || 0;
    const previousYearProfit = previousYearBalance?.is_locked ? (previousYearBalance.current_profit || 0) : 0;
    const retainedEarnings = settingsRetainedEarnings + previousYearProfit;
    const retainedEarningsTotal = retainedEarnings;
    
    console.log('📈 Geçmiş Yıl Karı Devri:', {
      settingsRetainedEarnings,
      previousYearProfit,
      totalRetainedEarnings: retainedEarnings
    });
    
    // ===== GERÇEK KAR HESABI (Tahakkuk Esası) =====
    // Kar hesabı artık dinamik - hardcoded değer yok
    
    // 1. Gider Kalemlerini Hazırla
    const personnelExpense = payrollSummary.totalPersonnelExpense || 0; // 770 Personel Gideri
    const depreciationExpense = depreciationTotal; // 730/770 Amortisman Gideri
    // Hizmet Üretim Maliyeti artık expenseSummary.net içinde (account_code='622' olanlar)
    
    // 2. Finansman Giderleri (660 hesabı) - faiz giderleri
    const financeExpense = interestPaid;
    
    // 3. Faaliyet Karı = Gelirler - (Giderler + Personel + Amortisman)
    // expenseSummary.net zaten Satılan Hizmet Maliyeti (622) dahil tüm EXPENSE kategorilerini içeriyor
    operatingProfit = incomeSummary.net 
      - expenseSummary.net 
      - personnelExpense 
      - depreciationExpense;
    
    // 4. Net Kar = Faaliyet Karı - Finansman Giderleri
    netProfit = operatingProfit - financeExpense;
    profitMargin = incomeSummary.net > 0 ? (operatingProfit / incomeSummary.net) * 100 : 0;

    console.log('💰 Kar Hesabı (Tahakkuk Esası - Dinamik):', {
      gelirNet: incomeSummary.net,
      operasyonelGider: expenseSummary.net,
      personelGideri: personnelExpense,
      amortismanGideri: depreciationExpense,
      finansmanGideri: financeExpense,
      faaliyetKari: operatingProfit,
      netKar: netProfit
    });
    
    // F - Dönem Net Karı (Zararı)
    const currentProfit = netProfit >= 0 ? netProfit : 0;
    const currentLoss = netProfit < 0 ? Math.abs(netProfit) : 0;
    const periodResultTotal = currentProfit - currentLoss;
    
    const equityTotal = paidCapitalTotal + profitReservesTotal + retainedEarningsTotal + periodResultTotal;
    
    const totalLiabilities = shortTermTotal + longTermTotal + equityTotal;
    const difference = totalAssets - totalLiabilities;
    const isBalanced = Math.abs(difference) < 1;
    
    const balanceData: BalanceData = {
      // I - Dönen Varlıklar
      cashOnHand,
      bankBalance,
      readyValuesTotal,
      tradeReceivables,
      tradeReceivablesTotal,
      vatDeductible,
      otherVat,
      otherCurrentAssetsTotal,
      currentAssetsTotal,
      
      // II - Duran Varlıklar
      vehicles: vehiclesTotal,
      fixtures: fixturesValue,
      depreciation: depreciationTotal,
      tangibleAssetsTotal,
      fixedAssetsTotal,
      totalAssets,
      
      // Legacy fields
      inventory: inventoryValue,
      partnerReceivables,
      vatReceivable,
      equipment: fixturesValue,
      
      // I - Kısa Vadeli Yabancı Kaynaklar
      shortTermBankCredits,
      financialDebtsTotal,
      tradePayables,
      tradePayablesTotal,
      partnerPayables: calculatedPartnerPayables,
      personnelPayables,
      otherDebtsTotal,
      taxPayables,
      socialSecurityPayables,
      deferredTaxLiabilities,
      taxLiabilitiesTotal,
      taxProvision,
      calculatedVatPayable,
      otherShortTermTotal,
      shortTermLoanDebt,
      shortTermTotal,
      
      // II - Uzun Vadeli Yabancı Kaynaklar
      longTermBankLoans,
      bankLoans: longTermBankLoans,
      longTermTotal,
      
      // III - Özkaynaklar
      paidCapital,
      unpaidCapital,
      paidCapitalTotal,
      legalReserves,
      profitReservesTotal,
      retainedEarnings,
      retainedEarningsTotal,
      currentProfit: periodResultTotal,
      currentLoss,
      periodResultTotal,
      equityTotal,
      
      totalLiabilities,
      isBalanced,
      difference,
      
      // Legacy
      vatPayable,
      taxPayable: taxPayables,
    };

    return {
      isLoading: false,
      transactions: processedTx,
      income,
      expense,
      financing,
      investment,
      partner,
      incomeSummary,
      expenseSummary,
      financingSummary,
      investmentSummary,
      partnerSummary,
      vatSummary,
      balanceData,
      byCategory,
      byMonth,
      fixedExpenses,
      operatingProfit,
      netProfit,
      profitMargin,
      cashFlowSummary,
      uncategorizedCount: bankTx.filter(tx => !tx.category_id && !tx.is_excluded).length,
      uncategorizedTotal: bankTx.filter(tx => !tx.category_id && !tx.is_excluded).reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0)
    };
  }, [isLoading, bankTx, receipts, categories, settings, fixedExpenses, year, previousYearBalance]);

  return hub;
}

function createEmptyHub(fixedExpenses: FixedExpenseSummary): FinancialDataHub {
  const emptyBalanceData: BalanceData = {
    // I - Dönen Varlıklar
    cashOnHand: 0,
    bankBalance: 0,
    readyValuesTotal: 0,
    tradeReceivables: 0,
    tradeReceivablesTotal: 0,
    vatDeductible: 0,
    otherVat: 0,
    otherCurrentAssetsTotal: 0,
    currentAssetsTotal: 0,
    
    // II - Duran Varlıklar
    vehicles: 0,
    fixtures: 0,
    depreciation: 0,
    tangibleAssetsTotal: 0,
    fixedAssetsTotal: 0,
    totalAssets: 0,
    
    // Legacy fields
    inventory: 0,
    partnerReceivables: 0,
    vatReceivable: 0,
    equipment: 0,
    
    // I - Kısa Vadeli Yabancı Kaynaklar
    shortTermBankCredits: 0,
    financialDebtsTotal: 0,
    tradePayables: 0,
    tradePayablesTotal: 0,
    partnerPayables: 0,
    personnelPayables: 0,
    otherDebtsTotal: 0,
    taxPayables: 0,
    socialSecurityPayables: 0,
    deferredTaxLiabilities: 0,
    taxLiabilitiesTotal: 0,
    taxProvision: 0,
    calculatedVatPayable: 0,
    otherShortTermTotal: 0,
    shortTermLoanDebt: 0,
    shortTermTotal: 0,
    
    // II - Uzun Vadeli Yabancı Kaynaklar
    longTermBankLoans: 0,
    bankLoans: 0,
    longTermTotal: 0,
    
    // III - Özkaynaklar
    paidCapital: 0,
    unpaidCapital: 0,
    paidCapitalTotal: 0,
    legalReserves: 0,
    profitReservesTotal: 0,
    retainedEarnings: 0,
    retainedEarningsTotal: 0,
    currentProfit: 0,
    currentLoss: 0,
    periodResultTotal: 0,
    equityTotal: 0,
    
    totalLiabilities: 0,
    isBalanced: true,
    difference: 0,
    
    // Legacy
    vatPayable: 0,
    taxPayable: 0,
  };

  return {
    isLoading: true,
    transactions: [],
    income: [],
    expense: [],
    financing: [],
    investment: [],
    partner: [],
    incomeSummary: { gross: 0, net: 0, vat: 0 },
    expenseSummary: { gross: 0, net: 0, vat: 0, fixed: 0, variable: 0 },
    financingSummary: {
      creditIn: 0,
      creditOut: 0,
      leasingOut: 0,
      interestPaid: 0,
      remainingDebt: 0,
      creditDetails: {
        totalCredit: 0,
        paidAmount: 0,
        remainingAmount: 0,
        monthlyPayment: 0,
        paidMonths: 0,
        remainingMonths: 0
      }
    },
    investmentSummary: { equipment: 0, fixtures: 0, vehicles: 0, other: 0, total: 0, byType: {} },
    partnerSummary: { deposits: 0, withdrawals: 0, balance: 0 },
    vatSummary: { calculated: 0, deductible: 0, net: 0, byMonth: {} },
    balanceData: emptyBalanceData,
    byCategory: {},
    byMonth: {},
    fixedExpenses,
    operatingProfit: 0,
    netProfit: 0,
    profitMargin: 0,
    cashFlowSummary: {
      inflows: 0,
      outflows: 0,
      net: 0,
      outflowsByType: {
        expenses: 0,
        partnerPayments: 0,
        investments: 0,
        financing: 0,
        other: 0
      }
    },
    uncategorizedCount: 0,
    uncategorizedTotal: 0
  };
}
