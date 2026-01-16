import { useMemo } from 'react';
import { useYearlyBalanceSheet } from './useYearlyBalanceSheet';

export interface CashFlowStatement {
  // A. İşletme Faaliyetleri
  operating: {
    netProfit: number;
    depreciation: number;
    receivablesChange: number;
    payablesChange: number;
    personnelChange: number;
    taxPayablesChange: number;
    socialSecurityChange: number;
    inventoryChange: number;
    vatPayableChange: number;
    vatReceivableChange: number;
    vatChange: number;
    total: number;
  };
  // B. Yatırım Faaliyetleri
  investing: {
    vehiclePurchases: number;
    equipmentPurchases: number;
    fixturePurchases: number;
    total: number;
  };
  // C. Finansman Faaliyetleri
  financing: {
    loanProceeds: number;
    loanRepayments: number;
    leasingPayments: number;
    partnerDeposits: number;
    partnerWithdrawals: number;
    capitalIncrease: number;
    total: number;
  };
  // Özet
  netCashChange: number;
  openingCash: number;
  closingCash: number;
  expectedClosingCash: number;
  difference: number;
  isBalanced: boolean;
}

export interface CashFlowDataStatus {
  currentYear: number;
  prevYear: number;
  currentYearSaved: boolean;
  currentYearLocked: boolean;
  prevYearSaved: boolean;
  prevYearLocked: boolean;
}

/**
 * Database-Only Cash Flow Hook
 * 
 * Bu hook SADECE yearly_balance_sheets tablosundan veri okur.
 * Canlı hesaplama, hub veya incomeStatement kullanılmaz.
 * 
 * - 2024: Kilitli veri (is_locked=true)
 * - 2025: Son kaydedilen veri (kilitlenene kadar)
 */
export function useCashFlowStatement(year: number) {
  // SADECE veritabanından oku - başka kaynak yok
  const { 
    yearlyBalance: currentYearBalance, 
    isLoading: currentLoading, 
    isLocked: currentLocked 
  } = useYearlyBalanceSheet(year);
  
  const { 
    yearlyBalance: prevYearBalance, 
    isLoading: prevLoading, 
    isLocked: prevLocked 
  } = useYearlyBalanceSheet(year - 1);
  
  const isLoading = currentLoading || prevLoading;

  // Veri durumu bilgisi - UI'da göstermek için
  const dataStatus = useMemo((): CashFlowDataStatus => ({
    currentYear: year,
    prevYear: year - 1,
    currentYearSaved: !!currentYearBalance,
    currentYearLocked: currentLocked ?? false,
    prevYearSaved: !!prevYearBalance,
    prevYearLocked: prevLocked ?? false,
  }), [year, currentYearBalance, currentLocked, prevYearBalance, prevLocked]);

  const cashFlowStatement = useMemo((): CashFlowStatement | null => {
    // Mevcut yıl verisi yoksa null döndür
    if (isLoading || !currentYearBalance) {
      return null;
    }

    // Önceki yıl değerleri (yoksa sıfır - ilk yıl için)
    const prev = {
      cash_on_hand: prevYearBalance?.cash_on_hand ?? 0,
      bank_balance: prevYearBalance?.bank_balance ?? 0,
      trade_receivables: prevYearBalance?.trade_receivables ?? 0,
      trade_payables: prevYearBalance?.trade_payables ?? 0,
      personnel_payables: prevYearBalance?.personnel_payables ?? 0,
      tax_payables: prevYearBalance?.tax_payables ?? 0,
      social_security_payables: prevYearBalance?.social_security_payables ?? 0,
      inventory: prevYearBalance?.inventory ?? 0,
      vat_receivable: prevYearBalance?.vat_receivable ?? 0,
      vat_payable: prevYearBalance?.vat_payable ?? 0,
      partner_receivables: prevYearBalance?.partner_receivables ?? 0,
      partner_payables: prevYearBalance?.partner_payables ?? 0,
      short_term_loan_debt: prevYearBalance?.short_term_loan_debt ?? 0,
      bank_loans: prevYearBalance?.bank_loans ?? 0,
      paid_capital: prevYearBalance?.paid_capital ?? 0,
      accumulated_depreciation: prevYearBalance?.accumulated_depreciation ?? 0,
      vehicles: prevYearBalance?.vehicles ?? 0,
      fixtures: prevYearBalance?.fixtures ?? 0,
      equipment: prevYearBalance?.equipment ?? 0,
    };
    
    const curr = currentYearBalance;

    // ═══════════════════════════════════════════════════════════════
    // A. İŞLETME FAALİYETLERİ (Veritabanı Farkları)
    // ═══════════════════════════════════════════════════════════════
    
    // Net kar - doğrudan veritabanından
    const netProfit = curr.current_profit ?? 0;
    
    // Amortisman artışı
    const depreciation = Math.abs((curr.accumulated_depreciation ?? 0) - prev.accumulated_depreciation);

    // İşletme sermayesi değişimleri (delta formülleri)
    // Alacak artışı = nakit azalışı (negatif etki)
    const receivablesChange = -((curr.trade_receivables ?? 0) - prev.trade_receivables);
    // Borç artışı = nakit artışı (pozitif etki)
    const payablesChange = (curr.trade_payables ?? 0) - prev.trade_payables;
    const personnelChange = (curr.personnel_payables ?? 0) - prev.personnel_payables;
    const taxPayablesChange = (curr.tax_payables ?? 0) - prev.tax_payables;
    const socialSecurityChange = (curr.social_security_payables ?? 0) - prev.social_security_payables;
    // Stok artışı = nakit azalışı (negatif etki)
    const inventoryChange = -((curr.inventory ?? 0) - prev.inventory);
    // KDV değişimi - detaylı takip
    const vatPayableChange = (curr.vat_payable ?? 0) - prev.vat_payable;
    const vatReceivableChange = (curr.vat_receivable ?? 0) - prev.vat_receivable;
    const vatChange = vatPayableChange - vatReceivableChange;

    const operatingTotal = netProfit + depreciation + receivablesChange + payablesChange +
                          personnelChange + taxPayablesChange + socialSecurityChange +
                          inventoryChange + vatChange;

    // ═══════════════════════════════════════════════════════════════
    // B. YATIRIM FAALİYETLERİ (Veritabanı Farkları - HUB YOK)
    // ═══════════════════════════════════════════════════════════════
    
    // Duran varlık artışları = yatırım çıkışları
    const vehiclePurchases = Math.max(0, (curr.vehicles ?? 0) - prev.vehicles);
    const equipmentPurchases = Math.max(0, (curr.equipment ?? 0) - prev.equipment);
    const fixturePurchases = Math.max(0, (curr.fixtures ?? 0) - prev.fixtures);
    
    const investingTotal = -(vehiclePurchases + equipmentPurchases + fixturePurchases);

    // ═══════════════════════════════════════════════════════════════
    // C. FİNANSMAN FAALİYETLERİ (Veritabanı Farkları)
    // ═══════════════════════════════════════════════════════════════
    
    // Kredi değişimleri
    const prevTotalLoans = prev.short_term_loan_debt + prev.bank_loans;
    const currTotalLoans = (curr.short_term_loan_debt ?? 0) + (curr.bank_loans ?? 0);
    const loanChange = currTotalLoans - prevTotalLoans;
    
    const loanProceeds = loanChange > 0 ? loanChange : 0;
    const loanRepayments = loanChange < 0 ? Math.abs(loanChange) : 0;
    
    // Ortak cari değişimleri
    // Net ortak pozisyonu: Borç - Alacak
    // Pozitif = Ortaklara borçluyuz (para koydular)
    // Negatif = Ortaklardan alacaklıyız (para çektiler)
    const prevPartnerNet = prev.partner_payables - prev.partner_receivables;
    const currPartnerNet = (curr.partner_payables ?? 0) - (curr.partner_receivables ?? 0);
    const partnerChange = currPartnerNet - prevPartnerNet;
    
    const partnerDeposits = partnerChange > 0 ? partnerChange : 0;
    const partnerWithdrawals = partnerChange < 0 ? Math.abs(partnerChange) : 0;
    
    // Sermaye artışı
    const capitalIncrease = (curr.paid_capital ?? 0) - prev.paid_capital;
    
    // Leasing ödemeleri: Veritabanında ayrı alan yok, şimdilik 0
    const leasingPayments = 0;

    const financingTotal = loanProceeds - loanRepayments - leasingPayments +
                          partnerDeposits - partnerWithdrawals + capitalIncrease;

    // ═══════════════════════════════════════════════════════════════
    // ÖZET
    // ═══════════════════════════════════════════════════════════════
    const netCashChange = operatingTotal + investingTotal + financingTotal;
    const openingCash = prev.cash_on_hand + prev.bank_balance;
    const closingCash = (curr.cash_on_hand ?? 0) + (curr.bank_balance ?? 0);
    const expectedClosingCash = openingCash + netCashChange;
    const difference = Math.round(closingCash - expectedClosingCash);
    const isBalanced = Math.abs(difference) < 1;

    return {
      operating: {
        netProfit,
        depreciation,
        receivablesChange,
        payablesChange,
        personnelChange,
        taxPayablesChange,
        socialSecurityChange,
        inventoryChange,
        vatPayableChange,
        vatReceivableChange,
        vatChange,
        total: operatingTotal,
      },
      investing: {
        vehiclePurchases,
        equipmentPurchases,
        fixturePurchases,
        total: investingTotal,
      },
      financing: {
        loanProceeds,
        loanRepayments,
        leasingPayments,
        partnerDeposits,
        partnerWithdrawals,
        capitalIncrease,
        total: financingTotal,
      },
      netCashChange,
      openingCash,
      closingCash,
      expectedClosingCash,
      difference,
      isBalanced,
    };
  }, [currentYearBalance, prevYearBalance, isLoading]);

  return {
    cashFlowStatement,
    isLoading,
    dataStatus,
  };
}
