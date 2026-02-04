import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { useOfficialIncomeStatement, calculateStatementTotals } from './useOfficialIncomeStatement';
import { FinancialCalculations } from '@/types/finance';

export interface ExtendedFinancialCalculations extends FinancialCalculations {
  isLoading: boolean;
  isOfficial: boolean;
}

export function useFinancialCalculations(year: number): ExtendedFinancialCalculations {
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { receipts, isLoading: rcLoading } = useReceipts(year);
  const { categories, isLoading: catLoading } = useCategories();
  const { officialStatement, isLocked, isLoading: officialLoading } = useOfficialIncomeStatement(year);

  const isLoading = txLoading || rcLoading || catLoading || officialLoading;

  return useMemo(() => {
    // Empty state during loading
    if (isLoading || !categories?.length) {
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
        isLoading,
        isOfficial: false,
      };
    }

    // Filter active transactions (not excluded)
    const activeTx = (transactions || []).filter(t => !t.is_excluded);
    // Include ALL receipts for expense calculation (not just is_included_in_report)
    const activeReceipts = receipts || [];

    // Get category IDs by type (categories safety already checked above)
    const safeCategories = categories || [];
    const financingIds = safeCategories
      .filter(c => c.type === 'FINANCING' || c.is_financing)
      .map(c => c.id);
    
    const investmentIds = safeCategories
      .filter(c => c.type === 'INVESTMENT')
      .map(c => c.id);

    const partnerIds = safeCategories
      .filter(c => c.type === 'PARTNER' || c.affects_partner_account)
      .map(c => c.id);

    const excludedIds = safeCategories
      .filter(c => c.type === 'EXCLUDED' || c.is_excluded)
      .map(c => c.id);
    
    const skipIds = [...financingIds, ...partnerIds, ...excludedIds, ...investmentIds];

    // PRIORITY 1: Use official locked data for income statement values
    if (isLocked && officialStatement) {
      const totals = calculateStatementTotals(officialStatement);
      const grossSales = (officialStatement.gross_sales_domestic || 0) + 
                         (officialStatement.gross_sales_export || 0) + 
                         (officialStatement.gross_sales_other || 0);
      
      const costOfSales = (officialStatement.cost_of_goods_sold || 0) + 
                          (officialStatement.cost_of_merchandise_sold || 0) + 
                          (officialStatement.cost_of_services_sold || 0);
      
      const operatingExpenses = (officialStatement.rd_expenses || 0) +
                                (officialStatement.marketing_expenses || 0) +
                                (officialStatement.general_admin_expenses || 0);
      
      // Partner & financing calculations still from dynamic data
      const partnerOut = activeTx
        .filter(t => t.amount < 0 && partnerIds.includes(t.category_id || ''))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const partnerIn = activeTx
        .filter(t => t.amount > 0 && partnerIds.includes(t.category_id || ''))
        .reduce((sum, t) => sum + t.amount, 0);

      const financingIn = activeTx
        .filter(t => t.amount > 0 && financingIds.includes(t.category_id || ''))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const financingOut = activeTx
        .filter(t => t.amount < 0 && financingIds.includes(t.category_id || ''))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const investmentOut = activeTx
        .filter(t => t.amount < 0 && investmentIds.includes(t.category_id || ''))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      // VAT calculations - these remain dynamic as official data doesn't have VAT
      const calculatedVat = activeTx
        .filter(t => t.amount > 0 && t.is_commercial !== false && !skipIds.includes(t.category_id || ''))
        .reduce((sum, t) => sum + (t.vat_amount ?? (t.amount - t.amount / 1.20)), 0);

      const deductibleVat = activeTx
        .filter(t => t.amount < 0 && t.is_commercial !== false && !skipIds.includes(t.category_id || ''))
        .reduce((sum, t) => sum + (t.vat_amount ?? (Math.abs(t.amount) - Math.abs(t.amount) / 1.20)), 0);

      return {
        totalIncome: grossSales,
        totalExpenses: costOfSales + operatingExpenses,
        operatingProfit: totals.operating_profit,
        profitMargin: totals.net_sales > 0 ? (totals.net_profit / totals.net_sales) * 100 : 0,
        partnerOut,
        partnerIn,
        netPartnerBalance: partnerIn - partnerOut,
        financingIn,
        financingOut,
        investmentOut,
        receiptTotal: 0, // Official data doesn't track receipts separately
        byCategory: {}, // Official data doesn't have category breakdown
        byMonth: {}, // Official data doesn't have monthly breakdown
        byInvestmentType: {},
        uncategorizedCount: 0,
        calculatedVat,
        deductibleVat,
        netVatPayable: calculatedVat - deductibleVat,
        netRevenue: totals.net_sales,
        netCost: costOfSales,
        isLoading: false,
        isOfficial: true,
      };
    }

    // PRIORITY 2: Dynamic calculation from bank transactions

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
    // Only include "received" type receipts (alınan faturalar), not issued ones
    // Use NET amount (KDV hariç) to avoid counting VAT as expense
    const receiptExpense = activeReceipts
      .filter(r => !r.linked_bank_transaction_id && r.document_type !== 'issued')
      .reduce((sum, r) => {
        const total = r.total_amount || 0;
        // Use KDV hariç (net) amount
        const netAmount = r.vat_amount 
          ? total - r.vat_amount 
          : total / 1.20; // Fallback: assume 20% VAT
        return sum + netAmount;
      }, 0);

    // Calculate VAT from receipts for deduction
    const receiptDeductibleVat = activeReceipts
      .filter(r => !r.linked_bank_transaction_id && r.document_type === 'received')
      .reduce((sum, r) => sum + (r.vat_amount || 0), 0);

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
        const category = safeCategories.find(c => c.id === t.category_id);
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

      const category = safeCategories.find(c => c.id === t.category_id);
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
      isLoading,
      isOfficial: false,
    };
  }, [transactions, receipts, categories, isLoading, isLocked, officialStatement]);
}
