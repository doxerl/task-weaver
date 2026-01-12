import { useMemo } from 'react';
import { useReceipts } from './useReceipts';

export interface VatByMonth {
  calculatedVat: number;
  deductibleVat: number;
  netVat: number;
  issuedCount: number;
  receivedCount: number;
}

export interface VatByRate {
  calculatedVat: number;
  deductibleVat: number;
  issuedCount: number;
  receivedCount: number;
}

export interface VatCalculations {
  // Toplam KDV
  totalCalculatedVat: number;    // Kesilen faturalardan (borç)
  totalDeductibleVat: number;    // Alınan fişlerden (alacak)
  netVatPayable: number;         // Net ödenecek KDV
  
  // Aylık dağılım
  byMonth: Record<number, VatByMonth>;
  
  // KDV oranlarına göre dağılım
  byVatRate: Record<number, VatByRate>;
  
  // İstatistikler
  issuedCount: number;           // Kesilen fatura sayısı
  receivedCount: number;         // Alınan fiş/fatura sayısı
  missingVatCount: number;       // KDV bilgisi eksik belge sayısı
  
  isLoading: boolean;
}

export function useVatCalculations(year: number): VatCalculations {
  const { receipts, isLoading } = useReceipts(year);

  return useMemo(() => {
    if (isLoading || !receipts) {
      return {
        totalCalculatedVat: 0,
        totalDeductibleVat: 0,
        netVatPayable: 0,
        byMonth: {},
        byVatRate: {},
        issuedCount: 0,
        receivedCount: 0,
        missingVatCount: 0,
        isLoading: true,
      };
    }

    // Sadece rapora dahil edilen belgeler
    const includedReceipts = receipts.filter(r => r.is_included_in_report);
    
    // Kesilen faturalar (Hesaplanan KDV - borç)
    const issuedReceipts = includedReceipts.filter(r => r.document_type === 'issued');
    const totalCalculatedVat = issuedReceipts.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
    
    // Alınan fişler (İndirilecek KDV - alacak)
    const receivedReceipts = includedReceipts.filter(r => r.document_type === 'received');
    const totalDeductibleVat = receivedReceipts.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
    
    // Net KDV borcu
    const netVatPayable = totalCalculatedVat - totalDeductibleVat;
    
    // KDV bilgisi eksik olanlar
    const missingVatCount = includedReceipts.filter(r => !r.vat_amount && r.total_amount).length;
    
    // Aylık dağılım
    const byMonth: Record<number, VatByMonth> = {};
    for (let month = 1; month <= 12; month++) {
      const monthIssued = issuedReceipts.filter(r => r.month === month);
      const monthReceived = receivedReceipts.filter(r => r.month === month);
      
      const calculatedVat = monthIssued.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
      const deductibleVat = monthReceived.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
      
      byMonth[month] = {
        calculatedVat,
        deductibleVat,
        netVat: calculatedVat - deductibleVat,
        issuedCount: monthIssued.length,
        receivedCount: monthReceived.length,
      };
    }
    
    // KDV oranlarına göre dağılım (Türkiye: %1, %10, %20)
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

    return {
      totalCalculatedVat,
      totalDeductibleVat,
      netVatPayable,
      byMonth,
      byVatRate,
      issuedCount: issuedReceipts.length,
      receivedCount: receivedReceipts.length,
      missingVatCount,
      isLoading: false,
    };
  }, [receipts, isLoading]);
}
