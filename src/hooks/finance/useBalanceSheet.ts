import { useMemo } from 'react';
import { useFinancialDataHub, BalanceData } from './useFinancialDataHub';
import { BalanceSheet } from '@/types/finance';

export function useBalanceSheet(year: number): { balanceSheet: BalanceSheet; isLoading: boolean } {
  const hub = useFinancialDataHub(year);

  return useMemo(() => {
    if (hub.isLoading) {
      const emptyBalanceSheet: BalanceSheet = {
        asOfDate: `${year}-12-31`,
        year,
        currentAssets: { cash: 0, banks: 0, receivables: 0, partnerReceivables: 0, vatReceivable: 0, inventory: 0, prepaidExpenses: 0, total: 0 },
        fixedAssets: { equipment: 0, vehicles: 0, depreciation: 0, total: 0 },
        totalAssets: 0,
        shortTermLiabilities: { payables: 0, vatPayable: 0, taxPayable: 0, partnerPayables: 0, total: 0 },
        longTermLiabilities: { bankLoans: 0, total: 0 },
        equity: { paidCapital: 0, retainedEarnings: 0, currentProfit: 0, total: 0 },
        totalLiabilities: 0,
        isBalanced: true,
        difference: 0,
      };
      return { balanceSheet: emptyBalanceSheet, isLoading: true };
    }

    const { balanceData } = hub;

    // Build balance sheet from hub's balanceData
    const currentAssets = {
      cash: balanceData.cashOnHand,
      banks: balanceData.bankBalance,
      receivables: balanceData.tradeReceivables,
      partnerReceivables: balanceData.partnerReceivables,
      vatReceivable: balanceData.vatReceivable,
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
      vatPayable: balanceData.vatPayable,
      taxPayable: balanceData.taxPayable,
      partnerPayables: balanceData.partnerPayables,
      total: balanceData.shortTermTotal,
    };

    const longTermLiabilities = {
      bankLoans: balanceData.bankLoans,
      total: balanceData.longTermTotal,
    };

    const equity = {
      paidCapital: balanceData.paidCapital,
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

    return { balanceSheet, isLoading: false };
  }, [hub.isLoading, hub.balanceData, year]);
}
