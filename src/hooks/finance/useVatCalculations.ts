import { useMemo } from 'react';
import { useReceipts } from './useReceipts';
import { useBankTransactions } from './useBankTransactions';

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
  
  // İstatistikler
  issuedCount: number;           // Kesilen fatura sayısı
  receivedCount: number;         // Alınan fiş/fatura sayısı
  bankIncomeCount: number;       // Banka gelir işlemi sayısı
  bankExpenseCount: number;      // Banka gider işlemi sayısı
  missingVatCount: number;       // KDV bilgisi eksik belge sayısı
  
  isLoading: boolean;
}

export function useVatCalculations(year: number): VatCalculations {
  const { receipts, isLoading: receiptsLoading } = useReceipts(year);
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  
  const isLoading = receiptsLoading || txLoading;

  return useMemo(() => {
    if (isLoading || !receipts) {
      return {
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
        issuedCount: 0,
        receivedCount: 0,
        bankIncomeCount: 0,
        bankExpenseCount: 0,
        missingVatCount: 0,
        isLoading: true,
      };
    }

    // Filter active bank transactions (commercial only)
    const commercialTx = (transactions || []).filter(t => 
      !t.is_excluded && t.is_commercial !== false
    );

    // ===== FATURA BAZLI KDV =====
    // Tüm faturaları dahil et (banka ile eşleşmeyenler dahil)
    // Banka ile eşleşenler zaten banka KDV'sinde hesaplanıyor, çift sayma
    const unlinkedReceipts = receipts.filter(r => !r.linked_bank_transaction_id);
    
    // Kesilen faturalar (Hesaplanan KDV - borç)
    const issuedReceipts = unlinkedReceipts.filter(r => r.document_type === 'issued');
    const receiptCalculatedVat = issuedReceipts.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
    
    // Alınan fişler (İndirilecek KDV - alacak)
    const receivedReceipts = unlinkedReceipts.filter(r => r.document_type === 'received');
    const receiptDeductibleVat = receivedReceipts.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
    
    // KDV bilgisi eksik olanlar
    const missingVatCount = receipts.filter(r => !r.vat_amount && r.total_amount).length;

    // ===== BANKA İŞLEMİ BAZLI KDV =====
    // Gelirlerden hesaplanan KDV (brüt / 1.20 = net, brüt - net = KDV)
    const bankIncomeTx = commercialTx.filter(t => t.amount > 0);
    const bankCalculatedVat = bankIncomeTx.reduce((sum, t) => {
      if (t.vat_amount !== undefined && t.vat_amount !== null) {
        return sum + t.vat_amount;
      }
      // Fallback calculation
      return sum + (t.amount - t.amount / 1.20);
    }, 0);
    
    // Giderlerden indirilecek KDV
    const bankExpenseTx = commercialTx.filter(t => t.amount < 0);
    const bankDeductibleVat = bankExpenseTx.reduce((sum, t) => {
      if (t.vat_amount !== undefined && t.vat_amount !== null) {
        return sum + t.vat_amount;
      }
      // Fallback calculation
      const absAmount = Math.abs(t.amount);
      return sum + (absAmount - absAmount / 1.20);
    }, 0);

    // ===== TOPLAM KDV =====
    const totalCalculatedVat = receiptCalculatedVat + bankCalculatedVat;
    const totalDeductibleVat = receiptDeductibleVat + bankDeductibleVat;
    const netVatPayable = totalCalculatedVat - totalDeductibleVat;
    
    // ===== AYLIK DAĞILIM =====
    const byMonth: Record<number, VatByMonth> = {};
    for (let month = 1; month <= 12; month++) {
      // Receipt VAT
      const monthIssued = issuedReceipts.filter(r => r.month === month);
      const monthReceived = receivedReceipts.filter(r => r.month === month);
      const receiptCalc = monthIssued.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
      const receiptDed = monthReceived.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
      
      // Bank VAT
      const monthBankIncome = bankIncomeTx.filter(t => {
        if (!t.transaction_date) return false;
        return new Date(t.transaction_date).getMonth() + 1 === month;
      });
      const monthBankExpense = bankExpenseTx.filter(t => {
        if (!t.transaction_date) return false;
        return new Date(t.transaction_date).getMonth() + 1 === month;
      });
      
      const bankCalc = monthBankIncome.reduce((sum, t) => {
        if (t.vat_amount !== undefined && t.vat_amount !== null) return sum + t.vat_amount;
        return sum + (t.amount - t.amount / 1.20);
      }, 0);
      
      const bankDed = monthBankExpense.reduce((sum, t) => {
        if (t.vat_amount !== undefined && t.vat_amount !== null) return sum + t.vat_amount;
        const absAmount = Math.abs(t.amount);
        return sum + (absAmount - absAmount / 1.20);
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
      issuedCount: issuedReceipts.length,
      receivedCount: receivedReceipts.length,
      bankIncomeCount: bankIncomeTx.length,
      bankExpenseCount: bankExpenseTx.length,
      missingVatCount,
      isLoading: false,
    };
  }, [receipts, transactions, isLoading]);
}
