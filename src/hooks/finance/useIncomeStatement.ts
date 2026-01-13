import { useMemo } from 'react';
import { useFinancialDataHub, ProcessedTransaction } from './useFinancialDataHub';
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

// Helper to check if category matches codes
const matchesCode = (categoryCode: string | undefined | null, codes: string[]) => {
  if (!categoryCode) return false;
  return codes.some(c => categoryCode.toUpperCase().includes(c));
};

export function useIncomeStatement(year: number) {
  const hub = useFinancialDataHub(year);

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

    if (hub.isLoading) return empty;

    // Process income from hub - using pre-calculated NET amounts (VAT excluded)
    const grossSales = { sbt: 0, ls: 0, zdhc: 0, danis: 0, diger: 0, total: 0 };
    
    hub.income.forEach(tx => {
      const code = tx.categoryCode || '';
      const netAmount = tx.net;

      if (matchesCode(code, INCOME_CODES.SBT)) grossSales.sbt += netAmount;
      else if (matchesCode(code, INCOME_CODES.LS)) grossSales.ls += netAmount;
      else if (matchesCode(code, INCOME_CODES.ZDHC)) grossSales.zdhc += netAmount;
      else if (matchesCode(code, INCOME_CODES.DANIS)) grossSales.danis += netAmount;
      else grossSales.diger += netAmount;
      
      grossSales.total += netAmount;
    });

    // Process expenses from hub - using pre-calculated NET amounts (VAT excluded)
    const operatingExpenses = {
      personel: 0, kira: 0, ulasim: 0, telekom: 0, sigorta: 0,
      ofis: 0, muhasebe: 0, yazilim: 0, banka: 0, diger: 0, total: 0,
    };

    hub.expense.forEach(tx => {
      const code = tx.categoryCode || '';
      const netAmount = tx.net;

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

    operatingExpenses.total = operatingExpenses.personel + operatingExpenses.kira + 
      operatingExpenses.ulasim + operatingExpenses.telekom + operatingExpenses.sigorta +
      operatingExpenses.ofis + operatingExpenses.muhasebe + operatingExpenses.yazilim +
      operatingExpenses.banka + operatingExpenses.diger;

    // Calculate derived values
    const netSales = grossSales.total;
    const costOfSales = 0; // Would need separate tracking
    const grossProfit = netSales - costOfSales;
    const operatingProfit = grossProfit - operatingExpenses.total;

    // Other income/expenses from financing transactions
    let otherIncomeTotal = 0;
    let otherExpenseTotal = 0;

    hub.financing.forEach(tx => {
      if (tx.isIncome) {
        otherIncomeTotal += tx.gross;
      } else {
        otherExpenseTotal += tx.gross;
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
  }, [hub]);

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
    isLoading: hub.isLoading,
  };
}
