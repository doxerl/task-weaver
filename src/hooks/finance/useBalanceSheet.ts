import { useMemo } from 'react';
import { useFinancialDataHub } from './useFinancialDataHub';
import { useYearlyBalanceSheet } from './useYearlyBalanceSheet';
import { BalanceSheet } from '@/types/finance';

export function useBalanceSheet(year: number): { 
  balanceSheet: BalanceSheet; 
  isLoading: boolean; 
  uncategorizedCount: number; 
  uncategorizedTotal: number;
  isLocked: boolean;
  lockBalance: (lock: boolean) => void;
  saveYearlyBalance: (data: any) => void;
  isUpdating: boolean;
} {
  const hub = useFinancialDataHub(year);
  const { 
    yearlyBalance, 
    isLoading: isYearlyLoading, 
    isLocked, 
    lockBalance, 
    upsertBalance, 
    isUpdating 
  } = useYearlyBalanceSheet(year);

  return useMemo(() => {
    const loading = hub.isLoading || isYearlyLoading;
    
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
      return { 
        balanceSheet: emptyBalanceSheet, 
        isLoading: true, 
        uncategorizedCount: 0, 
        uncategorizedTotal: 0,
        isLocked: false,
        lockBalance,
        saveYearlyBalance: upsertBalance,
        isUpdating,
      };
    }

    // If year is locked, use fixed values from yearly_balance_sheets table
    if (isLocked && yearlyBalance) {
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
          total: yearlyBalance.trade_payables + yearlyBalance.partner_payables + 
                 yearlyBalance.tax_payables + yearlyBalance.social_security_payables +
                 yearlyBalance.deferred_tax_liabilities + yearlyBalance.tax_provision +
                 yearlyBalance.personnel_payables + yearlyBalance.short_term_loan_debt,
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
          total: yearlyBalance.paid_capital - yearlyBalance.unpaid_capital + 
                 yearlyBalance.retained_earnings + yearlyBalance.current_profit,
        },
        totalLiabilities: yearlyBalance.total_liabilities,
        isBalanced: Math.abs(yearlyBalance.total_assets - yearlyBalance.total_liabilities) < 0.01,
        difference: yearlyBalance.total_assets - yearlyBalance.total_liabilities,
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
      };
    }

    // Dynamic calculation from hub
    const { balanceData } = hub;

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

    const equity = {
      paidCapital: balanceData.paidCapital,
      unpaidCapital: balanceData.unpaidCapital,
      retainedEarnings: balanceData.retainedEarnings,
      currentProfit: balanceData.currentProfit,
      total: balanceData.equityTotal,
    };

    const balanceSheet: BalanceSheet = {
      asOfDate: `${year}-12-31`,
      year,
      currentAssets,
      fixedAssets,
      totalAssets: balanceData.totalAssets,
      shortTermLiabilities,
      longTermLiabilities,
      equity,
      totalLiabilities: balanceData.totalLiabilities,
      isBalanced: balanceData.isBalanced,
      difference: balanceData.difference,
    };

    return { 
      balanceSheet, 
      isLoading: false, 
      uncategorizedCount: hub.uncategorizedCount, 
      uncategorizedTotal: hub.uncategorizedTotal,
      isLocked: false,
      lockBalance,
      saveYearlyBalance: upsertBalance,
      isUpdating,
    };
  }, [hub.isLoading, hub.balanceData, hub.uncategorizedCount, hub.uncategorizedTotal, year, isYearlyLoading, isLocked, yearlyBalance, lockBalance, upsertBalance, isUpdating]);
}
