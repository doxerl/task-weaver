import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { ExpenseCategory, MonthlyDataPoint, MONTH_NAMES_SHORT_TR, CHART_COLORS } from '@/types/reports';

// Fixed expense category codes
const FIXED_EXPENSE_CODES = ['KIRA_OUT', 'SIGORTA', 'YAZILIM', 'TELEKOM', 'MUHASEBE'];

export function useExpenseAnalysis(year: number) {
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { receipts, isLoading: receiptLoading } = useReceipts(year);
  const { categories, isLoading: catLoading } = useCategories();

  const isLoading = txLoading || catLoading || receiptLoading;

  const analysis = useMemo(() => {
    if (isLoading || !categories.length) {
      return {
        expenseCategories: [] as ExpenseCategory[],
        monthlyExpense: [] as MonthlyDataPoint[],
        totalExpense: 0,
        fixedExpense: 0,
        variableExpense: 0,
        avgMonthlyExpense: 0,
        topCategories: [] as ExpenseCategory[],
      };
    }

    // Get expense category IDs (excluding partner, financing, investment)
    const excludedTypes = ['PARTNER', 'FINANCING', 'INVESTMENT', 'EXCLUDED', 'INCOME'];
    const expenseCategories = categories.filter(
      c => c.type === 'EXPENSE' && !excludedTypes.includes(c.type) && c.is_active !== false
    );

    // Filter expense transactions (negative amounts)
    const expenseTransactions = transactions.filter(
      tx => tx.amount && tx.amount < 0 && 
      tx.is_excluded !== true &&
      !categories.find(c => c.id === tx.category_id && excludedTypes.includes(c.type))
    );

    // Expense by Category
    const categoryMap = new Map<string, { amount: number; byMonth: Record<number, number> }>();
    
    expenseTransactions.forEach(tx => {
      const category = categories.find(c => c.id === tx.category_id);
      const code = category?.code || 'DIGER_GIDER';
      const date = new Date(tx.transaction_date || '');
      const month = date.getMonth() + 1;
      const absAmount = Math.abs(tx.amount || 0);
      
      if (!categoryMap.has(code)) {
        categoryMap.set(code, { amount: 0, byMonth: {} });
      }
      
      const entry = categoryMap.get(code)!;
      entry.amount += absAmount;
      entry.byMonth[month] = (entry.byMonth[month] || 0) + absAmount;
    });

    // Add receipt expenses (not linked to bank transactions)
    const unlinkedReceipts = receipts.filter(
      r => !r.linked_bank_transaction_id && 
      r.is_included_in_report !== false &&
      r.total_amount
    );

    unlinkedReceipts.forEach(receipt => {
      const category = categories.find(c => c.id === receipt.category_id);
      const code = category?.code || 'DIGER_GIDER';
      const month = receipt.month || new Date(receipt.receipt_date || '').getMonth() + 1;
      const amount = receipt.total_amount || 0;
      
      if (!categoryMap.has(code)) {
        categoryMap.set(code, { amount: 0, byMonth: {} });
      }
      
      const entry = categoryMap.get(code)!;
      entry.amount += amount;
      entry.byMonth[month] = (entry.byMonth[month] || 0) + amount;
    });

    const totalExpense = Array.from(categoryMap.values()).reduce((sum, s) => sum + s.amount, 0);

    const expenseCategoryList: ExpenseCategory[] = Array.from(categoryMap.entries())
      .map(([code, data], index) => {
        const category = categories.find(c => c.code === code);
        return {
          categoryId: category?.id || '',
          code,
          name: category?.name || 'Diğer Gider',
          amount: data.amount,
          percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
          color: CHART_COLORS.services[index % CHART_COLORS.services.length],
          isFixed: FIXED_EXPENSE_CODES.includes(code),
          byMonth: data.byMonth,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Fixed vs Variable
    const fixedExpense = expenseCategoryList
      .filter(c => c.isFixed)
      .reduce((sum, c) => sum + c.amount, 0);
    const variableExpense = totalExpense - fixedExpense;

    // Monthly Expense
    const monthlyMap = new Map<number, number>();
    for (let m = 1; m <= 12; m++) {
      monthlyMap.set(m, 0);
    }

    expenseTransactions.forEach(tx => {
      const date = new Date(tx.transaction_date || '');
      const month = date.getMonth() + 1;
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + Math.abs(tx.amount || 0));
    });

    unlinkedReceipts.forEach(receipt => {
      const month = receipt.month || new Date(receipt.receipt_date || '').getMonth() + 1;
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + (receipt.total_amount || 0));
    });

    const monthlyExpense: MonthlyDataPoint[] = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, expense]) => ({
        month,
        monthName: MONTH_NAMES_SHORT_TR[month - 1],
        income: 0,
        expense,
        net: -expense,
        cumulativeProfit: 0,
      }));

    return {
      expenseCategories: expenseCategoryList,
      monthlyExpense,
      totalExpense,
      fixedExpense,
      variableExpense,
      avgMonthlyExpense: totalExpense / 12,
      topCategories: expenseCategoryList.slice(0, 10),
    };
  }, [transactions, receipts, categories, isLoading]);

  return {
    ...analysis,
    isLoading,
  };
}
