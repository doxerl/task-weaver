// ============================================
// BİLANÇO BÖLÜM RENDERER
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BalanceSheet } from '@/types/finance';
import { tr, formatAmount, addSectionHeader } from '../pdfUtils';
import { PDF_COLORS, PDF_COLORS as COLORS } from '../pdfTypes';

// ============================================
// TEK SAYFA LANDSCAPE BİLANÇO (A4)
// ============================================

export function renderSinglePageBalanceSheet(
  doc: jsPDF,
  data: BalanceSheet,
  year: number,
  formatFn: (n: number) => string
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const halfWidth = pageWidth / 2;
  const margin = 10;
  
  // Başlık
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(tr(`31.12.${year} TARIHLI BILANCO`), pageWidth / 2, 13, { align: 'center' });
  
  // ==========================================
  // SOL YARI: AKTİF (VARLIKLAR)
  // ==========================================
  
  const aktivData: (string | number)[][] = [];
  
  // I - DÖNEN VARLIKLAR
  aktivData.push([tr('I - DONEN VARLIKLAR'), '']);
  aktivData.push([tr('   A - Hazir Degerler'), formatFn(data.currentAssets.cash + data.currentAssets.banks)]);
  aktivData.push([tr('      100 Kasa'), formatFn(data.currentAssets.cash)]);
  aktivData.push([tr('      102 Bankalar'), formatFn(data.currentAssets.banks)]);
  
  aktivData.push([tr('   C - Ticari Alacaklar'), formatFn(data.currentAssets.receivables)]);
  aktivData.push([tr('      120 Alicilar'), formatFn(data.currentAssets.receivables)]);
  
  if (data.currentAssets.partnerReceivables > 0) {
    aktivData.push([tr('   D - Diger Alacaklar'), formatFn(data.currentAssets.partnerReceivables)]);
    aktivData.push([tr('      131 Ortaklardan Alacaklar'), formatFn(data.currentAssets.partnerReceivables)]);
  }
  
  const otherVat = (data.currentAssets as any).otherVat || 0;
  const vatTotal = data.currentAssets.vatReceivable + otherVat;
  if (vatTotal > 0) {
    aktivData.push([tr('   H - Diger Donen Varliklar'), formatFn(vatTotal)]);
    aktivData.push([tr('      191 Indirilecek KDV'), formatFn(data.currentAssets.vatReceivable)]);
    if (otherVat > 0) {
      aktivData.push([tr('      193 Diger KDV'), formatFn(otherVat)]);
    }
  }
  
  aktivData.push([tr('DONEN VARLIKLAR TOPLAMI'), formatFn(data.currentAssets.total)]);
  aktivData.push(['', '']);
  
  // II - DURAN VARLIKLAR
  aktivData.push([tr('II - DURAN VARLIKLAR'), '']);
  aktivData.push([tr('   D - Maddi Duran Varliklar'), formatFn(data.fixedAssets.total + data.fixedAssets.depreciation)]);
  aktivData.push([tr('      254 Tasitlar'), formatFn(data.fixedAssets.vehicles)]);
  aktivData.push([tr('      255 Demirbaslar'), formatFn(data.fixedAssets.equipment)]);
  aktivData.push([tr('      257 Birikmis Amort. (-)'), `(${formatFn(data.fixedAssets.depreciation)})`]);
  aktivData.push([tr('DURAN VARLIKLAR TOPLAMI'), formatFn(data.fixedAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('AKTIF TOPLAMI'), formatFn(data.totalAssets)]);
  
  autoTable(doc, {
    startY: 25,
    tableWidth: halfWidth - margin - 3,
    margin: { left: margin },
    head: [[tr('AKTIF (VARLIKLAR)'), tr('Tutar')]],
    body: aktivData,
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 0.8 },
    headStyles: { 
      fillColor: [34, 197, 94], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8 
    },
    columnStyles: {
      0: { cellWidth: halfWidth - margin - 35 },
      1: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (cellData) => {
      const rowText = String(aktivData[cellData.row.index]?.[0] || '');
      if (rowText.includes('TOPLAMI') || rowText.startsWith('I -') || rowText.startsWith('II -')) {
        cellData.cell.styles.fontStyle = 'bold';
      }
      if (rowText.includes('AKTIF TOPLAMI')) {
        cellData.cell.styles.fillColor = [240, 255, 240];
      }
    },
  });
  
  // ==========================================
  // SAĞ YARI: PASİF (KAYNAKLAR)
  // ==========================================
  
  const pasifData: (string | number)[][] = [];
  
  // I - KISA VADELİ YABANCI KAYNAKLAR
  pasifData.push([tr('I - KISA VADELI YAB. KAYN.'), '']);
  
  if (data.shortTermLiabilities.loanInstallments > 0) {
    pasifData.push([tr('   A - Mali Borclar'), formatFn(data.shortTermLiabilities.loanInstallments)]);
    pasifData.push([tr('      300 Banka Kredileri'), formatFn(data.shortTermLiabilities.loanInstallments)]);
  }
  
  pasifData.push([tr('   B - Ticari Borclar'), formatFn(data.shortTermLiabilities.payables)]);
  pasifData.push([tr('      320 Saticilar'), formatFn(data.shortTermLiabilities.payables)]);
  
  const personnelPayables = (data.shortTermLiabilities as any).personnelPayables || 0;
  if (data.shortTermLiabilities.partnerPayables > 0 || personnelPayables > 0) {
    pasifData.push([tr('   C - Diger Borclar'), formatFn(data.shortTermLiabilities.partnerPayables + personnelPayables)]);
    if (data.shortTermLiabilities.partnerPayables > 0) {
      pasifData.push([tr('      331 Ortaklara Borclar'), formatFn(data.shortTermLiabilities.partnerPayables)]);
    }
    if (personnelPayables > 0) {
      pasifData.push([tr('      335 Personele Borclar'), formatFn(personnelPayables)]);
    }
  }
  
  const taxPayables = (data.shortTermLiabilities as any).taxPayables || 0;
  const socialSecurityPayables = (data.shortTermLiabilities as any).socialSecurityPayables || 0;
  if (taxPayables > 0 || socialSecurityPayables > 0) {
    pasifData.push([tr('   F - Odenecek Vergi ve Diger'), formatFn(taxPayables + socialSecurityPayables)]);
    if (taxPayables > 0) {
      pasifData.push([tr('      360 Odenecek Vergi'), formatFn(taxPayables)]);
    }
    if (socialSecurityPayables > 0) {
      pasifData.push([tr('      361 Odenecek SGK'), formatFn(socialSecurityPayables)]);
    }
  }
  
  if (data.shortTermLiabilities.vatPayable > 0) {
    pasifData.push([tr('   I - Diger Kisa Vad. Yab. Kay.'), formatFn(data.shortTermLiabilities.vatPayable)]);
    pasifData.push([tr('      391 Hesaplanan KDV'), formatFn(data.shortTermLiabilities.vatPayable)]);
  }
  
  pasifData.push([tr('KVYK TOPLAMI'), formatFn(data.shortTermLiabilities.total)]);
  
  // II - UZUN VADELİ YABANCI KAYNAKLAR
  if (data.longTermLiabilities.total > 0) {
    pasifData.push(['', '']);
    pasifData.push([tr('II - UZUN VADELI YAB. KAYN.'), '']);
    pasifData.push([tr('   A - Mali Borclar'), formatFn(data.longTermLiabilities.bankLoans)]);
    pasifData.push([tr('      400 Banka Kredileri'), formatFn(data.longTermLiabilities.bankLoans)]);
    pasifData.push([tr('UVYK TOPLAMI'), formatFn(data.longTermLiabilities.total)]);
  }
  
  // III - ÖZKAYNAKLAR
  pasifData.push(['', '']);
  pasifData.push([tr('III - OZKAYNAKLAR'), '']);
  
  const unpaidCapital = (data.equity as any).unpaidCapital || 0;
  pasifData.push([tr('   A - Odenmis Sermaye'), formatFn(data.equity.paidCapital - unpaidCapital)]);
  pasifData.push([tr('      500 Sermaye'), formatFn(data.equity.paidCapital)]);
  if (unpaidCapital > 0) {
    pasifData.push([tr('      501 Odenmemis Sermaye (-)'), `(${formatFn(unpaidCapital)})`]);
  }
  
  if (data.equity.retainedEarnings !== 0) {
    pasifData.push([tr('   D - Gecmis Yillar Karlari'), formatFn(data.equity.retainedEarnings)]);
    pasifData.push([tr('      570 Gecmis Yillar Karlari'), formatFn(data.equity.retainedEarnings)]);
  }
  
  pasifData.push([tr('   F - Donem Net Kari'), formatFn(data.equity.currentProfit)]);
  if (data.equity.currentProfit >= 0) {
    pasifData.push([tr('      590 Donem Net Kari'), formatFn(data.equity.currentProfit)]);
  } else {
    pasifData.push([tr('      591 Donem Net Zarari (-)'), `(${formatFn(Math.abs(data.equity.currentProfit))})`]);
  }
  
  pasifData.push([tr('OZKAYNAKLAR TOPLAMI'), formatFn(data.equity.total)]);
  pasifData.push(['', '']);
  pasifData.push([tr('PASIF TOPLAMI'), formatFn(data.totalLiabilities)]);
  
  autoTable(doc, {
    startY: 25,
    tableWidth: halfWidth - margin - 3,
    margin: { left: halfWidth + 3 },
    head: [[tr('PASIF (KAYNAKLAR)'), tr('Tutar')]],
    body: pasifData,
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 0.8 },
    headStyles: { 
      fillColor: [239, 68, 68], 
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8 
    },
    columnStyles: {
      0: { cellWidth: halfWidth - margin - 35 },
      1: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (cellData) => {
      const rowText = String(pasifData[cellData.row.index]?.[0] || '');
      if (rowText.includes('TOPLAMI') || rowText.startsWith('I -') || rowText.startsWith('II -') || rowText.startsWith('III -')) {
        cellData.cell.styles.fontStyle = 'bold';
      }
      if (rowText.includes('PASIF TOPLAMI')) {
        cellData.cell.styles.fillColor = [255, 240, 240];
      }
    },
  });
  
  // ==========================================
  // ALT BİLGİ: DENKLİK DURUMU
  // ==========================================
  
  const footerY = pageHeight - 15;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  if (data.isBalanced) {
    doc.setTextColor(34, 197, 94);
    doc.text(tr('Bilanco Denk'), margin, footerY);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text(tr(`Denklik Farki: ${formatFn(data.difference)}`), margin, footerY);
  }
  
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'normal');
  doc.text(
    tr(`Hazirlanma: ${new Date().toLocaleDateString('tr-TR')}`),
    pageWidth - margin,
    footerY,
    { align: 'right' }
  );
}

// ============================================
// ÇOK SAYFA DETAYLI BİLANÇO
// ============================================

export function renderDetailedBalanceSheet(
  doc: jsPDF,
  data: BalanceSheet,
  year: number,
  formatFn: (n: number) => string,
  currency: 'TRY' | 'USD' = 'TRY'
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Sayfa 1: AKTİF
  addSectionHeader(doc, tr(`31.12.${year} BILANCO - AKTIF`), COLORS.success);
  
  // Aktif tablosu - detaylı
  const aktivData = buildDetailedAktifData(data, formatFn);
  
  autoTable(doc, {
    startY: 30,
    head: [[tr('Hesap Kodu'), tr('Hesap Adi'), tr('Tutar')]],
    body: aktivData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 110 },
      2: { cellWidth: 45, halign: 'right' },
    },
    didParseCell: (cellData) => {
      const row = aktivData[cellData.row.index];
      if (row && String(row[1]).includes('TOPLAMI')) {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [240, 255, 240];
      }
    },
  });
  
  // Sayfa 2: PASİF
  doc.addPage();
  addSectionHeader(doc, tr(`31.12.${year} BILANCO - PASIF`), COLORS.danger);
  
  const pasifData = buildDetailedPasifData(data, formatFn);
  
  autoTable(doc, {
    startY: 30,
    head: [[tr('Hesap Kodu'), tr('Hesap Adi'), tr('Tutar')]],
    body: pasifData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 110 },
      2: { cellWidth: 45, halign: 'right' },
    },
    didParseCell: (cellData) => {
      const row = pasifData[cellData.row.index];
      if (row && String(row[1]).includes('TOPLAMI')) {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [255, 240, 240];
      }
    },
  });
}

// Helper: Build detailed aktif data
function buildDetailedAktifData(data: BalanceSheet, fmt: (n: number) => string): (string | number)[][] {
  const rows: (string | number)[][] = [];
  
  rows.push(['', tr('I - DONEN VARLIKLAR'), '']);
  rows.push(['100', tr('Kasa'), fmt(data.currentAssets.cash)]);
  rows.push(['102', tr('Bankalar'), fmt(data.currentAssets.banks)]);
  rows.push(['120', tr('Alicilar'), fmt(data.currentAssets.receivables)]);
  
  if (data.currentAssets.partnerReceivables > 0) {
    rows.push(['131', tr('Ortaklardan Alacaklar'), fmt(data.currentAssets.partnerReceivables)]);
  }
  
  rows.push(['191', tr('Indirilecek KDV'), fmt(data.currentAssets.vatReceivable)]);
  rows.push(['', tr('DONEN VARLIKLAR TOPLAMI'), fmt(data.currentAssets.total)]);
  
  rows.push(['', '', '']);
  rows.push(['', tr('II - DURAN VARLIKLAR'), '']);
  rows.push(['254', tr('Tasitlar'), fmt(data.fixedAssets.vehicles)]);
  rows.push(['255', tr('Demirbaslar'), fmt(data.fixedAssets.equipment)]);
  rows.push(['257', tr('Birikmis Amortismanlar (-)'), `(${fmt(data.fixedAssets.depreciation)})`]);
  rows.push(['', tr('DURAN VARLIKLAR TOPLAMI'), fmt(data.fixedAssets.total)]);
  
  rows.push(['', '', '']);
  rows.push(['', tr('AKTIF TOPLAMI'), fmt(data.totalAssets)]);
  
  return rows;
}

// Helper: Build detailed pasif data
function buildDetailedPasifData(data: BalanceSheet, fmt: (n: number) => string): (string | number)[][] {
  const rows: (string | number)[][] = [];
  
  rows.push(['', tr('I - KISA VADELI YABANCI KAYNAKLAR'), '']);
  
  if (data.shortTermLiabilities.loanInstallments > 0) {
    rows.push(['300', tr('Banka Kredileri'), fmt(data.shortTermLiabilities.loanInstallments)]);
  }
  rows.push(['320', tr('Saticilar'), fmt(data.shortTermLiabilities.payables)]);
  rows.push(['331', tr('Ortaklara Borclar'), fmt(data.shortTermLiabilities.partnerPayables)]);
  
  const personnelPayables = (data.shortTermLiabilities as any).personnelPayables || 0;
  if (personnelPayables > 0) {
    rows.push(['335', tr('Personele Borclar'), fmt(personnelPayables)]);
  }
  
  const taxPayables = (data.shortTermLiabilities as any).taxPayables || 0;
  if (taxPayables > 0) {
    rows.push(['360', tr('Odenecek Vergi ve Fonlar'), fmt(taxPayables)]);
  }
  
  const socialSecurityPayables = (data.shortTermLiabilities as any).socialSecurityPayables || 0;
  if (socialSecurityPayables > 0) {
    rows.push(['361', tr('Odenecek SGK Kesintileri'), fmt(socialSecurityPayables)]);
  }
  
  if (data.shortTermLiabilities.vatPayable > 0) {
    rows.push(['391', tr('Hesaplanan KDV'), fmt(data.shortTermLiabilities.vatPayable)]);
  }
  
  rows.push(['', tr('KVYK TOPLAMI'), fmt(data.shortTermLiabilities.total)]);
  
  if (data.longTermLiabilities.total > 0) {
    rows.push(['', '', '']);
    rows.push(['', tr('II - UZUN VADELI YABANCI KAYNAKLAR'), '']);
    rows.push(['400', tr('Banka Kredileri'), fmt(data.longTermLiabilities.bankLoans)]);
    rows.push(['', tr('UVYK TOPLAMI'), fmt(data.longTermLiabilities.total)]);
  }
  
  rows.push(['', '', '']);
  rows.push(['', tr('III - OZKAYNAKLAR'), '']);
  rows.push(['500', tr('Sermaye'), fmt(data.equity.paidCapital)]);
  
  const unpaidCapital = (data.equity as any).unpaidCapital || 0;
  if (unpaidCapital > 0) {
    rows.push(['501', tr('Odenmemis Sermaye (-)'), `(${fmt(unpaidCapital)})`]);
  }
  
  if (data.equity.retainedEarnings !== 0) {
    rows.push(['570', tr('Gecmis Yillar Karlari'), fmt(data.equity.retainedEarnings)]);
  }
  
  if (data.equity.currentProfit >= 0) {
    rows.push(['590', tr('Donem Net Kari'), fmt(data.equity.currentProfit)]);
  } else {
    rows.push(['591', tr('Donem Net Zarari (-)'), `(${fmt(Math.abs(data.equity.currentProfit))})`]);
  }
  
  rows.push(['', tr('OZKAYNAKLAR TOPLAMI'), fmt(data.equity.total)]);
  rows.push(['', '', '']);
  rows.push(['', tr('PASIF TOPLAMI'), fmt(data.totalLiabilities)]);
  
  return rows;
}
