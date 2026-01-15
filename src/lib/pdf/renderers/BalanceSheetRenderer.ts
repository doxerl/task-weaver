// ============================================
// BALANCE SHEET RENDERER
// BalanceSheet data → jspdf-autotable rows
// Tekdüzen Hesap Planı formatında
// ============================================

import type { BalanceSheet } from '@/types/finance';

export interface BalanceSheetRow {
  label: string;
  amount: string;
  isHeader?: boolean;
  isTotal?: boolean;
  indent?: number;
}

/**
 * Aktif (Varlıklar) tablosu için satırları oluştur
 */
export function buildAssetRows(
  data: BalanceSheet,
  formatAmount: (value: number) => string
): string[][] {
  const rows: string[][] = [];
  const ca = data.currentAssets;
  const fa = data.fixedAssets;

  // I - DÖNEN VARLIKLAR
  rows.push(['I - DÖNEN VARLIKLAR', '']);
  rows.push(['  A - Hazır Değerler', '']);
  rows.push(['    100 - Kasa', formatAmount(ca.cash)]);
  rows.push(['    102 - Bankalar', formatAmount(ca.banks)]);
  
  // Ticari Alacaklar
  if (ca.receivables > 0 || ca.partnerReceivables > 0) {
    rows.push(['  B - Ticari Alacaklar', '']);
    if (ca.receivables > 0) {
      rows.push(['    120 - Alıcılar', formatAmount(ca.receivables)]);
    }
    if (ca.partnerReceivables > 0) {
      rows.push(['    131 - Ortaklardan Alacaklar', formatAmount(ca.partnerReceivables)]);
    }
  }
  
  // Diğer Alacaklar (KDV)
  if (ca.vatReceivable > 0 || (ca.otherVat && ca.otherVat > 0)) {
    rows.push(['  C - Diğer Alacaklar', '']);
    if (ca.vatReceivable > 0) {
      rows.push(['    191 - İndirilecek KDV', formatAmount(ca.vatReceivable)]);
    }
    if (ca.otherVat && ca.otherVat > 0) {
      rows.push(['    192 - Diğer KDV', formatAmount(ca.otherVat)]);
    }
  }
  
  // Stoklar
  if (ca.inventory > 0) {
    rows.push(['  D - Stoklar', '']);
    rows.push(['    153 - Ticari Mallar', formatAmount(ca.inventory)]);
  }
  
  // Peşin Ödenmiş Giderler
  if (ca.prepaidExpenses > 0) {
    rows.push(['  E - Gelecek Aylara Ait Giderler', '']);
    rows.push(['    180 - Peşin Ödenmiş Giderler', formatAmount(ca.prepaidExpenses)]);
  }
  
  rows.push(['  DÖNEN VARLIKLAR TOPLAMI', formatAmount(ca.total)]);

  // II - DURAN VARLIKLAR
  rows.push(['II - DURAN VARLIKLAR', '']);
  rows.push(['  A - Maddi Duran Varlıklar', '']);
  
  if (fa.equipment > 0) {
    rows.push(['    255 - Demirbaşlar', formatAmount(fa.equipment)]);
  }
  if (fa.vehicles > 0) {
    rows.push(['    254 - Taşıtlar', formatAmount(fa.vehicles)]);
  }
  if (fa.depreciation > 0) {
    rows.push(['    257 - Birikmiş Amortisman (-)', `(${formatAmount(fa.depreciation)})`]);
  }
  
  rows.push(['  DURAN VARLIKLAR TOPLAMI', formatAmount(fa.total)]);

  // AKTİF TOPLAMI
  rows.push(['AKTİF TOPLAMI', formatAmount(data.totalAssets)]);

  return rows;
}

/**
 * Pasif (Kaynaklar) tablosu için satırları oluştur
 */
export function buildLiabilityRows(
  data: BalanceSheet,
  formatAmount: (value: number) => string
): string[][] {
  const rows: string[][] = [];
  const stl = data.shortTermLiabilities;
  const ltl = data.longTermLiabilities;
  const eq = data.equity;

  // I - KISA VADELİ YABANCI KAYNAKLAR
  rows.push(['I - KISA VADELİ YABANCI KAYNAKLAR', '']);
  
  // Mali Borçlar
  if (stl.loanInstallments > 0) {
    rows.push(['  A - Mali Borçlar', '']);
    rows.push(['    300 - Banka Kredileri', formatAmount(stl.loanInstallments)]);
  }
  
  // Ticari Borçlar
  rows.push(['  B - Ticari Borçlar', '']);
  if (stl.payables > 0) {
    rows.push(['    320 - Satıcılar', formatAmount(stl.payables)]);
  }
  if (stl.partnerPayables > 0) {
    rows.push(['    331 - Ortaklara Borçlar', formatAmount(stl.partnerPayables)]);
  }
  
  // Diğer Borçlar
  if (stl.personnelPayables && stl.personnelPayables > 0) {
    rows.push(['  C - Diğer Borçlar', '']);
    rows.push(['    335 - Personele Borçlar', formatAmount(stl.personnelPayables)]);
  }
  
  // Ödenecek Vergi ve Fonlar
  rows.push(['  D - Ödenecek Vergi ve Fonlar', '']);
  if (stl.taxPayable > 0) {
    rows.push(['    360 - Ödenecek Vergi', formatAmount(stl.taxPayable)]);
  }
  if (stl.vatPayable > 0) {
    rows.push(['    391 - Hesaplanan KDV', formatAmount(stl.vatPayable)]);
  }
  if (stl.socialSecurityPayables && stl.socialSecurityPayables > 0) {
    rows.push(['    361 - Ödenecek SGK', formatAmount(stl.socialSecurityPayables)]);
  }
  if (stl.taxProvision && stl.taxProvision > 0) {
    rows.push(['    370 - Dönem Karı Vergi Karşılığı', formatAmount(stl.taxProvision)]);
  }
  
  rows.push(['  KISA VADELİ YABANCI KAYNAKLAR TOPLAMI', formatAmount(stl.total)]);

  // II - UZUN VADELİ YABANCI KAYNAKLAR
  if (ltl.bankLoans > 0 || ltl.total > 0) {
    rows.push(['II - UZUN VADELİ YABANCI KAYNAKLAR', '']);
    rows.push(['  A - Mali Borçlar', '']);
    if (ltl.bankLoans > 0) {
      rows.push(['    400 - Banka Kredileri', formatAmount(ltl.bankLoans)]);
    }
    rows.push(['  UZUN VADELİ YABANCI KAYNAKLAR TOPLAMI', formatAmount(ltl.total)]);
  }

  // III - ÖZKAYNAKLAR
  rows.push(['III - ÖZKAYNAKLAR', '']);
  rows.push(['  A - Ödenmiş Sermaye', '']);
  rows.push(['    500 - Sermaye', formatAmount(eq.paidCapital)]);
  if (eq.unpaidCapital && eq.unpaidCapital > 0) {
    rows.push(['    501 - Ödenmemiş Sermaye (-)', `(${formatAmount(eq.unpaidCapital)})`]);
  }
  
  rows.push(['  B - Kar Yedekleri', '']);
  if (eq.retainedEarnings !== 0) {
    const label = eq.retainedEarnings >= 0 ? '570 - Geçmiş Yıllar Karları' : '580 - Geçmiş Yıllar Zararları (-)';
    const value = eq.retainedEarnings >= 0 
      ? formatAmount(eq.retainedEarnings) 
      : `(${formatAmount(Math.abs(eq.retainedEarnings))})`;
    rows.push([`    ${label}`, value]);
  }
  
  if (eq.currentProfit !== 0) {
    const label = eq.currentProfit >= 0 ? '590 - Dönem Net Karı' : '591 - Dönem Net Zararı (-)';
    const value = eq.currentProfit >= 0 
      ? formatAmount(eq.currentProfit) 
      : `(${formatAmount(Math.abs(eq.currentProfit))})`;
    rows.push([`    ${label}`, value]);
  }
  
  rows.push(['  ÖZKAYNAKLAR TOPLAMI', formatAmount(eq.total)]);

  // PASİF TOPLAMI
  rows.push(['PASİF TOPLAMI', formatAmount(data.totalLiabilities)]);

  return rows;
}

/**
 * Özet bilanço satırları (kısa versiyon)
 */
export function buildSummaryBalanceRows(
  data: BalanceSheet,
  formatAmount: (value: number) => string
): { assets: string[][]; liabilities: string[][] } {
  const assets: string[][] = [
    ['Dönen Varlıklar', formatAmount(data.currentAssets.total)],
    ['Duran Varlıklar', formatAmount(data.fixedAssets.total)],
    ['AKTİF TOPLAMI', formatAmount(data.totalAssets)],
  ];

  const liabilities: string[][] = [
    ['Kısa Vadeli Yabancı Kaynaklar', formatAmount(data.shortTermLiabilities.total)],
    ['Uzun Vadeli Yabancı Kaynaklar', formatAmount(data.longTermLiabilities.total)],
    ['Özkaynaklar', formatAmount(data.equity.total)],
    ['PASİF TOPLAMI', formatAmount(data.totalLiabilities)],
  ];

  return { assets, liabilities };
}
