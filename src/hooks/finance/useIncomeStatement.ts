import { useMemo } from 'react';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { IncomeStatementData, IncomeStatementLine } from '@/types/reports';

// Category code mappings for income statement
const INCOME_CODES = {
  SBT: ['SBT', 'SBT_TRACKER'],
  LS: ['L&S', 'LS', 'LEADERSHIP'],
  ZDHC: ['ZDHC', 'INCHECK'],
  DANIS: ['DANIS', 'DANISMANLIK'],
};

const EXPENSE_CODES = {
  PERSONEL: ['PERSONEL', 'MAAS', 'SSK'],
  KIRA: ['KIRA_OUT', 'KIRA'],
  ULASIM: ['HGS', 'YAKIT', 'ULASIM', 'SEYAHAT'],
  TELEKOM: ['TELEKOM', 'INTERNET', 'TELEFON'],
  SIGORTA: ['SIGORTA'],
  OFIS: ['OFIS', 'MALZEME'],
  MUHASEBE: ['MUHASEBE', 'HUKUK', 'SMM'],
  YAZILIM: ['YAZILIM', 'ABONELIK'],
  BANKA: ['BANKA', 'MASRAF', 'KOMISYON'],
  VERGI: ['VERGI', 'KDV', 'DAMGA'],
};

export function useIncomeStatement(year: number) {
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { receipts, isLoading: receiptLoading } = useReceipts(year);
  const { categories, isLoading: catLoading } = useCategories();

  const isLoading = txLoading || catLoading || receiptLoading;

  const statement = useMemo((): IncomeStatementData => {
    const empty: IncomeStatementData = {
      grossSales: { sbt: 0, ls: 0, zdhc: 0, danis: 0, diger: 0, total: 0 },
      salesReturns: 0,
      netSales: 0,
      costOfSales: 0,
      grossProfit: 0,
      operatingExpenses: {
        personel: 0, kira: 0, ulasim: 0, telekom: 0, sigorta: 0,
        ofis: 0, muhasebe: 0, yazilim: 0, banka: 0, diger: 0, total: 0,
      },
      operatingProfit: 0,
      otherIncome: { faiz: 0, kurFarki: 0, total: 0 },
      otherExpenses: { faiz: 0, kurFarki: 0, total: 0 },
      preTaxProfit: 0,
      taxExpense: 0,
      netProfit: 0,
      profitMargin: 0,
      ebitMargin: 0,
      grossMargin: 0,
    };

    if (isLoading || !categories.length) return empty;

    // Helper to check if category matches codes
    const matchesCode = (categoryCode: string | undefined, codes: string[]) => {
      if (!categoryCode) return false;
      return codes.some(c => categoryCode.toUpperCase().includes(c));
    };

    // Excluded category types
    const excludedTypes = ['PARTNER', 'FINANCING', 'INVESTMENT', 'EXCLUDED'];
    const excludedCategoryIds = new Set(
      categories.filter(c => excludedTypes.includes(c.type)).map(c => c.id)
    );

    // Process income transactions
    const grossSales = { sbt: 0, ls: 0, zdhc: 0, danis: 0, diger: 0, total: 0 };
    
    // Process income transactions - use NET amount (KDV hariç)
    transactions.forEach(tx => {
      if (!tx.amount || tx.amount <= 0 || tx.is_excluded || excludedCategoryIds.has(tx.category_id || '')) return;
      
      const category = categories.find(c => c.id === tx.category_id);
      const code = category?.code || '';
      
      // Use net_amount if available, otherwise calculate (KDV hariç)
      const netAmount = tx.net_amount !== undefined && tx.net_amount !== null
        ? tx.net_amount
        : (tx.is_commercial !== false ? tx.amount / 1.20 : tx.amount);

      if (matchesCode(code, INCOME_CODES.SBT)) grossSales.sbt += netAmount;
      else if (matchesCode(code, INCOME_CODES.LS)) grossSales.ls += netAmount;
      else if (matchesCode(code, INCOME_CODES.ZDHC)) grossSales.zdhc += netAmount;
      else if (matchesCode(code, INCOME_CODES.DANIS)) grossSales.danis += netAmount;
      else grossSales.diger += netAmount;
      
      grossSales.total += netAmount;
    });

    // Process expense transactions
    const operatingExpenses = {
      personel: 0, kira: 0, ulasim: 0, telekom: 0, sigorta: 0,
      ofis: 0, muhasebe: 0, yazilim: 0, banka: 0, diger: 0, total: 0,
    };

    // Process expense transactions - use NET amount (KDV hariç)
    transactions.forEach(tx => {
      if (!tx.amount || tx.amount >= 0 || tx.is_excluded || excludedCategoryIds.has(tx.category_id || '')) return;
      
      const category = categories.find(c => c.id === tx.category_id);
      const code = category?.code || '';
      
      // Use net_amount if available, otherwise calculate (KDV hariç)
      const absAmount = Math.abs(tx.amount);
      const netAmount = tx.net_amount !== undefined && tx.net_amount !== null
        ? Math.abs(tx.net_amount)
        : (tx.is_commercial !== false ? absAmount / 1.20 : absAmount);

      if (matchesCode(code, EXPENSE_CODES.PERSONEL)) operatingExpenses.personel += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.KIRA)) operatingExpenses.kira += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.ULASIM)) operatingExpenses.ulasim += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.TELEKOM)) operatingExpenses.telekom += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.SIGORTA)) operatingExpenses.sigorta += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.OFIS)) operatingExpenses.ofis += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.MUHASEBE)) operatingExpenses.muhasebe += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.YAZILIM)) operatingExpenses.yazilim += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.BANKA)) operatingExpenses.banka += netAmount;
      else operatingExpenses.diger += netAmount;
    });

    // Add receipt expenses (all received receipts, even if not linked to bank)
    // Use NET amount (excluding VAT) to avoid double counting VAT
    receipts.forEach(receipt => {
      // Only include "received" type receipts (alınan faturalar)
      // Skip issued invoices (they are income, not expense)
      if (!receipt.total_amount || receipt.document_type === 'issued') return;
      
      // Skip if already linked to bank transaction (would be double counting)
      if (receipt.linked_bank_transaction_id) return;
      
      const category = categories.find(c => c.id === receipt.category_id);
      const code = category?.code || '';
      
      // Use KDV hariç (net) amount
      const netAmount = receipt.vat_amount 
        ? receipt.total_amount - receipt.vat_amount 
        : receipt.total_amount / 1.20; // Fallback: assume 20% VAT

      if (matchesCode(code, EXPENSE_CODES.PERSONEL)) operatingExpenses.personel += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.KIRA)) operatingExpenses.kira += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.ULASIM)) operatingExpenses.ulasim += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.TELEKOM)) operatingExpenses.telekom += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.SIGORTA)) operatingExpenses.sigorta += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.OFIS)) operatingExpenses.ofis += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.MUHASEBE)) operatingExpenses.muhasebe += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.YAZILIM)) operatingExpenses.yazilim += netAmount;
      else if (matchesCode(code, EXPENSE_CODES.BANKA)) operatingExpenses.banka += netAmount;
      else operatingExpenses.diger += netAmount;
    });

    operatingExpenses.total = Object.values(operatingExpenses).reduce((a, b) => a + b, 0) - operatingExpenses.total;

    // Calculate derived values
    const netSales = grossSales.total;
    const costOfSales = 0; // Would need separate tracking
    const grossProfit = netSales - costOfSales;
    const operatingProfit = grossProfit - operatingExpenses.total;

    // Other income/expenses (financing category)
    const financingCategories = categories.filter(c => c.is_financing || c.type === 'FINANCING');
    let otherIncomeTotal = 0;
    let otherExpenseTotal = 0;

    transactions.forEach(tx => {
      if (!tx.amount || tx.is_excluded) return;
      const isFinancing = financingCategories.some(c => c.id === tx.category_id);
      if (isFinancing) {
        if (tx.amount > 0) otherIncomeTotal += tx.amount;
        else otherExpenseTotal += Math.abs(tx.amount);
      }
    });

    const preTaxProfit = operatingProfit + otherIncomeTotal - otherExpenseTotal;
    
    // Estimate tax (simplified)
    const taxExpense = preTaxProfit > 0 ? preTaxProfit * 0.25 : 0;
    const netProfit = preTaxProfit - taxExpense;

    return {
      grossSales,
      salesReturns: 0,
      netSales,
      costOfSales,
      grossProfit,
      operatingExpenses,
      operatingProfit,
      otherIncome: { faiz: otherIncomeTotal, kurFarki: 0, total: otherIncomeTotal },
      otherExpenses: { faiz: otherExpenseTotal, kurFarki: 0, total: otherExpenseTotal },
      preTaxProfit,
      taxExpense,
      netProfit,
      profitMargin: netSales > 0 ? (netProfit / netSales) * 100 : 0,
      ebitMargin: netSales > 0 ? (operatingProfit / netSales) * 100 : 0,
      grossMargin: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
    };
  }, [transactions, receipts, categories, isLoading]);

  // Generate formatted lines for display
  const lines = useMemo((): IncomeStatementLine[] => {
    const formatLine = (
      code: string, 
      name: string, 
      amount: number, 
      indent = 0, 
      options: { isTotal?: boolean; isSubtotal?: boolean; isNegative?: boolean } = {}
    ): IncomeStatementLine => ({
      code,
      name,
      amount,
      indent,
      ...options,
    });

    return [
      formatLine('A', 'BRÜT SATIŞLAR', 0, 0, { isSubtotal: true }),
      formatLine('A1', 'SBT Tracker Geliri', statement.grossSales.sbt, 1),
      formatLine('A2', 'Leadership & Sustainability Geliri', statement.grossSales.ls, 1),
      formatLine('A3', 'ZDHC InCheck Geliri', statement.grossSales.zdhc, 1),
      formatLine('A4', 'Danışmanlık Geliri', statement.grossSales.danis, 1),
      formatLine('A5', 'Diğer Gelirler', statement.grossSales.diger, 1),
      formatLine('AT', 'BRÜT SATIŞLAR TOPLAMI', statement.grossSales.total, 0, { isTotal: true }),
      
      formatLine('B', 'SATIŞ İNDİRİMLERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('B1', 'İadeler', statement.salesReturns, 1, { isNegative: true }),
      formatLine('NS', 'NET SATIŞLAR', statement.netSales, 0, { isTotal: true }),
      
      formatLine('C', 'SATIŞLARIN MALİYETİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('C1', 'Harici Hizmet Maliyeti', statement.costOfSales, 1, { isNegative: true }),
      formatLine('GP', 'BRÜT KÂR', statement.grossProfit, 0, { isTotal: true }),
      
      formatLine('D', 'FAALİYET GİDERLERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('D1', 'Personel Giderleri', statement.operatingExpenses.personel, 1, { isNegative: true }),
      formatLine('D2', 'Kira Giderleri', statement.operatingExpenses.kira, 1, { isNegative: true }),
      formatLine('D3', 'Ulaşım Giderleri (HGS, Yakıt)', statement.operatingExpenses.ulasim, 1, { isNegative: true }),
      formatLine('D4', 'Telekomünikasyon', statement.operatingExpenses.telekom, 1, { isNegative: true }),
      formatLine('D5', 'Sigorta Giderleri', statement.operatingExpenses.sigorta, 1, { isNegative: true }),
      formatLine('D6', 'Ofis & Malzeme', statement.operatingExpenses.ofis, 1, { isNegative: true }),
      formatLine('D7', 'Muhasebe & Hukuk', statement.operatingExpenses.muhasebe, 1, { isNegative: true }),
      formatLine('D8', 'Yazılım & Abonelik', statement.operatingExpenses.yazilim, 1, { isNegative: true }),
      formatLine('D9', 'Banka Masrafları', statement.operatingExpenses.banka, 1, { isNegative: true }),
      formatLine('D10', 'Diğer Faaliyet Giderleri', statement.operatingExpenses.diger, 1, { isNegative: true }),
      formatLine('DT', 'FAALİYET GİDERLERİ TOPLAMI', statement.operatingExpenses.total, 0, { isTotal: true, isNegative: true }),
      
      formatLine('EBIT', 'FAALİYET KÂRI (EBIT)', statement.operatingProfit, 0, { isTotal: true }),
      
      formatLine('E', 'DİĞER FAALİYET GELİRLERİ (+)', 0, 0, { isSubtotal: true }),
      formatLine('E1', 'Faiz Geliri', statement.otherIncome.faiz, 1),
      
      formatLine('F', 'DİĞER FAALİYET GİDERLERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('F1', 'Faiz Gideri', statement.otherExpenses.faiz, 1, { isNegative: true }),
      
      formatLine('PBT', 'VERGİ ÖNCESİ KÂR', statement.preTaxProfit, 0, { isTotal: true }),
      
      formatLine('G', 'VERGİ GİDERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('G1', 'Kurumlar Vergisi (%25)', statement.taxExpense, 1, { isNegative: true }),
      
      formatLine('NP', 'DÖNEM NET KÂRI', statement.netProfit, 0, { isTotal: true }),
    ];
  }, [statement]);

  return {
    statement,
    lines,
    isLoading,
  };
}
