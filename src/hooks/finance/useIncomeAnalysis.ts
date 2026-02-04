import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useCategories } from './useCategories';
import { useReceipts } from './useReceipts';
import { useOfficialDataStatus } from './useOfficialDataStatus';
import { useOfficialIncomeStatement } from './useOfficialIncomeStatement';
import { ServiceRevenue, CustomerRevenue, MonthlyDataPoint, MONTH_NAMES_SHORT_TR, CHART_COLORS } from '@/types/reports';

interface IncomeAnalysisOptions {
  forceRealtime?: boolean;
}

export function useIncomeAnalysis(year: number, options?: IncomeAnalysisOptions) {
  const { forceRealtime = false } = options || {};
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { categories, isLoading: catLoading } = useCategories();
  const { receipts, isLoading: receiptLoading } = useReceipts(year);
  const { isAnyLocked } = useOfficialDataStatus(year);
  const { officialStatement } = useOfficialIncomeStatement(year);

  const isLoading = txLoading || catLoading || receiptLoading;

  const analysis = useMemo(() => {
    const emptyResult = {
      serviceRevenue: [] as ServiceRevenue[],
      customerRevenue: [] as CustomerRevenue[],
      monthlyIncome: [] as MonthlyDataPoint[],
      totalIncome: 0,
      avgMonthlyIncome: 0,
      bestMonth: { month: 0, amount: 0 },
      worstMonth: { month: 0, amount: 0 },
      isOfficial: false,
    };

    if (isLoading || !categories?.length) {
      return emptyResult;
    }

    // PRIORITY 1: If official data is locked and forceRealtime is false, use official income values
    if (!forceRealtime && isAnyLocked && officialStatement) {
      const grossSalesDomestic = officialStatement.gross_sales_domestic || 0;
      const grossSalesExport = officialStatement.gross_sales_export || 0;
      const grossSalesOther = officialStatement.gross_sales_other || 0;
      const totalIncome = grossSalesDomestic + grossSalesExport + grossSalesOther;

      // Create simplified service revenue breakdown from official data
      const serviceRevenue: ServiceRevenue[] = [];
      
      if (grossSalesDomestic > 0) {
        serviceRevenue.push({
          categoryId: 'official_domestic',
          code: '600_YURTICI',
          name: 'Yurtiçi Satışlar',
          amount: grossSalesDomestic,
          percentage: totalIncome > 0 ? (grossSalesDomestic / totalIncome) * 100 : 0,
          color: CHART_COLORS.services[0],
          byMonth: {},
        });
      }
      
      if (grossSalesExport > 0) {
        serviceRevenue.push({
          categoryId: 'official_export',
          code: '601_IHRACAT',
          name: 'İhracat Satışları',
          amount: grossSalesExport,
          percentage: totalIncome > 0 ? (grossSalesExport / totalIncome) * 100 : 0,
          color: CHART_COLORS.services[1],
          byMonth: {},
        });
      }
      
      if (grossSalesOther > 0) {
        serviceRevenue.push({
          categoryId: 'official_other',
          code: '602_DIGER',
          name: 'Diğer Gelirler',
          amount: grossSalesOther,
          percentage: totalIncome > 0 ? (grossSalesOther / totalIncome) * 100 : 0,
          color: CHART_COLORS.services[2],
          byMonth: {},
        });
      }

      return {
        serviceRevenue,
        customerRevenue: [] as CustomerRevenue[], // No customer breakdown in official data
        monthlyIncome: [] as MonthlyDataPoint[], // No monthly breakdown in official data
        totalIncome,
        avgMonthlyIncome: totalIncome / 12,
        bestMonth: { month: 0, amount: 0 },
        worstMonth: { month: 0, amount: 0 },
        isOfficial: true,
      };
    }

    // PRIORITY 2: Dynamic calculation from bank transactions

    // Safe arrays for null safety
    const safeTransactions = transactions || [];
    const safeReceipts = receipts || [];
    const safeCategories = categories || [];

    // Exclude partner, financing, investment, and excluded categories from income
    const excludedTypes = ['PARTNER', 'FINANCING', 'INVESTMENT', 'EXCLUDED'];

    // Get IDs of categories that should be excluded from operating income
    const excludedCategoryIds = new Set(
      safeCategories
        .filter(c => excludedTypes.includes(c.type) || c.is_financing || c.affects_partner_account)
        .map(c => c.id)
    );

    // Filter income transactions (positive amounts, excluding special categories)
    const incomeTransactions = safeTransactions.filter(tx => {
      if (!tx.amount || tx.amount <= 0 || tx.is_excluded) return false;
      // Exclude financing, investment, partner, and excluded categories
      if (tx.category_id && excludedCategoryIds.has(tx.category_id)) return false;
      return true;
    });

    // Filter issued receipts (sales invoices) - using TRY values
    const issuedReceipts = safeReceipts.filter(r => r.document_type === 'issued');

    // Service Revenue by Category - Use NET amounts (KDV hariç)
    const serviceMap = new Map<string, { amount: number; byMonth: Record<number, number> }>();
    
    // Process bank transactions
    incomeTransactions.forEach(tx => {
      const category = safeCategories.find(c => c.id === tx.category_id);
      const code = category?.code || 'DIGER';
      const date = new Date(tx.transaction_date || '');
      const month = date.getMonth() + 1;
      
      // Use net_amount if available, otherwise calculate (KDV hariç)
      const netAmount = tx.net_amount !== undefined && tx.net_amount !== null
        ? tx.net_amount
        : (tx.is_commercial !== false ? (tx.amount || 0) / 1.20 : (tx.amount || 0));
      
      if (!serviceMap.has(code)) {
        serviceMap.set(code, { amount: 0, byMonth: {} });
      }
      
      const entry = serviceMap.get(code)!;
      entry.amount += netAmount;
      entry.byMonth[month] = (entry.byMonth[month] || 0) + netAmount;
    });

    // Process issued receipts - use TRY values for foreign invoices
    issuedReceipts.forEach(r => {
      const category = safeCategories.find(c => c.id === r.category_id);
      const code = category?.code || '600_SATIS';
      const month = r.receipt_date ? new Date(r.receipt_date).getMonth() + 1 : 1;
      
      // Use amount_try for foreign invoices, otherwise total_amount
      const hasForeignCurrency = r.original_currency && r.original_currency !== 'TRY';
      const grossTry = hasForeignCurrency && r.amount_try ? r.amount_try : (r.total_amount || 0);
      const vatTry = hasForeignCurrency && r.vat_amount_try ? r.vat_amount_try : (r.vat_amount || 0);
      
      // For foreign invoices, net = gross (no VAT)
      const netAmount = r.is_foreign_invoice ? grossTry : (grossTry - vatTry);
      
      if (!serviceMap.has(code)) {
        serviceMap.set(code, { amount: 0, byMonth: {} });
      }
      
      const entry = serviceMap.get(code)!;
      entry.amount += netAmount;
      entry.byMonth[month] = (entry.byMonth[month] || 0) + netAmount;
    });

    const totalIncome = Array.from(serviceMap.values()).reduce((sum, s) => sum + s.amount, 0);

    const serviceRevenue: ServiceRevenue[] = Array.from(serviceMap.entries())
      .map(([code, data], index) => {
        const category = safeCategories.find(c => c.code === code);
        return {
          categoryId: category?.id || '',
          code,
          name: category?.name || 'Diğer Gelir',
          amount: data.amount,
          percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
          color: CHART_COLORS.services[index % CHART_COLORS.services.length],
          byMonth: data.byMonth,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Customer Revenue by Counterparty
    const customerMap = new Map<string, { amount: number; count: number }>();
    
    // Bank transactions
    incomeTransactions.forEach(tx => {
      const counterparty = tx.counterparty || 'Bilinmeyen';
      
      // Use net_amount if available, otherwise calculate (KDV hariç)
      const netAmount = tx.net_amount !== undefined && tx.net_amount !== null
        ? tx.net_amount
        : (tx.is_commercial !== false ? (tx.amount || 0) / 1.20 : (tx.amount || 0));
      
      if (!customerMap.has(counterparty)) {
        customerMap.set(counterparty, { amount: 0, count: 0 });
      }
      const entry = customerMap.get(counterparty)!;
      entry.amount += netAmount;
      entry.count += 1;
    });

    // Add issued receipts to customer revenue - use TRY values
    issuedReceipts.forEach(r => {
      const counterparty = r.buyer_name || 'Bilinmeyen';
      
      const hasForeignCurrency = r.original_currency && r.original_currency !== 'TRY';
      const grossTry = hasForeignCurrency && r.amount_try ? r.amount_try : (r.total_amount || 0);
      const vatTry = hasForeignCurrency && r.vat_amount_try ? r.vat_amount_try : (r.vat_amount || 0);
      const netAmount = r.is_foreign_invoice ? grossTry : (grossTry - vatTry);
      
      if (!customerMap.has(counterparty)) {
        customerMap.set(counterparty, { amount: 0, count: 0 });
      }
      const entry = customerMap.get(counterparty)!;
      entry.amount += netAmount;
      entry.count += 1;
    });

    const customerRevenue: CustomerRevenue[] = Array.from(customerMap.entries())
      .map(([counterparty, data]) => ({
        counterparty,
        amount: data.amount,
        transactionCount: data.count,
        percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);

    // Monthly Income
    const monthlyMap = new Map<number, number>();
    for (let m = 1; m <= 12; m++) {
      monthlyMap.set(m, 0);
    }

    // Monthly income totals from bank transactions - use NET amounts
    incomeTransactions.forEach(tx => {
      const date = new Date(tx.transaction_date || '');
      const month = date.getMonth() + 1;
      
      const netAmount = tx.net_amount !== undefined && tx.net_amount !== null
        ? tx.net_amount
        : (tx.is_commercial !== false ? (tx.amount || 0) / 1.20 : (tx.amount || 0));
        
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + netAmount);
    });

    // Add issued receipts to monthly income - use TRY values
    issuedReceipts.forEach(r => {
      const month = r.receipt_date ? new Date(r.receipt_date).getMonth() + 1 : 1;
      
      const hasForeignCurrency = r.original_currency && r.original_currency !== 'TRY';
      const grossTry = hasForeignCurrency && r.amount_try ? r.amount_try : (r.total_amount || 0);
      const vatTry = hasForeignCurrency && r.vat_amount_try ? r.vat_amount_try : (r.vat_amount || 0);
      const netAmount = r.is_foreign_invoice ? grossTry : (grossTry - vatTry);
      
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + netAmount);
    });

    let cumulativeProfit = 0;
    const monthlyIncome: MonthlyDataPoint[] = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([month, income]) => {
        cumulativeProfit += income;
        return {
          month,
          monthName: MONTH_NAMES_SHORT_TR[month - 1],
          income,
          expense: 0,
          net: income,
          cumulativeProfit,
        };
      });

    // Best and worst months
    const sortedMonths = [...monthlyIncome].sort((a, b) => b.income - a.income);
    const bestMonth = sortedMonths[0] || { month: 0, income: 0 };
    const worstMonth = sortedMonths[sortedMonths.length - 1] || { month: 0, income: 0 };

    return {
      serviceRevenue,
      customerRevenue,
      monthlyIncome,
      totalIncome,
      avgMonthlyIncome: totalIncome / 12,
      bestMonth: { month: bestMonth.month, amount: bestMonth.income },
      worstMonth: { month: worstMonth.month, amount: worstMonth.income },
      isOfficial: false,
    };
  }, [transactions, categories, receipts, isLoading, isAnyLocked, officialStatement, forceRealtime]);

  return {
    ...analysis,
    isLoading,
  };
}
