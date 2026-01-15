import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { usePayrollAccruals } from './usePayrollAccruals';
import { ExpenseCategory, MonthlyDataPoint, MONTH_NAMES_SHORT_TR, CHART_COLORS } from '@/types/reports';

// Fixed expense category codes
const FIXED_EXPENSE_CODES = ['KIRA_OUT', 'SIGORTA', 'YAZILIM', 'TELEKOM', 'MUHASEBE', 'PERSONEL'];

export function useExpenseAnalysis(year: number) {
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { receipts, isLoading: receiptLoading } = useReceipts(year);
  const { categories, isLoading: catLoading } = useCategories();
  const { summary: payrollSummary, accruals: payrollAccruals, isLoading: payrollLoading } = usePayrollAccruals(year);

  const isLoading = txLoading || catLoading || receiptLoading || payrollLoading;

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

    // Exclude partner, financing, investment, and excluded categories from expenses
    const excludedTypes = ['PARTNER', 'FINANCING', 'INVESTMENT', 'EXCLUDED', 'INCOME'];
    
    // Get IDs of categories that should be excluded from operating expenses
    const excludedCategoryIds = new Set(
      categories
        .filter(c => excludedTypes.includes(c.type) || c.is_financing || c.affects_partner_account)
        .map(c => c.id)
    );
    
    // Payroll category codes to exclude (we'll add from payroll_accruals instead)
    const payrollCategoryCodes = ['PERSONEL', 'PERSONEL_UCRET', 'PERSONEL_SGK', 'PERSONEL_ISVEREN', 'PERSONEL_PRIM'];

    // Filter expense transactions (negative amounts, excluding special categories and payroll)
    const expenseTransactions = transactions.filter(tx => {
      if (!tx.amount || tx.amount >= 0 || tx.is_excluded) return false;
      // Exclude financing, investment, partner, and excluded categories
      if (tx.category_id && excludedCategoryIds.has(tx.category_id)) return false;
      
      // Exclude payroll categories (will add from payroll_accruals)
      const category = categories.find(c => c.id === tx.category_id);
      if (category && payrollCategoryCodes.some(code => (category.code || '').toUpperCase().includes(code))) {
        return false;
      }
      
      return true;
    });

    // Expense by Category - Use NET amounts (KDV hariç)
    const categoryMap = new Map<string, { amount: number; byMonth: Record<number, number> }>();
    
    expenseTransactions.forEach(tx => {
      const category = categories.find(c => c.id === tx.category_id);
      const code = category?.code || 'DIGER_GIDER';
      const date = new Date(tx.transaction_date || '');
      const month = date.getMonth() + 1;
      
      // Use net_amount if available, otherwise calculate (KDV hariç)
      const absAmount = Math.abs(tx.amount || 0);
      const netAmount = tx.net_amount !== undefined && tx.net_amount !== null
        ? Math.abs(tx.net_amount)
        : (tx.is_commercial !== false ? absAmount / 1.20 : absAmount);
      
      if (!categoryMap.has(code)) {
        categoryMap.set(code, { amount: 0, byMonth: {} });
      }
      
      const entry = categoryMap.get(code)!;
      entry.amount += netAmount;
      entry.byMonth[month] = (entry.byMonth[month] || 0) + netAmount;
    });

    // Add receipt expenses (all received receipts, not linked to bank transactions)
    // Use NET amounts (KDV hariç)
    const unlinkedReceipts = receipts.filter(
      r => !r.linked_bank_transaction_id && 
      r.document_type !== 'issued' &&
      r.total_amount
    );

    unlinkedReceipts.forEach(receipt => {
      const category = categories.find(c => c.id === receipt.category_id);
      const code = category?.code || 'DIGER_GIDER';
      const month = receipt.month || new Date(receipt.receipt_date || '').getMonth() + 1;
      
      // Use KDV hariç (net) amount
      const total = receipt.total_amount || 0;
      const netAmount = receipt.vat_amount 
        ? total - receipt.vat_amount 
        : total / 1.20; // Fallback: assume 20% VAT
      
      if (!categoryMap.has(code)) {
        categoryMap.set(code, { amount: 0, byMonth: {} });
      }
      
      const entry = categoryMap.get(code)!;
      entry.amount += netAmount;
      entry.byMonth[month] = (entry.byMonth[month] || 0) + netAmount;
    });

    // Add personnel expense from payroll accruals (Brüt Ücret + İşveren SGK + İşsizlik Primi)
    if (payrollSummary.totalPersonnelExpense > 0) {
      // Calculate monthly distribution from payroll accruals
      const payrollByMonth: Record<number, number> = {};
      payrollAccruals.forEach(accrual => {
        const monthExpense = accrual.grossSalary + accrual.employerSgkPayable + accrual.unemploymentPayable;
        payrollByMonth[accrual.month] = (payrollByMonth[accrual.month] || 0) + monthExpense;
      });
      
      categoryMap.set('PERSONEL', {
        amount: payrollSummary.totalPersonnelExpense,
        byMonth: payrollByMonth,
      });
    }

    const totalExpense = Array.from(categoryMap.values()).reduce((sum, s) => sum + s.amount, 0);

    const expenseCategoryList: ExpenseCategory[] = Array.from(categoryMap.entries())
      .map(([code, data], index) => {
        const category = categories.find(c => c.code === code);
        const isPersonnel = code === 'PERSONEL';
        return {
          categoryId: category?.id || (isPersonnel ? 'payroll' : ''),
          code,
          name: isPersonnel ? 'Personel Giderleri' : (category?.name || 'Diğer Gider'),
          amount: data.amount,
          percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
          color: isPersonnel ? '#8B5CF6' : CHART_COLORS.services[index % CHART_COLORS.services.length],
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

    // Monthly expense totals - use NET amounts
    expenseTransactions.forEach(tx => {
      const date = new Date(tx.transaction_date || '');
      const month = date.getMonth() + 1;
      
      const absAmount = Math.abs(tx.amount || 0);
      const netAmount = tx.net_amount !== undefined && tx.net_amount !== null
        ? Math.abs(tx.net_amount)
        : (tx.is_commercial !== false ? absAmount / 1.20 : absAmount);
        
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + netAmount);
    });

    unlinkedReceipts.forEach(receipt => {
      const month = receipt.month || new Date(receipt.receipt_date || '').getMonth() + 1;
      const total = receipt.total_amount || 0;
      const netAmount = receipt.vat_amount ? total - receipt.vat_amount : total / 1.20;
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + netAmount);
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
  }, [transactions, receipts, categories, isLoading, payrollSummary, payrollAccruals]);

  return {
    ...analysis,
    isLoading,
  };
}
