import { useMemo } from 'react';
import { useFinancialSettings } from './useFinancialSettings';
import { useFinancialCalculations } from './useFinancialCalculations';
import { useVatCalculations } from './useVatCalculations';
import { useBankTransactions } from './useBankTransactions';
import { useReceipts } from './useReceipts';
import { useCategories } from './useCategories';
import { BalanceSheet } from '@/types/finance';

export function useBalanceSheet(year: number): { balanceSheet: BalanceSheet; isLoading: boolean } {
  const { settings, isLoading: settingsLoading } = useFinancialSettings();
  const financials = useFinancialCalculations(year);
  const vat = useVatCalculations(year);
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { receipts, isLoading: receiptsLoading } = useReceipts(year);
  const { categories, isLoading: catLoading } = useCategories();

  const isLoading = settingsLoading || financials.isLoading || vat.isLoading || txLoading || receiptsLoading || catLoading;

  return useMemo(() => {
    if (isLoading) {
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

    // Calculate bank balance from transactions
    const lastTransaction = transactions?.sort((a, b) => 
      new Date(b.transaction_date || 0).getTime() - new Date(a.transaction_date || 0).getTime()
    )[0];
    const bankBalance = lastTransaction?.balance || 0;

    // 2025 için fatura eşleştirmesi yok - manuel girişten al
    const useReceiptMatching = false; // Gelecekte true yapılabilir

    // Alacaklar hesaplaması
    let receivables = 0;
    if (useReceiptMatching) {
      const unmatchedIssuedReceipts = receipts?.filter(r => 
        r.document_type === 'issued' && 
        r.is_included_in_report && 
        !r.linked_bank_transaction_id
      ) || [];
      receivables = unmatchedIssuedReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    } else {
      receivables = settings.trade_receivables || 0;
    }

    // Borçlar hesaplaması
    let payables = 0;
    if (useReceiptMatching) {
      const unmatchedReceivedReceipts = receipts?.filter(r => 
        r.document_type !== 'issued' && 
        r.is_included_in_report && 
        !r.linked_bank_transaction_id
      ) || [];
      payables = unmatchedReceivedReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    } else {
      payables = settings.trade_payables || 0;
    }

    // Ortak hesabı - DOĞRU MANTIK:
    // Ortağa verilen para (ORTAK_OUT) = Ortaklardan Alacak (Aktif) - 131 hesabı
    // Ortaktan alınan para (ORTAK_IN) = Ortaklara Borç (Pasif) - 331 hesabı
    const partnerReceivables = financials.partnerOut > financials.partnerIn 
      ? financials.partnerOut - financials.partnerIn 
      : 0;
    const partnerPayables = financials.partnerIn > financials.partnerOut 
      ? financials.partnerIn - financials.partnerOut 
      : 0;

    // KDV hesaplaması - Devreden KDV dahil
    const vatPayable = vat.netVatPayable > 0 ? vat.netVatPayable : 0;
    const vatReceivable = vat.netVatPayable < 0 ? Math.abs(vat.netVatPayable) : 0;

    // Build balance sheet
    const currentAssets = {
      cash: settings.cash_on_hand || 0,
      banks: bankBalance,
      receivables,
      partnerReceivables,
      vatReceivable,
      inventory: settings.inventory_value || 0,
      prepaidExpenses: 0,
      total: 0,
    };
    currentAssets.total = currentAssets.cash + currentAssets.banks + currentAssets.receivables + 
                          currentAssets.partnerReceivables + currentAssets.vatReceivable + 
                          currentAssets.inventory + currentAssets.prepaidExpenses;

    // Calculate investment purchases from transactions
    const investmentCategories = categories.filter(c => c.type === 'INVESTMENT');
    const equipmentCat = investmentCategories.find(c => c.code === 'EKIPMAN');
    const vehicleCat = investmentCategories.find(c => c.code === 'ARAC');
    
    const equipmentPurchases = equipmentCat 
      ? (financials.byInvestmentType[equipmentCat.id]?.amount || 0)
      : 0;
    const vehiclePurchases = vehicleCat 
      ? (financials.byInvestmentType[vehicleCat.id]?.amount || 0)
      : 0;

    const fixedAssets = {
      equipment: (settings.equipment_value || 0) + equipmentPurchases,
      vehicles: (settings.vehicles_value || 0) + vehiclePurchases,
      depreciation: settings.accumulated_depreciation || 0,
      total: 0,
    };
    fixedAssets.total = fixedAssets.equipment + fixedAssets.vehicles - fixedAssets.depreciation;

    const totalAssets = currentAssets.total + fixedAssets.total;

    const shortTermLiabilities = {
      payables,
      vatPayable,
      taxPayable: 0,
      partnerPayables,
      total: 0,
    };
    shortTermLiabilities.total = shortTermLiabilities.payables + shortTermLiabilities.vatPayable + 
                                  shortTermLiabilities.taxPayable + shortTermLiabilities.partnerPayables;

    // Kredi ve Leasing hesaplaması - DOĞRU MANTIK:
    // Banka Kredileri = Başlangıç + Kullanılan Krediler - Ödenen Taksitler - Leasing Ödemeleri
    const krediInCat = categories.find(c => c.code === 'KREDI_IN');
    const krediOutCat = categories.find(c => c.code === 'KREDI_OUT');
    const leasingCat = categories.find(c => c.code === 'LEASING');

    // Kullanılan krediler (+)
    const krediIn = krediInCat 
      ? transactions
          .filter(t => t.category_id === krediInCat.id && t.amount > 0 && !t.is_excluded)
          .reduce((sum, t) => sum + t.amount, 0)
      : 0;

    // Ödenen kredi taksitleri (-)
    const krediOut = krediOutCat 
      ? transactions
          .filter(t => t.category_id === krediOutCat.id && t.amount < 0 && !t.is_excluded)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      : 0;

    // Leasing ödemeleri (-)
    const leasingPayments = leasingCat 
      ? transactions
          .filter(t => t.category_id === leasingCat.id && t.amount < 0 && !t.is_excluded)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      : 0;

    // Net banka kredisi = Başlangıç + Kullanılan - Ödenen - Leasing
    const bankLoansBalance = Math.max(0, 
      (settings.bank_loans || 0) + krediIn - krediOut - leasingPayments
    );

    const longTermLiabilities = {
      bankLoans: bankLoansBalance,
      total: bankLoansBalance,
    };

    const equity = {
      paidCapital: settings.paid_capital || 0,
      retainedEarnings: settings.retained_earnings || 0,
      currentProfit: financials.operatingProfit,
      total: 0,
    };
    equity.total = equity.paidCapital + equity.retainedEarnings + equity.currentProfit;

    const totalLiabilities = shortTermLiabilities.total + longTermLiabilities.total + equity.total;

    const difference = totalAssets - totalLiabilities;
    const isBalanced = Math.abs(difference) < 0.01;

    const balanceSheet: BalanceSheet = {
      asOfDate: `${year}-12-31`,
      year,
      currentAssets,
      fixedAssets,
      totalAssets,
      shortTermLiabilities,
      longTermLiabilities,
      equity,
      totalLiabilities,
      isBalanced,
      difference,
    };

    return { balanceSheet, isLoading: false };
  }, [isLoading, settings, financials, vat, transactions, receipts, categories, year]);
}
