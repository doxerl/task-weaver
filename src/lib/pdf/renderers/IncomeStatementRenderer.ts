// ============================================
// INCOME STATEMENT RENDERER
// IncomeStatementData → jspdf-autotable rows
// Tekdüzen Hesap Planı formatında
// ============================================

import type { IncomeStatementData, DetailedIncomeStatementData, DetailedIncomeStatementLine } from '@/types/reports';

/**
 * Gelir tablosu satırları oluştur
 */
export function buildIncomeStatementRows(
  data: IncomeStatementData,
  formatAmount: (value: number) => string
): string[][] {
  const formatNegative = (value: number) => value > 0 ? `(${formatAmount(value)})` : formatAmount(0);

  return [
    // A - BRÜT SATIŞLAR
    ['A - BRÜT SATIŞLAR', formatAmount(data.grossSales.total)],
    ['    600 - Yurtiçi Satışlar', formatAmount(data.grossSales.yurtici)],
    ['    601 - Yurtdışı Satışlar', formatAmount(data.grossSales.yurtdisi)],
    ['    602 - Diğer Gelirler', formatAmount(data.grossSales.diger)],
    
    // B - SATIŞ İNDİRİMLERİ
    ['B - SATIŞ İNDİRİMLERİ (-)', formatNegative(data.salesReturns)],
    
    // C - NET SATIŞLAR
    ['C - NET SATIŞLAR', formatAmount(data.netSales)],
    
    // D - SATIŞLARIN MALİYETİ
    ['D - SATIŞLARIN MALİYETİ (-)', formatNegative(data.costOfSales)],
    
    // BRÜT SATIŞ KARI
    ['BRÜT SATIŞ KARI', formatAmount(data.grossProfit)],
    
    // E - FAALİYET GİDERLERİ
    ['E - FAALİYET GİDERLERİ (-)', formatNegative(data.operatingExpenses.total)],
    ['    631 - Pazarlama Satış Dağıtım Gid.', formatNegative(data.operatingExpenses.pazarlama)],
    ['    632 - Genel Yönetim Giderleri', formatNegative(data.operatingExpenses.genelYonetim)],
    
    // FAALİYET KARI
    ['FAALİYET KARI (EBIT)', formatAmount(data.operatingProfit)],
    
    // F - DİĞER FAALİYET GELİRLERİ
    ['F - DİĞER FAALİYET GELİRLERİ', formatAmount(data.otherIncome.total)],
    ['    642 - Faiz Gelirleri', formatAmount(data.otherIncome.faiz)],
    ['    646 - Kambiyo Karları', formatAmount(data.otherIncome.kurFarki)],
    ['    649 - Diğer Olağan Gelirler', formatAmount(data.otherIncome.diger)],
    
    // G - DİĞER FAALİYET GİDERLERİ
    ['G - DİĞER FAALİYET GİDERLERİ (-)', formatNegative(data.otherExpenses.total)],
    ['    653 - Komisyon Giderleri', formatNegative(data.otherExpenses.komisyon)],
    ['    656 - Kambiyo Zararları', formatNegative(data.otherExpenses.kurFarki)],
    ['    659 - Diğer Olağan Giderler', formatNegative(data.otherExpenses.diger)],
    
    // H - FİNANSMAN GİDERLERİ
    ['H - FİNANSMAN GİDERLERİ (-)', formatNegative(data.financeExpenses)],
    
    // OLAĞAN KAR
    ['OLAĞAN KAR', formatAmount(data.ordinaryProfit)],
    
    // I - OLAĞANDIŞI GELİRLER
    ['I - OLAĞANDIŞI GELİRLER', formatAmount(data.extraordinaryIncome)],
    
    // J - OLAĞANDIŞI GİDERLER
    ['J - OLAĞANDIŞI GİDERLER (-)', formatNegative(data.extraordinaryExpenses)],
    
    // DÖNEM KARI (VERGİ ÖNCESİ)
    ['DÖNEM KARI (VERGİ ÖNCESİ)', formatAmount(data.preTaxProfit)],
    
    // K - VERGİ KARŞILIĞI
    ['K - VERGİ KARŞILIĞI (-)', formatNegative(data.taxExpense)],
    
    // DÖNEM NET KARI
    ['DÖNEM NET KARI', formatAmount(data.netProfit)],
  ];
}

/**
 * Özet gelir tablosu satırları
 */
export function buildSummaryIncomeRows(
  data: IncomeStatementData,
  formatAmount: (value: number) => string
): string[][] {
  return [
    ['Net Satışlar', formatAmount(data.netSales)],
    ['Brüt Kar', formatAmount(data.grossProfit)],
    ['Faaliyet Karı (EBIT)', formatAmount(data.operatingProfit)],
    ['Olağan Kar', formatAmount(data.ordinaryProfit)],
    ['Dönem Net Karı', formatAmount(data.netProfit)],
  ];
}

/**
 * Kar oranları satırları
 */
export function buildMarginRows(
  data: IncomeStatementData,
  formatPercent: (value: number) => string = (v) => `%${(v * 100).toFixed(1)}`
): string[][] {
  return [
    ['Brüt Kar Marjı', formatPercent(data.grossMargin)],
    ['EBIT Marjı', formatPercent(data.ebitMargin)],
    ['Net Kar Marjı', formatPercent(data.profitMargin)],
  ];
}

/**
 * Detaylı gelir tablosu satırları (resmi format)
 */
export function buildDetailedIncomeRows(
  data: DetailedIncomeStatementData,
  formatAmount: (value: number) => string
): string[][] {
  const rows: string[][] = [];
  
  function processLine(line: DetailedIncomeStatementLine, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    const codePrefix = line.code ? `${line.code} - ` : '';
    const label = `${indent}${codePrefix}${line.name}`;
    
    let amount = '';
    if (line.totalAmount !== undefined) {
      amount = line.isNegative 
        ? `(${formatAmount(Math.abs(line.totalAmount))})` 
        : formatAmount(line.totalAmount);
    } else if (line.subAmount !== undefined) {
      amount = line.isNegative 
        ? `(${formatAmount(Math.abs(line.subAmount))})` 
        : formatAmount(line.subAmount);
    }
    
    rows.push([label, amount]);
    
    // Alt satırları işle
    if (line.children && line.children.length > 0) {
      for (const child of line.children) {
        processLine(child, depth + 1);
      }
    }
  }
  
  for (const line of data.lines) {
    processLine(line, 0);
  }
  
  return rows;
}

/**
 * Gider dağılımı satırları
 */
export function buildExpenseBreakdownRows(
  data: IncomeStatementData,
  formatAmount: (value: number) => string
): string[][] {
  const expenses = data.operatingExpenses;
  const rows: string[][] = [];
  
  // Legacy fields kullan (eğer varsa)
  if (expenses.personel > 0) {
    rows.push(['Personel Giderleri', formatAmount(expenses.personel)]);
  }
  if (expenses.kira > 0) {
    rows.push(['Kira Giderleri', formatAmount(expenses.kira)]);
  }
  if (expenses.ulasim > 0) {
    rows.push(['Ulaşım Giderleri', formatAmount(expenses.ulasim)]);
  }
  if (expenses.telekom > 0) {
    rows.push(['Telekom Giderleri', formatAmount(expenses.telekom)]);
  }
  if (expenses.sigorta > 0) {
    rows.push(['Sigorta Giderleri', formatAmount(expenses.sigorta)]);
  }
  if (expenses.ofis > 0) {
    rows.push(['Ofis Giderleri', formatAmount(expenses.ofis)]);
  }
  if (expenses.muhasebe > 0) {
    rows.push(['Muhasebe Giderleri', formatAmount(expenses.muhasebe)]);
  }
  if (expenses.yazilim > 0) {
    rows.push(['Yazılım Giderleri', formatAmount(expenses.yazilim)]);
  }
  if (expenses.banka > 0) {
    rows.push(['Banka Giderleri', formatAmount(expenses.banka)]);
  }
  if (expenses.diger > 0) {
    rows.push(['Diğer Giderler', formatAmount(expenses.diger)]);
  }
  
  rows.push(['TOPLAM', formatAmount(expenses.total)]);
  
  return rows;
}
