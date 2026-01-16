import { useMemo } from 'react';
import { useFinancialDataHub } from './useFinancialDataHub';
import { useIncomeStatement } from './useIncomeStatement';
import { usePreviousYearBalance } from './usePreviousYearBalance';
import { useBalanceSheet } from './useBalanceSheet';

export interface CashFlowStatement {
  // A. İşletme Faaliyetleri
  operating: {
    netProfit: number;
    depreciation: number;
    receivablesChange: number;
    payablesChange: number;
    personnelChange: number;
    taxPayablesChange: number;        // Ödenecek Vergi Değişimi (360)
    socialSecurityChange: number;      // Ödenecek SGK Değişimi (361)
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
  const hub = useFinancialDataHub(year);
  const { statement: incomeStatement, isLoading: incomeLoading } = useIncomeStatement(year);
  const { previousYearBalance, isLoading: prevLoading } = usePreviousYearBalance(year - 1);
  const { balanceSheet, isLoading: balanceLoading } = useBalanceSheet(year);

  const isLoading = hub.isLoading || incomeLoading || prevLoading || balanceLoading;

  const cashFlowStatement = useMemo((): CashFlowStatement | null => {
    if (isLoading || !hub || !incomeStatement) {
      return null;
    }

    // Önceki yıl değerleri (yoksa 0)
    const prevTradeReceivables = previousYearBalance?.trade_receivables ?? 0;
    const prevTradePayables = previousYearBalance?.trade_payables ?? 0;
    const prevPersonnelPayables = previousYearBalance?.personnel_payables ?? 0;
    const prevTaxPayables = previousYearBalance?.tax_payables ?? 0;
    const prevSocialSecurityPayables = previousYearBalance?.social_security_payables ?? 0;
    const prevInventory = previousYearBalance?.inventory ?? 0;
    const prevVatReceivable = previousYearBalance?.vat_receivable ?? 0;
    const prevVatPayable = previousYearBalance?.vat_payable ?? 0;
    const prevCash = (previousYearBalance?.cash_on_hand ?? 0) + (previousYearBalance?.bank_balance ?? 0);

    // Mevcut yıl değerleri - CANLI VERİ (balanceSheet'ten)
    const currentTradeReceivables = balanceSheet?.currentAssets?.receivables ?? 0;
    const currentTradePayables = balanceSheet?.shortTermLiabilities?.payables ?? 0;
    const currentPersonnelPayables = balanceSheet?.shortTermLiabilities?.personnelPayables ?? 0;
    const currentTaxPayables = balanceSheet?.shortTermLiabilities?.taxPayables ?? 0;
    const currentSocialSecurityPayables = balanceSheet?.shortTermLiabilities?.socialSecurityPayables ?? 0;
    const currentInventory = balanceSheet?.currentAssets?.inventory ?? 0;
    const currentVatReceivable = balanceSheet?.currentAssets?.vatReceivable ?? 0;
    const currentVatPayable = balanceSheet?.shortTermLiabilities?.vatPayable ?? 0;
    const currentCash = (balanceSheet?.currentAssets?.cash ?? 0) + (balanceSheet?.currentAssets?.banks ?? 0);

    // A. İŞLETME FAALİYETLERİ
    const netProfit = incomeStatement?.netProfit ?? 0;
    const depreciation = balanceSheet?.fixedAssets?.depreciation ?? 0;
    
    // Değişimler (artış = nakit azalışı için alacaklar, artış = nakit artışı için borçlar)
    const receivablesChange = -(currentTradeReceivables - prevTradeReceivables); // Alacak artışı = nakit azalışı
    const payablesChange = currentTradePayables - prevTradePayables; // Borç artışı = nakit artışı
    const personnelChange = currentPersonnelPayables - prevPersonnelPayables;
    const taxPayablesChange = currentTaxPayables - prevTaxPayables; // Vergi borcu artışı = nakit artışı
    const socialSecurityChange = currentSocialSecurityPayables - prevSocialSecurityPayables; // SGK borcu artışı = nakit artışı
    const inventoryChange = -(currentInventory - prevInventory); // Stok artışı = nakit azalışı
    const vatChange = (currentVatPayable - prevVatPayable) - (currentVatReceivable - prevVatReceivable);

    const operatingTotal = netProfit + depreciation + receivablesChange + payablesChange + 
                          personnelChange + taxPayablesChange + socialSecurityChange +
                          inventoryChange + vatChange;

    // B. YATIRIM FAALİYETLERİ
    const vehiclePurchases = hub.investmentSummary?.vehicles ?? 0;
    const equipmentPurchases = hub.investmentSummary?.equipment ?? 0;
    const fixturePurchases = hub.investmentSummary?.fixtures ?? 0;
    const investingTotal = -(vehiclePurchases + equipmentPurchases + fixturePurchases);

    // C. FİNANSMAN FAALİYETLERİ
    const loanProceeds = hub.financingSummary?.creditIn ?? 0;
    const loanRepayments = hub.financingSummary?.creditOut ?? 0;
    const leasingPayments = hub.financingSummary?.leasingOut ?? 0;
    const partnerDeposits = hub.partnerSummary?.deposits ?? 0;
    const partnerWithdrawals = hub.partnerSummary?.withdrawals ?? 0;
    const capitalIncrease = 0; // Sermaye artışı varsa eklenebilir

    const financingTotal = loanProceeds - loanRepayments - leasingPayments + 
                          partnerDeposits - partnerWithdrawals + capitalIncrease;

    // ÖZET
    const netCashChange = operatingTotal + investingTotal + financingTotal;
    const openingCash = prevCash;
    const closingCash = currentCash;
    const expectedClosingCash = openingCash + netCashChange;
    const difference = closingCash - expectedClosingCash;
    const isBalanced = Math.abs(difference) < 1; // 1 TL tolerans

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
  }, [hub, incomeStatement, previousYearBalance, balanceSheet, isLoading]);

  return {
    cashFlowStatement,
    isLoading,
  };
}
