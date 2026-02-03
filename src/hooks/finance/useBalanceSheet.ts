import { useMemo } from 'react';
import { useFinancialDataHub, CashFlowSummary } from './useFinancialDataHub';
import { useYearlyBalanceSheet } from './useYearlyBalanceSheet';
import { useIncomeStatement } from './useIncomeStatement';
import { BalanceSheet } from '@/types/finance';

// Stable default values outside hook to prevent recreation on each render
const EMPTY_BALANCE_DATA = {
  cashOnHand: 0, bankBalance: 0, tradeReceivables: 0, partnerReceivables: 0,
  vatDeductible: 0, otherVat: 0, inventory: 0, currentAssetsTotal: 0,
  equipment: 0, vehicles: 0, depreciation: 0, fixedAssetsTotal: 0, totalAssets: 0,
  tradePayables: 0, calculatedVatPayable: 0, taxPayable: 0, partnerPayables: 0,
  personnelPayables: 0, taxPayables: 0, socialSecurityPayables: 0,
  deferredTaxLiabilities: 0, taxProvision: 0, shortTermLoanDebt: 0, shortTermTotal: 0,
  bankLoans: 0, longTermTotal: 0,
  paidCapital: 0, unpaidCapital: 0, retainedEarnings: 0, currentProfit: 0,
};

const EMPTY_CASH_FLOW_SUMMARY: CashFlowSummary = {
  inflows: 0,
  outflows: 0,
  net: 0,
  outflowsByType: { expenses: 0, partnerPayments: 0, investments: 0, financing: 0, other: 0 }
};

export function useBalanceSheet(year: number): { 
  balanceSheet: BalanceSheet; 
  isLoading: boolean; 
  uncategorizedCount: number; 
  uncategorizedTotal: number;
  isLocked: boolean;
  lockBalance: (lock: boolean) => void;
  saveYearlyBalance: (data: any) => void;
  isUpdating: boolean;
  // Financial summaries
  operatingProfit: number;
  incomeSummaryNet: number;
  expenseSummaryNet: number;
  cashFlowSummary: CashFlowSummary;
} {
  const { 
    yearlyBalance, 
    isLoading: isYearlyLoading, 
    isLocked, 
    lockBalance, 
    upsertBalance, 
    isUpdating 
  } = useYearlyBalanceSheet(year);
  
  // Pass manual bank_balance from yearly_balance_sheets to hub if set
  const manualBankBalance = yearlyBalance?.bank_balance;
  const hub = useFinancialDataHub(year, manualBankBalance);
  const incomeStatement = useIncomeStatement(year);

  // Extract stable references using module-level constants for defaults
  const hubIsLoading = hub?.isLoading ?? true;
  const hubBalanceData = hub?.balanceData ?? EMPTY_BALANCE_DATA;
  const hubUncategorizedCount = hub?.uncategorizedCount ?? 0;
  const hubUncategorizedTotal = hub?.uncategorizedTotal ?? 0;
  const hubOperatingProfit = hub?.operatingProfit ?? 0;
  const hubIncomeSummaryNet = hub?.incomeSummary?.net ?? 0;
  const hubExpenseSummaryNet = hub?.expenseSummary?.net ?? 0;
  const hubCashFlowSummary = hub?.cashFlowSummary ?? EMPTY_CASH_FLOW_SUMMARY;
  const incomeStatementNetProfit = incomeStatement?.statement?.netProfit;

  return useMemo(() => {
    const loading = hubIsLoading || isYearlyLoading;
    
    if (loading) {
      const emptyBalanceSheet: BalanceSheet = {
        asOfDate: `${year}-12-31`,
        year,
        currentAssets: { cash: 0, banks: 0, receivables: 0, partnerReceivables: 0, vatReceivable: 0, inventory: 0, prepaidExpenses: 0, total: 0 },
        fixedAssets: { equipment: 0, vehicles: 0, depreciation: 0, total: 0 },
        totalAssets: 0,
        shortTermLiabilities: { payables: 0, vatPayable: 0, taxPayable: 0, partnerPayables: 0, loanInstallments: 0, total: 0 },
        longTermLiabilities: { bankLoans: 0, total: 0 },
        equity: { paidCapital: 0, retainedEarnings: 0, currentProfit: 0, total: 0 },
        totalLiabilities: 0,
        isBalanced: true,
        difference: 0,
      };
      const emptyCashFlowSummary: CashFlowSummary = {
        inflows: 0,
        outflows: 0,
        net: 0,
        outflowsByType: { expenses: 0, partnerPayments: 0, investments: 0, financing: 0, other: 0 }
      };
      return { 
        balanceSheet: emptyBalanceSheet, 
        isLoading: true, 
        uncategorizedCount: 0, 
        uncategorizedTotal: 0,
        isLocked: false,
        lockBalance,
        saveYearlyBalance: upsertBalance,
        isUpdating,
        operatingProfit: 0,
        incomeSummaryNet: 0,
        expenseSummaryNet: 0,
        cashFlowSummary: emptyCashFlowSummary,
      };
    }

    // If year is locked, use fixed values from yearly_balance_sheets table
    // Kilitli veri = Resmi veri, alt toplamları yeniden hesaplama
    if (isLocked && yearlyBalance) {
      // Özkaynak toplamı
      const equityTotal = yearlyBalance.paid_capital - yearlyBalance.unpaid_capital + 
                          yearlyBalance.retained_earnings + yearlyBalance.current_profit;
      
      // Kısa vadeli borçlar toplamını tersine hesapla (total_liabilities - uzun vadeli - özkaynak)
      // Bu şekilde alt toplamlar her zaman kayıtlı total_liabilities ile tutarlı olur
      const shortTermTotal = yearlyBalance.total_liabilities - yearlyBalance.bank_loans - equityTotal;

      const lockedBalanceSheet: BalanceSheet = {
        asOfDate: `${year}-12-31`,
        year,
        currentAssets: {
          cash: yearlyBalance.cash_on_hand,
          banks: yearlyBalance.bank_balance,
          receivables: yearlyBalance.trade_receivables,
          partnerReceivables: yearlyBalance.partner_receivables,
          vatReceivable: yearlyBalance.vat_receivable,
          otherVat: yearlyBalance.other_vat,
          inventory: yearlyBalance.inventory,
          prepaidExpenses: 0,
          total: yearlyBalance.cash_on_hand + yearlyBalance.bank_balance + 
                 yearlyBalance.trade_receivables + yearlyBalance.partner_receivables + 
                 yearlyBalance.vat_receivable + yearlyBalance.other_vat + yearlyBalance.inventory,
        },
        fixedAssets: {
          equipment: yearlyBalance.fixtures,
          vehicles: yearlyBalance.vehicles,
          depreciation: yearlyBalance.accumulated_depreciation,
          total: yearlyBalance.vehicles + yearlyBalance.fixtures - yearlyBalance.accumulated_depreciation,
        },
        totalAssets: yearlyBalance.total_assets,
        shortTermLiabilities: {
          payables: yearlyBalance.trade_payables,
          vatPayable: yearlyBalance.vat_payable,
          taxPayable: yearlyBalance.tax_payables,
          partnerPayables: yearlyBalance.partner_payables,
          personnelPayables: yearlyBalance.personnel_payables,
          taxPayables: yearlyBalance.tax_payables,
          socialSecurityPayables: yearlyBalance.social_security_payables,
          deferredTaxLiabilities: yearlyBalance.deferred_tax_liabilities,
          taxProvision: yearlyBalance.tax_provision,
          loanInstallments: yearlyBalance.short_term_loan_debt,
          // Tersine hesaplanan toplam - kayıtlı total_liabilities ile tutarlı
          total: shortTermTotal,
        },
        longTermLiabilities: {
          bankLoans: yearlyBalance.bank_loans,
          total: yearlyBalance.bank_loans,
        },
        equity: {
          paidCapital: yearlyBalance.paid_capital,
          unpaidCapital: yearlyBalance.unpaid_capital,
          retainedEarnings: yearlyBalance.retained_earnings,
          currentProfit: yearlyBalance.current_profit,
          total: equityTotal,
        },
        // Kilitli veri = Resmi onaylı, toplam değerleri doğrudan kullan
        totalLiabilities: yearlyBalance.total_liabilities,
        // Kilitli veri resmi olarak dengede kabul edilir
        isBalanced: true,
        difference: 0,
      };

      return { 
        balanceSheet: lockedBalanceSheet, 
        isLoading: false, 
        uncategorizedCount: 0, 
        uncategorizedTotal: 0,
        isLocked: true,
        lockBalance,
        saveYearlyBalance: upsertBalance,
        isUpdating,
        // Use hub data even for locked years to show historical cash flow
        operatingProfit: hubOperatingProfit,
        incomeSummaryNet: hubIncomeSummaryNet,
        expenseSummaryNet: hubExpenseSummaryNet,
        cashFlowSummary: hubCashFlowSummary,
      };
    }

    // Dynamic calculation from hub (use pre-extracted stable reference)
    const balanceData = hubBalanceData;
    // Build balance sheet from hub's balanceData
    const currentAssets = {
      cash: balanceData.cashOnHand,
      banks: balanceData.bankBalance,
      receivables: balanceData.tradeReceivables,
      partnerReceivables: balanceData.partnerReceivables,
      vatReceivable: balanceData.vatDeductible,
      otherVat: balanceData.otherVat,
      inventory: balanceData.inventory,
      prepaidExpenses: 0,
      total: balanceData.currentAssetsTotal,
    };

    const fixedAssets = {
      equipment: balanceData.equipment,
      vehicles: balanceData.vehicles,
      depreciation: balanceData.depreciation,
      total: balanceData.fixedAssetsTotal,
    };

    const shortTermLiabilities = {
      payables: balanceData.tradePayables,
      vatPayable: balanceData.calculatedVatPayable,
      taxPayable: balanceData.taxPayable,
      partnerPayables: balanceData.partnerPayables,
      personnelPayables: balanceData.personnelPayables,
      taxPayables: balanceData.taxPayables,
      socialSecurityPayables: balanceData.socialSecurityPayables,
      deferredTaxLiabilities: balanceData.deferredTaxLiabilities,
      taxProvision: balanceData.taxProvision,
      loanInstallments: balanceData.shortTermLoanDebt,
      total: balanceData.shortTermTotal,
    };

    const longTermLiabilities = {
      bankLoans: balanceData.bankLoans,
      total: balanceData.longTermTotal,
    };

    // Dönem karını gelir tablosundan al (tutarlılık için)
    const currentProfitFromIncomeStatement = incomeStatementNetProfit ?? balanceData.currentProfit;
    
    const equity = {
      paidCapital: balanceData.paidCapital,
      unpaidCapital: balanceData.unpaidCapital,
      retainedEarnings: balanceData.retainedEarnings,
      currentProfit: currentProfitFromIncomeStatement,
      total: balanceData.paidCapital - balanceData.unpaidCapital + balanceData.retainedEarnings + currentProfitFromIncomeStatement,
    };

    // Özsermaye değişikliğine göre toplam pasif ve dengeyi yeniden hesapla
    const newTotalLiabilities = shortTermLiabilities.total + longTermLiabilities.total + equity.total;
    const newDifference = balanceData.totalAssets - newTotalLiabilities;
    const newIsBalanced = Math.abs(newDifference) < 1;

    const balanceSheet: BalanceSheet = {
      asOfDate: `${year}-12-31`,
      year,
      currentAssets,
      fixedAssets,
      totalAssets: balanceData.totalAssets,
      shortTermLiabilities,
      longTermLiabilities,
      equity,
      totalLiabilities: newTotalLiabilities,
      isBalanced: newIsBalanced,
      difference: newDifference,
    };

    return { 
      balanceSheet, 
      isLoading: false, 
      uncategorizedCount: hubUncategorizedCount, 
      uncategorizedTotal: hubUncategorizedTotal,
      isLocked: false,
      lockBalance,
      saveYearlyBalance: upsertBalance,
      isUpdating,
      operatingProfit: hubOperatingProfit,
      incomeSummaryNet: hubIncomeSummaryNet,
      expenseSummaryNet: hubExpenseSummaryNet,
      cashFlowSummary: hubCashFlowSummary,
    };
  }, [hubIsLoading, hubBalanceData, hubUncategorizedCount, hubUncategorizedTotal, hubOperatingProfit, hubIncomeSummaryNet, hubExpenseSummaryNet, hubCashFlowSummary, year, isYearlyLoading, isLocked, yearlyBalance, lockBalance, upsertBalance, isUpdating, incomeStatementNetProfit]);
}
