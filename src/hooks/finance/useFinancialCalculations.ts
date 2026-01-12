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
        financingOut: 0,
        investmentOut: 0,
        receiptTotal: 0,
        byCategory: {},
        byMonth: {},
        byInvestmentType: {},
        uncategorizedCount: 0,
        calculatedVat: 0,
        deductibleVat: 0,
        netVatPayable: 0,
        netRevenue: 0,
        netCost: 0,
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
    
    const investmentIds = categories
      .filter(c => c.type === 'INVESTMENT')
      .map(c => c.id);
    
    const partnerIds = categories
      .filter(c => c.type === 'PARTNER' || c.affects_partner_account)
      .map(c => c.id);
    
    const excludedIds = categories
      .filter(c => c.type === 'EXCLUDED' || c.is_excluded)
      .map(c => c.id);
    
    const skipIds = [...financingIds, ...partnerIds, ...excludedIds, ...investmentIds];

    // Calculate income (positive amounts, excluding special categories)
    // Use net_amount if available (VAT separated), otherwise calculate from amount
    const totalIncome = activeTx
      .filter(t => t.amount > 0 && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    // Net revenue (KDV hariç ciro)
    const netRevenue = activeTx
      .filter(t => t.amount > 0 && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => {
        // Use net_amount if available, otherwise calculate (amount / 1.20 for commercial)
        if (t.net_amount !== undefined && t.net_amount !== null) {
          return sum + t.net_amount;
        }
        // Fallback: assume 20% VAT for commercial transactions
        return sum + (t.is_commercial !== false ? t.amount / 1.20 : t.amount);
      }, 0);

    // Calculate expenses from bank (negative amounts, excluding special categories)
    const expenseFromBank = activeTx
      .filter(t => t.amount < 0 && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Net cost (KDV hariç gider)
    const netCost = activeTx
      .filter(t => t.amount < 0 && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => {
        const absAmount = Math.abs(t.amount);
        if (t.net_amount !== undefined && t.net_amount !== null) {
          return sum + Math.abs(t.net_amount);
        }
        return sum + (t.is_commercial !== false ? absAmount / 1.20 : absAmount);
      }, 0);

    // Calculated VAT (from commercial income transactions)
    const calculatedVat = activeTx
      .filter(t => t.amount > 0 && t.is_commercial !== false && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => {
        if (t.vat_amount !== undefined && t.vat_amount !== null) {
          return sum + t.vat_amount;
        }
        // Fallback calculation
        return sum + (t.amount - t.amount / 1.20);
      }, 0);

    // Deductible VAT (from commercial expense transactions)
    const deductibleVat = activeTx
      .filter(t => t.amount < 0 && t.is_commercial !== false && !skipIds.includes(t.category_id || ''))
      .reduce((sum, t) => {
        if (t.vat_amount !== undefined && t.vat_amount !== null) {
          return sum + t.vat_amount;
        }
        // Fallback calculation
        const absAmount = Math.abs(t.amount);
        return sum + (absAmount - absAmount / 1.20);
      }, 0);

    const netVatPayable = calculatedVat - deductibleVat;

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
    
    const financingOut = activeTx
      .filter(t => t.amount < 0 && financingIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Investment calculations
    const investmentOut = activeTx
      .filter(t => t.amount < 0 && investmentIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Investment breakdown by type
    const byInvestmentType: Record<string, { amount: number; name: string; code: string }> = {};
    activeTx
      .filter(t => t.amount < 0 && investmentIds.includes(t.category_id || ''))
      .forEach(t => {
        const category = categories.find(c => c.id === t.category_id);
        if (!category) return;
        
        if (!byInvestmentType[t.category_id!]) {
          byInvestmentType[t.category_id!] = { 
            amount: 0, 
            name: category.name,
            code: category.code 
          };
        }
        byInvestmentType[t.category_id!].amount += Math.abs(t.amount);
      });

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
      financingOut,
      investmentOut,
      receiptTotal: receiptExpense,
      byCategory,
      byMonth,
      byInvestmentType,
      uncategorizedCount,
      calculatedVat,
      deductibleVat,
      netVatPayable,
      netRevenue,
      netCost,
      isLoading
    };
  }, [transactions, receipts, categories, isLoading]);
}
