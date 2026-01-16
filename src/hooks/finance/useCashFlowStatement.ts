import { useMemo } from 'react';
import { useYearlyBalanceSheet } from './useYearlyBalanceSheet';
import { useIncomeStatement } from './useIncomeStatement';
import { useFinancialDataHub } from './useFinancialDataHub';

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

export function useCashFlowStatement(year: number) {
  // Veritabanından mevcut ve önceki yıl bilançolarını oku
  const { yearlyBalance: currentYearBalance, isLoading: currentLoading } = useYearlyBalanceSheet(year);
  const { yearlyBalance: prevYearBalance, isLoading: prevLoading } = useYearlyBalanceSheet(year - 1);
  
  // Gelir tablosu (net kar için)
  const { statement: incomeStatement, isLoading: incomeLoading } = useIncomeStatement(year);
  
  // Yatırım ve finansman detayları için hub
  const hub = useFinancialDataHub(year);

  const isLoading = currentLoading || prevLoading || incomeLoading || hub.isLoading;

  const cashFlowStatement = useMemo((): CashFlowStatement | null => {
    // Mevcut yıl bilanço verisi yoksa null döndür
    if (isLoading || !currentYearBalance) {
      return null;
    }

    // Önceki yıl değerleri (yoksa sıfır)
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
    };
    
    const curr = currentYearBalance;

    // A. İŞLETME FAALİYETLERİ - Veritabanı Farkları
    const netProfit = incomeStatement?.netProfit ?? curr.current_profit ?? 0;
    const depreciation = Math.abs(curr.accumulated_depreciation - prev.accumulated_depreciation);

    // Değişimler (artış = nakit azalışı için alacaklar, artış = nakit artışı için borçlar)
    const receivablesChange = -(curr.trade_receivables - prev.trade_receivables);
    const payablesChange = curr.trade_payables - prev.trade_payables;
    const personnelChange = curr.personnel_payables - prev.personnel_payables;
    const taxPayablesChange = curr.tax_payables - prev.tax_payables;
    const socialSecurityChange = curr.social_security_payables - prev.social_security_payables;
    const inventoryChange = -(curr.inventory - prev.inventory);
    const vatChange = (curr.vat_payable - prev.vat_payable) - (curr.vat_receivable - prev.vat_receivable);

    const operatingTotal = netProfit + depreciation + receivablesChange + payablesChange +
                          personnelChange + taxPayablesChange + socialSecurityChange +
                          inventoryChange + vatChange;

    // B. YATIRIM FAALİYETLERİ - Hub'dan (işlem bazlı)
    const vehiclePurchases = hub.investmentSummary?.vehicles ?? 0;
    const equipmentPurchases = hub.investmentSummary?.equipment ?? 0;
    const fixturePurchases = hub.investmentSummary?.fixtures ?? 0;
    const investingTotal = -(vehiclePurchases + equipmentPurchases + fixturePurchases);

    // C. FİNANSMAN FAALİYETLERİ - Veritabanı Farkları + Hub
    const prevTotalLoans = prev.short_term_loan_debt + prev.bank_loans;
    const currTotalLoans = curr.short_term_loan_debt + curr.bank_loans;
    const loanChange = currTotalLoans - prevTotalLoans;
    
    const loanProceeds = loanChange > 0 ? loanChange : 0;
    const loanRepayments = loanChange < 0 ? Math.abs(loanChange) : 0;
    
    const prevPartnerNet = prev.partner_payables - prev.partner_receivables;
    const currPartnerNet = curr.partner_payables - curr.partner_receivables;
    const partnerChange = currPartnerNet - prevPartnerNet;
    
    const partnerDeposits = partnerChange > 0 ? partnerChange : 0;
    const partnerWithdrawals = partnerChange < 0 ? Math.abs(partnerChange) : 0;
    
    const capitalIncrease = curr.paid_capital - prev.paid_capital;
    const leasingPayments = hub.financingSummary?.leasingOut ?? 0;

    const financingTotal = loanProceeds - loanRepayments - leasingPayments +
                          partnerDeposits - partnerWithdrawals + capitalIncrease;

    // ÖZET
    const netCashChange = operatingTotal + investingTotal + financingTotal;
    const openingCash = prev.cash_on_hand + prev.bank_balance;
    const closingCash = curr.cash_on_hand + curr.bank_balance;
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
  }, [currentYearBalance, prevYearBalance, incomeStatement, hub.investmentSummary, hub.financingSummary, isLoading]);

  return {
    cashFlowStatement,
    isLoading,
  };
}
