import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { FinancialCalculations } from '@/types/finance';

export function useFinancialCalculations(year: number): FinancialCalculations & { isLoading: boolean } {
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { receipts, isLoading: rcLoading } = useReceipts(year);
  const { categories, isLoading: catLoading } = useCategories();

  const isLoading = txLoading || rcLoading || catLoading;

  return useMemo(() => {
    if (isLoading || !categories.length) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        operatingProfit: 0,
        profitMargin: 0,
        partnerOut: 0,
        partnerIn: 0,
        netPartnerBalance: 0,
        financingIn: 0,
        receiptTotal: 0,
        byCategory: {},
        byMonth: {},
        uncategorizedCount: 0,
        isLoading
      };
    }

    // Filter active transactions (not excluded)
    const activeTx = transactions.filter(t => !t.is_excluded);
    const activeReceipts = receipts.filter(r => r.is_included_in_report);

    // Get category IDs by type
    const financingIds = categories
      .filter(c => c.type === 'FINANCING' || c.is_financing)
      .map(c => c.id);
    
    const partnerIds = categories
      .filter(c => c.type === 'PARTNER' || c.affects_partner_account)
      .map(c => c.id);
    
    const excludedIds = categories
      .filter(c => c.type === 'EXCLUDED' || c.is_excluded)
      .map(c => c.id);
    
    const skipIds = [...financingIds, ...partnerIds, ...excludedIds];

    // Calculate income (positive amounts, excluding special categories)
    const totalIncome = activeTx
      .filter(t => t.amount > 0 && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate expenses from bank (negative amounts, excluding special categories)
    const expenseFromBank = activeTx
      .filter(t => t.amount < 0 && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate expenses from receipts (unlinked to bank transactions)
    const receiptExpense = activeReceipts
      .filter(r => !r.linked_bank_transaction_id)
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);

    const totalExpenses = expenseFromBank + receiptExpense;
    const operatingProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (operatingProfit / totalIncome) * 100 : 0;

    // Partner account calculations
    const partnerOut = activeTx
      .filter(t => t.amount < 0 && partnerIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const partnerIn = activeTx
      .filter(t => t.amount > 0 && partnerIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    // Financing calculations
    const financingIn = activeTx
      .filter(t => t.amount > 0 && financingIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    // Category breakdown
    const byCategory: Record<string, { income: number; expense: number; name: string; color: string }> = {};
    
    activeTx.forEach(t => {
      if (!t.category_id || excludedIds.includes(t.category_id)) return;
      
      const category = categories.find(c => c.id === t.category_id);
      if (!category) return;
      
      if (!byCategory[t.category_id]) {
        byCategory[t.category_id] = { 
          income: 0, 
          expense: 0, 
          name: category.name, 
          color: category.color 
        };
      }
      
      if (t.amount > 0) {
        byCategory[t.category_id].income += t.amount;
      } else {
        byCategory[t.category_id].expense += Math.abs(t.amount);
      }
    });

    // Monthly breakdown
    const byMonth: Record<number, { income: number; expense: number }> = {};
    for (let m = 1; m <= 12; m++) {
      byMonth[m] = { income: 0, expense: 0 };
    }
    
    activeTx.forEach(t => {
      if (!t.transaction_date || skipIds.includes(t.category_id || '')) return;
      
      const month = new Date(t.transaction_date).getMonth() + 1;
      
      if (t.amount > 0) {
        byMonth[month].income += t.amount;
      } else {
        byMonth[month].expense += Math.abs(t.amount);
      }
    });

    // Add receipt expenses to monthly breakdown
    activeReceipts.forEach(r => {
      if (!r.linked_bank_transaction_id && r.month && r.total_amount) {
        byMonth[r.month].expense += r.total_amount;
      }
    });

    // Uncategorized count
    const uncategorizedCount = 
      activeTx.filter(t => !t.category_id).length + 
      activeReceipts.filter(r => !r.category_id).length;

    return {
      totalIncome,
      totalExpenses,
      operatingProfit,
      profitMargin,
      partnerOut,
      partnerIn,
      netPartnerBalance: partnerIn - partnerOut,
      financingIn,
      receiptTotal: receiptExpense,
      byCategory,
      byMonth,
      uncategorizedCount,
      isLoading
    };
  }, [transactions, receipts, categories, isLoading]);
}
