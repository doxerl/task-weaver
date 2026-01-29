import { useMemo } from 'react';
import { useFinancialDataHub, ProcessedTransaction } from './useFinancialDataHub';
import { IncomeStatementData, IncomeStatementLine } from '@/types/reports';
import { usePayrollAccruals } from './usePayrollAccruals';
import { useOfficialIncomeStatement } from './useOfficialIncomeStatement';

// Tekdüzen Hesap Planı - Account Code Groups
const ACCOUNT_GROUPS = {
  // 60 - Brüt Satışlar
  GROSS_SALES_600: '600',      // Yurtiçi Satışlar
  GROSS_SALES_601: '601',      // Yurtdışı Satışlar
  GROSS_SALES_602: '602',      // Diğer Gelirler
  
  // 61 - Satış İndirimleri
  SALES_RETURNS: '610',        // Satıştan İadeler
  
  // 62 - Satışların Maliyeti
  COST_OF_SALES: '622',        // Satılan Hizmet Maliyeti
  
  // 63 - Faaliyet Giderleri
  MARKETING: '631',            // Pazarlama Satış Dağıtım
  GENERAL_ADMIN: '632',        // Genel Yönetim
  
  // 64 - Diğer Faaliyet Gelirleri
  INTEREST_INCOME: '642',      // Faiz Gelirleri
  FX_GAIN: '646',              // Kambiyo Karları
  OTHER_INCOME: '649',         // Diğer Olağan Gelirler
  
  // 65 - Diğer Faaliyet Giderleri
  COMMISSION_EXP: '653',       // Komisyon Giderleri
  FX_LOSS: '656',              // Kambiyo Zararları
  OTHER_EXPENSE: '659',        // Diğer Olağan Giderler
  
  // 66 - Finansman Giderleri
  FINANCE_EXP: '660',          // Kısa Vadeli Borçlanma
  
  // 67 - Olağandışı Gelirler
  EXTRAORDINARY_INCOME: '679',
  
  // 68 - Olağandışı Giderler
  EXTRAORDINARY_EXPENSE: '689',
};

// Helper to check if account code starts with given prefix
const matchesAccountCode = (accountCode: string | null | undefined, prefix: string): boolean => {
  if (!accountCode) return false;
  return accountCode.startsWith(prefix);
};

// Legacy category code mappings for backwards compatibility
const LEGACY_INCOME_CODES = {
  SBT: ['SBT', 'SBT_TRACKER'],
  LS: ['L&S', 'LS', 'LEADERSHIP'],
  ZDHC: ['ZDHC', 'INCHECK'],
  DANIS: ['DANIS', 'DANISMANLIK'],
};

const matchesLegacyCode = (categoryCode: string | undefined | null, codes: string[]) => {
  if (!categoryCode) return false;
  return codes.some(c => categoryCode.toUpperCase().includes(c));
};

// Convert official statement to IncomeStatementData format
function convertOfficialToStatement(official: any): IncomeStatementData {
  const grossSalesTotal = (official.gross_sales_domestic || 0) + 
                         (official.gross_sales_export || 0) + 
                         (official.gross_sales_other || 0);
  
  const operatingExpensesTotal = (official.rd_expenses || 0) + 
                                 (official.marketing_expenses || 0) + 
                                 (official.general_admin_expenses || 0);
  
  const otherIncomeTotal = (official.interest_income || 0) + 
                           (official.fx_gain || 0) + 
                           (official.other_income || 0);
  
  const otherExpensesTotal = (official.commission_expenses || 0) + 
                             (official.fx_loss || 0) + 
                             (official.other_expenses || 0);
  
  const financeExpenses = (official.short_term_finance_exp || 0) + 
                          (official.long_term_finance_exp || 0);
  
  return {
    grossSales: {
      yurtici: official.gross_sales_domestic || 0,
      yurtdisi: official.gross_sales_export || 0,
      diger: official.gross_sales_other || 0,
      total: grossSalesTotal,
      sbt: 0, ls: 0, zdhc: 0, danis: 0, // Legacy fields
    },
    salesReturns: official.sales_returns || 0,
    netSales: official.net_sales || 0,
    costOfSales: (official.cost_of_goods_sold || 0) + 
                 (official.cost_of_merchandise_sold || 0) + 
                 (official.cost_of_services_sold || 0),
    grossProfit: official.gross_profit || 0,
    operatingExpenses: {
      pazarlama: official.marketing_expenses || 0,
      genelYonetim: official.general_admin_expenses || 0,
      total: operatingExpensesTotal,
      personel: 0, kira: 0, ulasim: 0, telekom: 0, sigorta: 0,
      ofis: 0, muhasebe: 0, yazilim: 0, banka: 0, diger: 0,
    },
    operatingProfit: official.operating_profit || 0,
    otherIncome: {
      faiz: official.interest_income || 0,
      kurFarki: official.fx_gain || 0,
      diger: official.other_income || 0,
      total: otherIncomeTotal,
    },
    otherExpenses: {
      komisyon: official.commission_expenses || 0,
      kurFarki: official.fx_loss || 0,
      diger: official.other_expenses || 0,
      faiz: financeExpenses, // Legacy
      total: otherExpensesTotal,
    },
    financeExpenses,
    ordinaryProfit: official.operating_profit + otherIncomeTotal - otherExpensesTotal - financeExpenses,
    extraordinaryIncome: (official.prior_period_income || 0) + (official.other_extraordinary_income || 0),
    extraordinaryExpenses: (official.prior_period_expenses || 0) + (official.other_extraordinary_exp || 0),
    preTaxProfit: official.net_profit + (official.corporate_tax || 0) + (official.deferred_tax_expense || 0),
    taxExpense: (official.corporate_tax || 0) + (official.deferred_tax_expense || 0),
    netProfit: official.net_profit || 0,
    profitMargin: official.net_sales > 0 ? (official.net_profit / official.net_sales) * 100 : 0,
    ebitMargin: official.net_sales > 0 ? (official.operating_profit / official.net_sales) * 100 : 0,
    grossMargin: official.net_sales > 0 ? (official.gross_profit / official.net_sales) * 100 : 0,
    kkegTotal: 0,
  };
}

export function useIncomeStatement(year: number) {
  // RESMİ VERİ KONTROLÜ - Öncelik resmi veride!
  const { officialStatement, isLocked, isLoading: isOfficialLoading } = useOfficialIncomeStatement(year);
  
  const hub = useFinancialDataHub(year);
  const { summary: payrollSummary } = usePayrollAccruals(year);

  const statement = useMemo((): IncomeStatementData => {
    // ÖNCELİK 1: Kilitli resmi veri varsa onu kullan!
    if (isLocked && officialStatement) {
      console.log(`[useIncomeStatement] ${year} yılı için RESMİ VERİ kullanılıyor (is_locked=true)`);
      return convertOfficialToStatement(officialStatement);
    }
    
    const empty: IncomeStatementData = {
      grossSales: { yurtici: 0, yurtdisi: 0, diger: 0, total: 0, sbt: 0, ls: 0, zdhc: 0, danis: 0 },
      salesReturns: 0,
      netSales: 0,
      costOfSales: 0,
      grossProfit: 0,
      operatingExpenses: {
        pazarlama: 0, genelYonetim: 0, total: 0,
        personel: 0, kira: 0, ulasim: 0, telekom: 0, sigorta: 0,
        ofis: 0, muhasebe: 0, yazilim: 0, banka: 0, diger: 0,
      },
      operatingProfit: 0,
      otherIncome: { faiz: 0, kurFarki: 0, diger: 0, total: 0 },
      otherExpenses: { komisyon: 0, kurFarki: 0, diger: 0, faiz: 0, total: 0 },
      financeExpenses: 0,
      ordinaryProfit: 0,
      extraordinaryIncome: 0,
      extraordinaryExpenses: 0,
      preTaxProfit: 0,
      taxExpense: 0,
      netProfit: 0,
      profitMargin: 0,
      ebitMargin: 0,
      grossMargin: 0,
      kkegTotal: 0,
    };

    if (hub.isLoading) return empty;

    // Initialize accumulators
    const grossSales = { yurtici: 0, yurtdisi: 0, diger: 0, total: 0, sbt: 0, ls: 0, zdhc: 0, danis: 0 };
    let salesReturns = 0;
    let costOfSales = 0;
    const operatingExpenses = {
      pazarlama: 0, genelYonetim: 0, total: 0,
      personel: 0, kira: 0, ulasim: 0, telekom: 0, sigorta: 0,
      ofis: 0, muhasebe: 0, yazilim: 0, banka: 0, diger: 0,
    };
    const otherIncome = { faiz: 0, kurFarki: 0, diger: 0, total: 0 };
    const otherExpenses = { komisyon: 0, kurFarki: 0, diger: 0, faiz: 0, total: 0 };
    let financeExpenses = 0;
    let extraordinaryIncome = 0;
    let extraordinaryExpenses = 0;
    let kkegTotal = 0;

    // Process INCOME transactions using account_code
    hub.income.forEach(tx => {
      const accountCode = tx.accountCode;
      const categoryCode = tx.categoryCode || '';
      const netAmount = tx.net;

      // Track KKEG
      if (tx.isKkeg) {
        kkegTotal += netAmount;
      }

      // Group by account code
      if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.GROSS_SALES_600)) {
        // 600 - Yurtiçi Satışlar
        grossSales.yurtici += netAmount;
        
        // Also populate legacy fields for backwards compatibility
        if (matchesLegacyCode(categoryCode, LEGACY_INCOME_CODES.SBT)) grossSales.sbt += netAmount;
        else if (matchesLegacyCode(categoryCode, LEGACY_INCOME_CODES.LS)) grossSales.ls += netAmount;
        else if (matchesLegacyCode(categoryCode, LEGACY_INCOME_CODES.ZDHC)) grossSales.zdhc += netAmount;
        else if (matchesLegacyCode(categoryCode, LEGACY_INCOME_CODES.DANIS)) grossSales.danis += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.GROSS_SALES_601)) {
        // 601 - Yurtdışı Satışlar
        grossSales.yurtdisi += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.GROSS_SALES_602)) {
        // 602 - Diğer Gelirler
        grossSales.diger += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.INTEREST_INCOME)) {
        // 642 - Faiz Gelirleri
        otherIncome.faiz += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.FX_GAIN)) {
        // 646 - Kambiyo Karları
        otherIncome.kurFarki += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.OTHER_INCOME)) {
        // 649 - Diğer Olağan Gelirler
        otherIncome.diger += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.EXTRAORDINARY_INCOME)) {
        // 679 - Olağandışı Gelirler
        extraordinaryIncome += netAmount;
      } else {
        // Default: assume yurtiçi satış if no account code
        grossSales.yurtici += netAmount;
      }
      
      grossSales.total += netAmount;
    });

    // Process EXPENSE transactions using account_code
    hub.expense.forEach(tx => {
      const accountCode = tx.accountCode;
      const netAmount = tx.net;

      // Track KKEG
      if (tx.isKkeg) {
        kkegTotal += netAmount;
      }

      // Group by account code
      if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.SALES_RETURNS)) {
        // 610 - Satıştan İadeler
        salesReturns += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.COST_OF_SALES)) {
        // 622 - Satılan Hizmet Maliyeti
        costOfSales += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.MARKETING)) {
        // 631 - Pazarlama Satış Dağıtım
        operatingExpenses.pazarlama += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.GENERAL_ADMIN)) {
        // 632 - Genel Yönetim
        operatingExpenses.genelYonetim += netAmount;
        
        // Also populate legacy fields based on subcategory
        const subcode = tx.accountSubcode;
        if (subcode === '632.01') operatingExpenses.personel += netAmount;
        else if (subcode === '632.02') operatingExpenses.kira += netAmount;
        else if (subcode === '632.03' || subcode === '632.04') operatingExpenses.ulasim += netAmount;
        else if (subcode === '632.05') operatingExpenses.telekom += netAmount;
        else if (subcode === '632.06') operatingExpenses.sigorta += netAmount;
        else if (subcode === '632.07') operatingExpenses.ofis += netAmount;
        else if (subcode === '632.08' || subcode === '632.10') operatingExpenses.muhasebe += netAmount;
        else if (subcode === '632.11') operatingExpenses.yazilim += netAmount;
        else operatingExpenses.diger += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.COMMISSION_EXP)) {
        // 653 - Komisyon Giderleri
        otherExpenses.komisyon += netAmount;
        operatingExpenses.banka += netAmount; // Legacy field
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.FX_LOSS)) {
        // 656 - Kambiyo Zararları
        otherExpenses.kurFarki += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.OTHER_EXPENSE)) {
        // 659 - Diğer Olağan Giderler
        otherExpenses.diger += netAmount;
      } else if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.EXTRAORDINARY_EXPENSE)) {
        // 689 - Olağandışı Giderler
        extraordinaryExpenses += netAmount;
      } else {
        // Default: assume genel yönetim if no account code
        operatingExpenses.genelYonetim += netAmount;
        operatingExpenses.diger += netAmount;
      }
    });

    // Process FINANCING transactions
    hub.financing.forEach(tx => {
      const accountCode = tx.accountCode;
      
      // Track KKEG
      if (tx.isKkeg) {
        kkegTotal += Math.abs(tx.gross);
      }

      if (!tx.isIncome) {
        // 660 - Finansman Giderleri
        if (matchesAccountCode(accountCode, ACCOUNT_GROUPS.FINANCE_EXP) || 
            tx.categoryCode?.includes('FAIZ_OUT') ||
            tx.categoryCode?.includes('FAKTORING') ||
            tx.categoryCode?.includes('LEASING')) {
          financeExpenses += Math.abs(tx.gross);
          otherExpenses.faiz = financeExpenses; // Legacy field
        }
      }
    });

    // Add personnel expense from payroll accruals (Brüt Ücret + İşveren SGK + İşsizlik Primi)
    if (payrollSummary.totalPersonnelExpense > 0) {
      operatingExpenses.personel = payrollSummary.totalPersonnelExpense;
      operatingExpenses.genelYonetim += payrollSummary.totalPersonnelExpense;
    }

    // Calculate totals
    operatingExpenses.total = operatingExpenses.pazarlama + operatingExpenses.genelYonetim;
    otherIncome.total = otherIncome.faiz + otherIncome.kurFarki + otherIncome.diger;
    otherExpenses.total = otherExpenses.komisyon + otherExpenses.kurFarki + otherExpenses.diger;

    // Calculate derived values according to official format
    const netSales = grossSales.total - salesReturns;
    const grossProfit = netSales - costOfSales;
    const operatingProfit = grossProfit - operatingExpenses.total;
    const ordinaryProfit = operatingProfit + otherIncome.total - otherExpenses.total - financeExpenses;
    const preTaxProfit = ordinaryProfit + extraordinaryIncome - extraordinaryExpenses;
    
    // Dönem karı vergi karşılığı (settings'ten gelen değer)
    const taxProvision = (hub.settings as any)?.tax_provision || 0;
    const taxExpense = taxProvision;
    const netProfit = preTaxProfit - taxExpense;

    return {
      grossSales,
      salesReturns,
      netSales,
      costOfSales,
      grossProfit,
      operatingExpenses,
      operatingProfit,
      otherIncome,
      otherExpenses,
      financeExpenses,
      ordinaryProfit,
      extraordinaryIncome,
      extraordinaryExpenses,
      preTaxProfit,
      taxExpense,
      netProfit,
      profitMargin: netSales > 0 ? (netProfit / netSales) * 100 : 0,
      ebitMargin: netSales > 0 ? (operatingProfit / netSales) * 100 : 0,
      grossMargin: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
      kkegTotal,
    };
  }, [hub, payrollSummary]);

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
      formatLine('A1', 'Yurtiçi Satışlar (600)', statement.grossSales.yurtici, 1),
      formatLine('A2', 'Yurtdışı Satışlar (601)', statement.grossSales.yurtdisi, 1),
      formatLine('A3', 'Diğer Gelirler (602)', statement.grossSales.diger, 1),
      formatLine('AT', 'BRÜT SATIŞLAR TOPLAMI', statement.grossSales.total, 0, { isTotal: true }),
      
      formatLine('B', 'SATIŞ İNDİRİMLERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('B1', 'Satıştan İadeler (610)', statement.salesReturns, 1, { isNegative: true }),
      formatLine('NS', 'NET SATIŞLAR', statement.netSales, 0, { isTotal: true }),
      
      formatLine('D', 'SATIŞLARIN MALİYETİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('D1', 'Satılan Hizmet Maliyeti (622)', statement.costOfSales, 1, { isNegative: true }),
      formatLine('GP', 'BRÜT KÂR', statement.grossProfit, 0, { isTotal: true }),
      
      formatLine('E', 'FAALİYET GİDERLERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('E1', 'Pazarlama Satış Dağıtım (631)', statement.operatingExpenses.pazarlama, 1, { isNegative: true }),
      formatLine('E2', 'Genel Yönetim Giderleri (632)', statement.operatingExpenses.genelYonetim, 1, { isNegative: true }),
      formatLine('ET', 'FAALİYET GİDERLERİ TOPLAMI', statement.operatingExpenses.total, 0, { isTotal: true, isNegative: true }),
      
      formatLine('EBIT', 'FAALİYET KÂRI (EBIT)', statement.operatingProfit, 0, { isTotal: true }),
      
      formatLine('F', 'DİĞER FAALİYET GELİRLERİ (+)', 0, 0, { isSubtotal: true }),
      formatLine('F1', 'Faiz Gelirleri (642)', statement.otherIncome.faiz, 1),
      formatLine('F2', 'Kambiyo Karları (646)', statement.otherIncome.kurFarki, 1),
      formatLine('F3', 'Diğer Olağan Gelirler (649)', statement.otherIncome.diger, 1),
      
      formatLine('G', 'DİĞER FAALİYET GİDERLERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('G1', 'Komisyon Giderleri (653)', statement.otherExpenses.komisyon, 1, { isNegative: true }),
      formatLine('G2', 'Kambiyo Zararları (656)', statement.otherExpenses.kurFarki, 1, { isNegative: true }),
      formatLine('G3', 'Diğer Olağan Giderler (659)', statement.otherExpenses.diger, 1, { isNegative: true }),
      
      formatLine('H', 'FİNANSMAN GİDERLERİ (-)', 0, 0, { isSubtotal: true }),
      formatLine('H1', 'Kısa Vadeli Borçlanma (660)', statement.financeExpenses, 1, { isNegative: true }),
      
      formatLine('OK', 'OLAĞAN KÂR', statement.ordinaryProfit, 0, { isTotal: true }),
      
      formatLine('I', 'OLAĞANDIŞI GELİRLER (+)', 0, 0, { isSubtotal: true }),
      formatLine('I1', 'Olağandışı Gelirler (679)', statement.extraordinaryIncome, 1),
      
      formatLine('J', 'OLAĞANDIŞI GİDERLER (-)', 0, 0, { isSubtotal: true }),
      formatLine('J1', 'Olağandışı Giderler (689)', statement.extraordinaryExpenses, 1, { isNegative: true }),
      
      formatLine('PBT', 'DÖNEM KÂRI', statement.preTaxProfit, 0, { isTotal: true }),
      
      formatLine('K', 'DÖN. KARI VERGİ VE Dİ.YA.YÜK.KAR.(-)', statement.taxExpense, 0, { isSubtotal: true, isNegative: true }),
      
      formatLine('NP', 'DÖNEM NET KÂRI', statement.netProfit, 0, { isTotal: true }),
    ];
  }, [statement]);

  return {
    statement,
    lines,
    isLoading: hub.isLoading || isOfficialLoading,
    isOfficial: isLocked, // UI'da "Resmi Veri" badge'i göstermek için
  };
}
