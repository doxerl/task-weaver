import { useMemo } from 'react';
import { useReceipts } from './useReceipts';
import { useBankTransactions } from './useBankTransactions';
import { separateVat } from './utils/vatSeparation';
import { useOfficialDataStatus } from './useOfficialDataStatus';

export interface VatByMonth {
  calculatedVat: number;
  deductibleVat: number;
  netVat: number;
  issuedCount: number;
  receivedCount: number;
  // Bank transaction VAT
  bankCalculatedVat: number;
  bankDeductibleVat: number;
  bankIncomeCount: number;
  bankExpenseCount: number;
}

export interface VatByRate {
  calculatedVat: number;
  deductibleVat: number;
  issuedCount: number;
  receivedCount: number;
}

export interface VatBySource {
  receipts: {
    calculated: number;
    deductible: number;
    count: number;
  };
  bank: {
    calculated: number;
    deductible: number;
    count: number;
  };
}

export interface ForeignInvoiceSummary {
  count: number;
  totalAmountTry: number;
  byMonth: Record<number, { count: number; amountTry: number }>;
}

export interface VatCalculations {
  // Toplam KDV
  totalCalculatedVat: number;    // Kesilen faturalardan + banka gelirlerden (borç)
  totalDeductibleVat: number;    // Alınan fişlerden + banka giderlerden (alacak)
  netVatPayable: number;         // Net ödenecek KDV
  
  // Fatura bazlı KDV
  receiptCalculatedVat: number;
  receiptDeductibleVat: number;
  
  // Banka işlemi bazlı KDV
  bankCalculatedVat: number;
  bankDeductibleVat: number;
  
  // Aylık dağılım
  byMonth: Record<number, VatByMonth>;
  
  // KDV oranlarına göre dağılım
  byVatRate: Record<number, VatByRate>;
  
  // Kaynak bazlı dağılım
  bySource: VatBySource;
  
  // Yurtdışı fatura özeti (KDV muaf)
  foreignInvoices: ForeignInvoiceSummary;
  
  // İstatistikler
  issuedCount: number;           // Kesilen fatura sayısı
  receivedCount: number;         // Alınan fiş/fatura sayısı
  bankIncomeCount: number;       // Banka gelir işlemi sayısı
  bankExpenseCount: number;      // Banka gider işlemi sayısı
  missingVatCount: number;       // KDV bilgisi eksik belge sayısı
  
  isLoading: boolean;
}

// Default empty VAT calculations
const EMPTY_VAT_CALCULATIONS: VatCalculations & { isOfficial: boolean; officialWarning?: string } = {
  totalCalculatedVat: 0,
  totalDeductibleVat: 0,
  netVatPayable: 0,
  receiptCalculatedVat: 0,
  receiptDeductibleVat: 0,
  bankCalculatedVat: 0,
  bankDeductibleVat: 0,
  byMonth: {},
  byVatRate: {},
  bySource: {
    receipts: { calculated: 0, deductible: 0, count: 0 },
    bank: { calculated: 0, deductible: 0, count: 0 }
  },
  foreignInvoices: {
    count: 0,
    totalAmountTry: 0,
    byMonth: {},
  },
  issuedCount: 0,
  receivedCount: 0,
  bankIncomeCount: 0,
  bankExpenseCount: 0,
  missingVatCount: 0,
  isLoading: false,
  isOfficial: false,
};

export function useVatCalculations(year: number): VatCalculations & { isOfficial: boolean; officialWarning?: string } {
  const { receipts, isLoading: receiptsLoading } = useReceipts(year);
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  const isLoading = receiptsLoading || txLoading;

  // useMemo MUST be called unconditionally - conditional logic inside
  return useMemo(() => {
    // Official data locked - return empty calculations with warning
    if (isAnyLocked && !isLoading) {
      return {
        ...EMPTY_VAT_CALCULATIONS,
        isOfficial: true,
        officialWarning: 'Resmi veri modunda KDV dinamik hesaplanmaz',
      };
    }

    // Loading state
    if (isLoading || !receipts) {
      return {
        ...EMPTY_VAT_CALCULATIONS,
        isLoading: true,
      };
    }

    // Filter active bank transactions (not excluded)
    const activeTx = (transactions || []).filter(t => !t.is_excluded);

    // ===== FATURA BAZLI KDV =====
    // TÜM yurtiçi faturalar dahil (banka eşleşmesine bakılmaksızın)
    const domesticReceipts = receipts.filter(r => !r.is_foreign_invoice);
    const foreignReceipts = receipts.filter(r => r.is_foreign_invoice);
    
    // Kesilen faturalar (Hesaplanan KDV - borç) - TRY alanını öncelikli kullan
    const issuedReceipts = domesticReceipts.filter(r => r.document_type === 'issued');
    const receiptCalculatedVat = issuedReceipts.reduce((sum, r) => 
      sum + (r.vat_amount_try || r.vat_amount || 0), 0);
    
    // Alınan fişler (İndirilecek KDV - alacak) - TRY alanını öncelikli kullan
    const receivedReceipts = domesticReceipts.filter(r => r.document_type === 'received');
    const receiptDeductibleVat = receivedReceipts.reduce((sum, r) => 
      sum + (r.vat_amount_try || r.vat_amount || 0), 0);
    
    // KDV bilgisi eksik olanlar (sadece yurtiçi)
    const missingVatCount = domesticReceipts.filter(r => 
      !r.vat_amount && !r.vat_amount_try && r.total_amount
    ).length;

    // ===== YURTDIŞI FATURA ÖZETİ (KDV muaf) =====
    const foreignInvoices: ForeignInvoiceSummary = {
      count: foreignReceipts.length,
      totalAmountTry: foreignReceipts.reduce((sum, r) => 
        sum + (r.amount_try || r.total_amount || 0), 0),
      byMonth: {},
    };
    
    for (let month = 1; month <= 12; month++) {
      const monthForeign = foreignReceipts.filter(r => r.month === month);
      foreignInvoices.byMonth[month] = {
        count: monthForeign.length,
        amountTry: monthForeign.reduce((sum, r) => 
          sum + (r.amount_try || r.total_amount || 0), 0),
      };
    }

    // ===== BANKA İŞLEMİ BAZLI KDV (separateVat ile tutarlı) =====
    // Fatura ile eşleşen banka işlem ID'lerini topla (çift sayımı önle)
    const linkedBankTxIds = new Set(
      receipts
        .filter(r => r.linked_bank_transaction_id)
        .map(r => r.linked_bank_transaction_id)
    );
    
    // Sadece fatura ile EŞLEŞMEMİŞ banka işlemlerinden KDV hesapla
    const unlinkedBankTx = activeTx.filter(t => !linkedBankTxIds.has(t.id));
    
    // Gelirlerden hesaplanan KDV - only commercial & unlinked transactions
    const bankIncomeTx = unlinkedBankTx.filter(t => t.amount > 0 && t.is_commercial === true);
    const bankCalculatedVat = bankIncomeTx.reduce((sum, t) => {
      const vatResult = separateVat({
        amount: t.amount,
        vat_amount: t.vat_amount,
        vat_rate: t.vat_rate,
        is_commercial: t.is_commercial,
      });
      return sum + vatResult.vatAmount;
    }, 0);
    
    // Giderlerden indirilecek KDV - only commercial & unlinked transactions
    const bankExpenseTx = unlinkedBankTx.filter(t => t.amount < 0 && t.is_commercial === true);
    const bankDeductibleVat = bankExpenseTx.reduce((sum, t) => {
      const vatResult = separateVat({
        amount: t.amount,
        vat_amount: t.vat_amount,
        vat_rate: t.vat_rate,
        is_commercial: t.is_commercial,
      });
      return sum + vatResult.vatAmount;
    }, 0);

    // ===== TOPLAM KDV =====
    const totalCalculatedVat = receiptCalculatedVat + bankCalculatedVat;
    const totalDeductibleVat = receiptDeductibleVat + bankDeductibleVat;
    const netVatPayable = totalCalculatedVat - totalDeductibleVat;
    
    // ===== AYLIK DAĞILIM =====
    const byMonth: Record<number, VatByMonth> = {};
    for (let month = 1; month <= 12; month++) {
      // Receipt VAT - TRY alanını öncelikli kullan
      const monthIssued = issuedReceipts.filter(r => r.month === month);
      const monthReceived = receivedReceipts.filter(r => r.month === month);
      const receiptCalc = monthIssued.reduce((sum, r) => 
        sum + (r.vat_amount_try || r.vat_amount || 0), 0);
      const receiptDed = monthReceived.reduce((sum, r) => 
        sum + (r.vat_amount_try || r.vat_amount || 0), 0);
      
      // Bank VAT (using separateVat for consistency)
      const monthBankIncome = bankIncomeTx.filter(t => {
        if (!t.transaction_date) return false;
        return new Date(t.transaction_date).getMonth() + 1 === month;
      });
      const monthBankExpense = bankExpenseTx.filter(t => {
        if (!t.transaction_date) return false;
        return new Date(t.transaction_date).getMonth() + 1 === month;
      });
      
      const bankCalc = monthBankIncome.reduce((sum, t) => {
        const vatResult = separateVat({
          amount: t.amount,
          vat_amount: t.vat_amount,
          vat_rate: t.vat_rate,
          is_commercial: t.is_commercial,
        });
        return sum + vatResult.vatAmount;
      }, 0);
      
      const bankDed = monthBankExpense.reduce((sum, t) => {
        const vatResult = separateVat({
          amount: t.amount,
          vat_amount: t.vat_amount,
          vat_rate: t.vat_rate,
          is_commercial: t.is_commercial,
        });
        return sum + vatResult.vatAmount;
      }, 0);
      
      const totalCalc = receiptCalc + bankCalc;
      const totalDed = receiptDed + bankDed;
      
      byMonth[month] = {
        calculatedVat: totalCalc,
        deductibleVat: totalDed,
        netVat: totalCalc - totalDed,
        issuedCount: monthIssued.length,
        receivedCount: monthReceived.length,
        bankCalculatedVat: bankCalc,
        bankDeductibleVat: bankDed,
        bankIncomeCount: monthBankIncome.length,
        bankExpenseCount: monthBankExpense.length,
      };
    }
    
    // ===== KDV ORANLARINA GÖRE DAĞILIM (sadece faturalar) =====
    const vatRates = [1, 10, 20];
    const byVatRate: Record<number, VatByRate> = {};
    
    for (const rate of vatRates) {
      const rateIssued = issuedReceipts.filter(r => r.vat_rate === rate);
      const rateReceived = receivedReceipts.filter(r => r.vat_rate === rate);
      
      byVatRate[rate] = {
        calculatedVat: rateIssued.reduce((sum, r) => sum + (r.vat_amount || 0), 0),
        deductibleVat: rateReceived.reduce((sum, r) => sum + (r.vat_amount || 0), 0),
        issuedCount: rateIssued.length,
        receivedCount: rateReceived.length,
      };
    }
    
    // Diğer oranlar için (varsa)
    const otherIssued = issuedReceipts.filter(r => r.vat_rate && !vatRates.includes(r.vat_rate));
    const otherReceived = receivedReceipts.filter(r => r.vat_rate && !vatRates.includes(r.vat_rate));
    
    if (otherIssued.length > 0 || otherReceived.length > 0) {
      byVatRate[0] = {
        calculatedVat: otherIssued.reduce((sum, r) => sum + (r.vat_amount || 0), 0),
        deductibleVat: otherReceived.reduce((sum, r) => sum + (r.vat_amount || 0), 0),
        issuedCount: otherIssued.length,
        receivedCount: otherReceived.length,
      };
    }

    // ===== KAYNAK BAZLI DAĞILIM =====
    const bySource: VatBySource = {
      receipts: {
        calculated: receiptCalculatedVat,
        deductible: receiptDeductibleVat,
        count: issuedReceipts.length + receivedReceipts.length,
      },
      bank: {
        calculated: bankCalculatedVat,
        deductible: bankDeductibleVat,
        count: bankIncomeTx.length + bankExpenseTx.length,
      }
    };

    return {
      totalCalculatedVat,
      totalDeductibleVat,
      netVatPayable,
      receiptCalculatedVat,
      receiptDeductibleVat,
      bankCalculatedVat,
      bankDeductibleVat,
      byMonth,
      byVatRate,
      bySource,
      foreignInvoices,
      issuedCount: issuedReceipts.length,
      receivedCount: receivedReceipts.length,
      bankIncomeCount: bankIncomeTx.length,
      bankExpenseCount: bankExpenseTx.length,
      missingVatCount,
      isLoading: false,
      isOfficial: false,
    };
  }, [receipts, transactions, isLoading, isAnyLocked]);
}
