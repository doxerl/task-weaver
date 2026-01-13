import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { useFinancialSettings } from './useFinancialSettings';
import { useFixedExpenses, FixedExpenseSummary } from './useFixedExpenses';
import { separateVat, VatSeparationResult } from './utils/vatSeparation';

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
  equipment: number;
  vehicles: number;
  other: number;
  total: number;
  byType: Record<string, number>;
}

export interface PartnerSummary {
  deposits: number;
  withdrawals: number;
  balance: number;
}

export interface VatSummary {
  calculated: number;      // Hesaplanan KDV (satışlardan)
  deductible: number;      // İndirilecek KDV (alışlardan)
  net: number;             // Net ödenecek (pozitif) veya devreden (negatif)
  byMonth: Record<number, { calculated: number; deductible: number; net: number }>;
}

export interface BalanceData {
  // Dönen Varlıklar
  bankBalance: number;
  cashOnHand: number;
  inventory: number;
  tradeReceivables: number;
  partnerReceivables: number;
  vatReceivable: number;
  currentAssetsTotal: number;
  
  // Duran Varlıklar
  equipment: number;
  vehicles: number;
  depreciation: number;
  fixedAssetsTotal: number;
  
  // Toplam Aktif
  totalAssets: number;
  
  // Kısa Vadeli Borçlar
  tradePayables: number;
  vatPayable: number;
  taxPayable: number;
  partnerPayables: number;
  shortTermTotal: number;
  
  // Uzun Vadeli Borçlar
  bankLoans: number;
  longTermTotal: number;
  
  // Özkaynaklar
  paidCapital: number;
  retainedEarnings: number;
  currentProfit: number;
  equityTotal: number;
  
  // Toplam Pasif
  totalLiabilities: number;
  
  // Denge kontrolü
  isBalanced: boolean;
  difference: number;
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
  
  // Profit calculations
  operatingProfit: number;
  netProfit: number;
  profitMargin: number;
}

export function useFinancialDataHub(year: number): FinancialDataHub {
  const { transactions: bankTx, isLoading: loadingTx } = useBankTransactions(year);
  const { receipts, isLoading: loadingReceipts } = useReceipts(year);
  const { categories, isLoading: loadingCats } = useCategories();
  const { settings, isLoading: loadingSettings } = useFinancialSettings();
  const { summary: fixedExpenses, isLoading: loadingFixed } = useFixedExpenses();
  
  const isLoading = loadingTx || loadingReceipts || loadingCats || loadingSettings || loadingFixed;

  const hub = useMemo<FinancialDataHub>(() => {
    if (isLoading || !categories?.length) {
      return createEmptyHub(fixedExpenses);
    }

    // Category lookup map
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    // Define category types based on code patterns
    const getCategoryType = (code: string | null): ProcessedTransaction['categoryType'] => {
      if (!code) return 'EXPENSE';
      if (code.includes('EXCLUDED') || code === 'TRANSFER') return 'EXCLUDED';
      if (code.includes('PARTNER')) return 'PARTNER';
      if (code.includes('KREDI') || code.includes('LEASING') || code.includes('FAIZ')) return 'FINANCING';
      if (code.includes('YATIRIM') || code.includes('EKIPMAN') || code.includes('ARAC')) return 'INVESTMENT';
      if (code.includes('GELIR') || code.includes('HIZMET') || code.includes('SATIS')) return 'INCOME';
      return 'EXPENSE';
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
      
      const catType = cat ? getCategoryType(cat.code) : (tx.amount && tx.amount > 0 ? 'INCOME' : 'EXPENSE');
      const isIncome = tx.amount != null && tx.amount > 0;
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
        source: 'bank'
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
          source: 'receipt'
        });
      });

    // Also add issued receipts for VAT calculation (they represent income VAT)
    const issuedReceipts = receipts.filter(r => r.document_type === 'issued');

    // Categorize transactions
    const income = processedTx.filter(t => t.categoryType === 'INCOME' || (t.isIncome && t.categoryType !== 'FINANCING' && t.categoryType !== 'PARTNER'));
    const expense = processedTx.filter(t => t.categoryType === 'EXPENSE' || (!t.isIncome && t.categoryType !== 'FINANCING' && t.categoryType !== 'PARTNER' && t.categoryType !== 'INVESTMENT' && t.categoryType !== 'EXCLUDED'));
    const financing = processedTx.filter(t => t.categoryType === 'FINANCING');
    const investment = processedTx.filter(t => t.categoryType === 'INVESTMENT');
    const partner = processedTx.filter(t => t.categoryType === 'PARTNER');

    // Income summary
    const incomeSummary = {
      gross: income.reduce((sum, t) => sum + t.gross, 0),
      net: income.reduce((sum, t) => sum + t.net, 0),
      vat: income.reduce((sum, t) => sum + t.vat, 0)
    };

    // Expense summary
    const fixedExpenseAmount = expense.filter(t => t.expenseBehavior === 'fixed').reduce((sum, t) => sum + t.net, 0);
    const variableExpenseAmount = expense.filter(t => t.expenseBehavior !== 'fixed').reduce((sum, t) => sum + t.net, 0);
    
    const expenseSummary = {
      gross: expense.reduce((sum, t) => sum + t.gross, 0),
      net: expense.reduce((sum, t) => sum + t.net, 0),
      vat: expense.reduce((sum, t) => sum + t.vat, 0),
      fixed: fixedExpenseAmount,
      variable: variableExpenseAmount
    };

    // Financing summary
    const creditIn = financing.filter(t => t.isIncome && t.categoryCode?.includes('KREDI')).reduce((sum, t) => sum + t.gross, 0);
    const creditOut = financing.filter(t => !t.isIncome && t.categoryCode?.includes('KREDI')).reduce((sum, t) => sum + t.gross, 0);
    const leasingOut = financing.filter(t => !t.isIncome && t.categoryCode?.includes('LEASING')).reduce((sum, t) => sum + t.gross, 0);
    const interestPaid = financing.filter(t => !t.isIncome && t.categoryCode?.includes('FAIZ')).reduce((sum, t) => sum + t.gross, 0);
    
    const financingSummary: FinancingSummary = {
      creditIn,
      creditOut,
      leasingOut,
      interestPaid,
      remainingDebt: (settings?.bank_loans || 0) + creditIn - creditOut - leasingOut,
      creditDetails: {
        totalCredit: creditIn || (settings?.bank_loans || 0),
        paidAmount: creditOut,
        remainingAmount: (settings?.bank_loans || 0) + creditIn - creditOut,
        monthlyPayment: fixedExpenses.installmentDetails[0]?.monthlyAmount || 0,
        paidMonths: fixedExpenses.installmentDetails[0]?.definition.installments_paid || 0,
        remainingMonths: fixedExpenses.installmentDetails[0]?.remainingMonths || 0
      }
    };

    // Investment summary
    const investmentSummary: InvestmentSummary = {
      equipment: investment.filter(t => t.categoryCode?.includes('EKIPMAN')).reduce((sum, t) => sum + t.gross, 0) + (settings?.equipment_value || 0),
      vehicles: investment.filter(t => t.categoryCode?.includes('ARAC')).reduce((sum, t) => sum + t.gross, 0) + (settings?.vehicles_value || 0),
      other: investment.filter(t => !t.categoryCode?.includes('EKIPMAN') && !t.categoryCode?.includes('ARAC')).reduce((sum, t) => sum + t.gross, 0),
      total: 0,
      byType: {}
    };
    investmentSummary.total = investmentSummary.equipment + investmentSummary.vehicles + investmentSummary.other;

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
      const monthIncome = monthTx.filter(t => t.categoryType === 'INCOME' || (t.isIncome && t.categoryType !== 'FINANCING' && t.categoryType !== 'PARTNER'));
      const monthExpense = monthTx.filter(t => t.categoryType === 'EXPENSE' || (!t.isIncome && t.categoryType !== 'FINANCING' && t.categoryType !== 'PARTNER' && t.categoryType !== 'INVESTMENT'));
      const monthFinancing = monthTx.filter(t => t.categoryType === 'FINANCING');
      const monthInvestment = monthTx.filter(t => t.categoryType === 'INVESTMENT');
      const monthPartner = monthTx.filter(t => t.categoryType === 'PARTNER');
      
      byMonth[m] = {
        month: m,
        income: {
          gross: monthIncome.reduce((sum, t) => sum + t.gross, 0),
          net: monthIncome.reduce((sum, t) => sum + t.net, 0),
          vat: monthIncome.reduce((sum, t) => sum + t.vat, 0)
        },
        expense: {
          gross: monthExpense.reduce((sum, t) => sum + t.gross, 0),
          net: monthExpense.reduce((sum, t) => sum + t.net, 0),
          vat: monthExpense.reduce((sum, t) => sum + t.vat, 0),
          fixed: monthExpense.filter(t => t.expenseBehavior === 'fixed').reduce((sum, t) => sum + t.net, 0),
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
        net: monthIncome.reduce((sum, t) => sum + t.net, 0) - monthExpense.reduce((sum, t) => sum + t.net, 0)
      };
    }

    // Profit calculations
    const operatingProfit = incomeSummary.net - expenseSummary.net;
    const netProfit = operatingProfit - interestPaid;
    const profitMargin = incomeSummary.net > 0 ? (operatingProfit / incomeSummary.net) * 100 : 0;

    // Balance sheet data calculation
    // Bank balance from latest transaction
    const sortedBankTx = [...bankTx].sort((a, b) => 
      new Date(b.transaction_date || 0).getTime() - new Date(a.transaction_date || 0).getTime()
    );
    const bankBalance = sortedBankTx[0]?.balance || 0;
    
    // Partner receivables/payables - net calculation
    const partnerReceivables = partnerSummary.withdrawals > partnerSummary.deposits 
      ? partnerSummary.withdrawals - partnerSummary.deposits 
      : 0;
    const partnerPayables = partnerSummary.deposits > partnerSummary.withdrawals 
      ? partnerSummary.deposits - partnerSummary.withdrawals 
      : 0;
    
    // VAT - positive = payable, negative = receivable
    const vatPayable = vatSummary.net > 0 ? vatSummary.net : 0;
    const vatReceivable = vatSummary.net < 0 ? Math.abs(vatSummary.net) : 0;
    
    // Current assets
    const cashOnHand = settings?.cash_on_hand || 0;
    const inventoryValue = settings?.inventory_value || 0;
    const tradeReceivables = settings?.trade_receivables || 0;
    const currentAssetsTotal = cashOnHand + bankBalance + tradeReceivables + partnerReceivables + vatReceivable + inventoryValue;
    
    // Fixed assets - include year purchases
    const equipmentPurchases = investment.filter(t => t.categoryCode?.includes('EKIPMAN')).reduce((sum, t) => sum + t.gross, 0);
    const vehiclePurchases = investment.filter(t => t.categoryCode?.includes('ARAC')).reduce((sum, t) => sum + t.gross, 0);
    const equipmentTotal = (settings?.equipment_value || 0) + equipmentPurchases;
    const vehiclesTotal = (settings?.vehicles_value || 0) + vehiclePurchases;
    const depreciationTotal = settings?.accumulated_depreciation || 0;
    const fixedAssetsTotal = equipmentTotal + vehiclesTotal - depreciationTotal;
    
    const totalAssets = currentAssetsTotal + fixedAssetsTotal;
    
    // Short term liabilities
    const tradePayables = settings?.trade_payables || 0;
    const shortTermTotal = tradePayables + vatPayable + partnerPayables;
    
    // Long term liabilities
    const bankLoansBalance = Math.max(0, financingSummary.remainingDebt);
    const longTermTotal = bankLoansBalance;
    
    // Equity
    const paidCapital = settings?.paid_capital || 0;
    const retainedEarnings = settings?.retained_earnings || 0;
    const equityTotal = paidCapital + retainedEarnings + operatingProfit;
    
    const totalLiabilities = shortTermTotal + longTermTotal + equityTotal;
    const difference = totalAssets - totalLiabilities;
    const isBalanced = Math.abs(difference) < 0.01;
    
    const balanceData: BalanceData = {
      bankBalance,
      cashOnHand,
      inventory: inventoryValue,
      tradeReceivables,
      partnerReceivables,
      vatReceivable,
      currentAssetsTotal,
      equipment: equipmentTotal,
      vehicles: vehiclesTotal,
      depreciation: depreciationTotal,
      fixedAssetsTotal,
      totalAssets,
      tradePayables,
      vatPayable,
      taxPayable: 0,
      partnerPayables,
      shortTermTotal,
      bankLoans: bankLoansBalance,
      longTermTotal,
      paidCapital,
      retainedEarnings,
      currentProfit: operatingProfit,
      equityTotal,
      totalLiabilities,
      isBalanced,
      difference
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
      profitMargin
    };
  }, [isLoading, bankTx, receipts, categories, settings, fixedExpenses]);

  return hub;
}

function createEmptyHub(fixedExpenses: FixedExpenseSummary): FinancialDataHub {
  const emptyBalanceData: BalanceData = {
    bankBalance: 0,
    cashOnHand: 0,
    inventory: 0,
    tradeReceivables: 0,
    partnerReceivables: 0,
    vatReceivable: 0,
    currentAssetsTotal: 0,
    equipment: 0,
    vehicles: 0,
    depreciation: 0,
    fixedAssetsTotal: 0,
    totalAssets: 0,
    tradePayables: 0,
    vatPayable: 0,
    taxPayable: 0,
    partnerPayables: 0,
    shortTermTotal: 0,
    bankLoans: 0,
    longTermTotal: 0,
    paidCapital: 0,
    retainedEarnings: 0,
    currentProfit: 0,
    equityTotal: 0,
    totalLiabilities: 0,
    isBalanced: true,
    difference: 0
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
    investmentSummary: { equipment: 0, vehicles: 0, other: 0, total: 0, byType: {} },
    partnerSummary: { deposits: 0, withdrawals: 0, balance: 0 },
    vatSummary: { calculated: 0, deductible: 0, net: 0, byMonth: {} },
    balanceData: emptyBalanceData,
    byCategory: {},
    byMonth: {},
    fixedExpenses,
    operatingProfit: 0,
    netProfit: 0,
    profitMargin: 0
  };
}
