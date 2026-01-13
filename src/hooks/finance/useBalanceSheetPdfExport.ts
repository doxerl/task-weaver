import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BalanceSheet } from '@/types/finance';

const formatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function useBalanceSheetPdfExport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBalanceSheetPdf = useCallback(async (
    balanceSheet: BalanceSheet,
    year: number,
    detailed: boolean = false
  ) => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // ===== COVER PAGE =====
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('BİLANÇO', pageWidth / 2, 60, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(`31.12.${year} Tarihli`, pageWidth / 2, 80, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Hazırlanma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 100, { align: 'center' });
      
      // Balance check info
      const balanceStatus = balanceSheet.isBalanced 
        ? 'Denklik Durumu: Aktif = Pasif ✓'
        : `Denklik Farkı: ₺${formatCurrency(balanceSheet.difference)}`;
      doc.text(balanceStatus, pageWidth / 2, 120, { align: 'center' });
      
      // ===== BALANCE SHEET PAGE =====
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`31.12.${year} TARİHLİ BİLANÇO`, pageWidth / 2, 15, { align: 'center' });
      
      if (detailed) {
        // ===== DETAILED BALANCE SHEET =====
        generateDetailedPdf(doc, balanceSheet, year, pageWidth);
      } else {
        // ===== SUMMARY BALANCE SHEET =====
        generateSummaryPdf(doc, balanceSheet, pageWidth);
      }
      
      // Save
      const fileName = detailed 
        ? `Bilanco_${year}_Ayrintili.pdf` 
        : `Bilanco_${year}_Ozet.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Balance sheet PDF generation error:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateBalanceSheetPdf, isGenerating };
}

function generateSummaryPdf(doc: jsPDF, balanceSheet: BalanceSheet, pageWidth: number) {
  // AKTİF (VARLIKLAR) Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AKTİF (VARLIKLAR)', 14, 25);
  
  const aktivData: (string | number)[][] = [
    ['I - DÖNEN VARLIKLAR', ''],
    ['   A - Hazır Değerler', formatCurrency(balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks)],
    ['      1 - Kasa', formatCurrency(balanceSheet.currentAssets.cash)],
    ['      3 - Bankalar', formatCurrency(balanceSheet.currentAssets.banks)],
    ['   C - Ticari Alacaklar', formatCurrency(balanceSheet.currentAssets.receivables)],
    ['      1 - Alıcılar', formatCurrency(balanceSheet.currentAssets.receivables)],
  ];
  
  if (balanceSheet.currentAssets.partnerReceivables > 0) {
    aktivData.push(['   D - Diğer Alacaklar', formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push(['      1 - Ortaklardan Alacaklar', formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
  }
  
  const otherVat = (balanceSheet.currentAssets as any).otherVat || 0;
  aktivData.push(['   H - Diğer Dönen Varlıklar', formatCurrency(balanceSheet.currentAssets.vatReceivable + otherVat)]);
  aktivData.push(['      2 - İndirilecek KDV', formatCurrency(balanceSheet.currentAssets.vatReceivable)]);
  if (otherVat > 0) {
    aktivData.push(['      3 - Diğer KDV', formatCurrency(otherVat)]);
  }
  
  aktivData.push(['DÖNEN VARLIKLAR TOPLAMI', formatCurrency(balanceSheet.currentAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push(['II - DURAN VARLIKLAR', '']);
  aktivData.push(['   D - Maddi Duran Varlıklar', formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push(['      5 - Taşıtlar', formatCurrency(balanceSheet.fixedAssets.vehicles)]);
  aktivData.push(['      6 - Demirbaşlar', formatCurrency(balanceSheet.fixedAssets.equipment)]);
  aktivData.push(['      8 - Birikmiş Amortismanlar (-)', `(${formatCurrency(balanceSheet.fixedAssets.depreciation)})`]);
  aktivData.push(['DURAN VARLIKLAR TOPLAMI', formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push(['AKTİF (VARLIKLAR) TOPLAMI', formatCurrency(balanceSheet.totalAssets)]);
  
  autoTable(doc, {
    startY: 30,
    body: aktivData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      const rowText = String(aktivData[data.row.index]?.[0] || '');
      if (rowText.includes('TOPLAMI')) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (rowText.startsWith('I -') || rowText.startsWith('II -')) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  
  // PASİF (KAYNAKLAR) Table
  const pasifStartY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PASİF (KAYNAKLAR)', 14, pasifStartY);
  
  const pasifData: (string | number)[][] = [
    ['I - KISA VADELİ YABANCI KAYNAKLAR', ''],
  ];
  
  if (balanceSheet.shortTermLiabilities.loanInstallments > 0) {
    pasifData.push(['   A - Mali Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)]);
    pasifData.push(['      1 - Banka Kredileri', formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)]);
  }
  
  pasifData.push(['   B - Ticari Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.payables)]);
  pasifData.push(['      1 - Satıcılar', formatCurrency(balanceSheet.shortTermLiabilities.payables)]);
  
  const personnelPayables = (balanceSheet.shortTermLiabilities as any).personnelPayables || 0;
  if (balanceSheet.shortTermLiabilities.partnerPayables > 0 || personnelPayables > 0) {
    pasifData.push(['   C - Diğer Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables + personnelPayables)]);
    if (balanceSheet.shortTermLiabilities.partnerPayables > 0) {
      pasifData.push(['      1 - Ortaklara Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables)]);
    }
    if (personnelPayables > 0) {
      pasifData.push(['      4 - Personele Borçlar', formatCurrency(personnelPayables)]);
    }
  }
  
  const taxPayables = (balanceSheet.shortTermLiabilities as any).taxPayables || 0;
  const socialSecurityPayables = (balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0;
  if (taxPayables > 0 || socialSecurityPayables > 0) {
    pasifData.push(['   F - Ödenecek Vergi ve Diğer Yük.', formatCurrency(taxPayables + socialSecurityPayables)]);
    if (taxPayables > 0) {
      pasifData.push(['      1 - Ödenecek Vergi ve Fonlar', formatCurrency(taxPayables)]);
    }
    if (socialSecurityPayables > 0) {
      pasifData.push(['      2 - Ödenecek SGK Kesintileri', formatCurrency(socialSecurityPayables)]);
    }
  }
  
  if (balanceSheet.shortTermLiabilities.vatPayable > 0) {
    pasifData.push(['   I - Diğer Kısa Vadeli Yab. Kay.', formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
    pasifData.push(['      1 - Hesaplanan KDV', formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
  }
  
  pasifData.push(['KISA VADELİ YABANCI KAY. TOPLAMI', formatCurrency(balanceSheet.shortTermLiabilities.total)]);
  
  if (balanceSheet.longTermLiabilities.total > 0) {
    pasifData.push(['', '']);
    pasifData.push(['II - UZUN VADELİ YABANCI KAYNAKLAR', '']);
    pasifData.push(['   A - Mali Borçlar', formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
    pasifData.push(['      1 - Banka Kredileri', formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
    pasifData.push(['UZUN VADELİ YABANCI KAY. TOPLAMI', formatCurrency(balanceSheet.longTermLiabilities.total)]);
  }
  
  pasifData.push(['', '']);
  pasifData.push(['III - ÖZKAYNAKLAR', '']);
  
  const unpaidCapital = (balanceSheet.equity as any).unpaidCapital || 0;
  pasifData.push(['   A - Ödenmiş Sermaye', formatCurrency(balanceSheet.equity.paidCapital - unpaidCapital)]);
  pasifData.push(['      1 - Sermaye', formatCurrency(balanceSheet.equity.paidCapital)]);
  if (unpaidCapital > 0) {
    pasifData.push(['      2 - Ödenmemiş Sermaye (-)', `(${formatCurrency(unpaidCapital)})`]);
  }
  
  const legalReserves = (balanceSheet.equity as any).legalReserves || 0;
  if (legalReserves > 0) {
    pasifData.push(['   C - Kar Yedekleri', formatCurrency(legalReserves)]);
    pasifData.push(['      1 - Yasal Yedekler', formatCurrency(legalReserves)]);
  }
  
  if (balanceSheet.equity.retainedEarnings !== 0) {
    pasifData.push(['   D - Geçmiş Yıllar Karları', formatCurrency(balanceSheet.equity.retainedEarnings)]);
    pasifData.push(['      1 - Geçmiş Yıllar Karları', formatCurrency(balanceSheet.equity.retainedEarnings)]);
  }
  
  pasifData.push(['   F - Dönem Net Karı (Zararı)', formatCurrency(balanceSheet.equity.currentProfit)]);
  if (balanceSheet.equity.currentProfit >= 0) {
    pasifData.push(['      1 - Dönem Net Karı', formatCurrency(balanceSheet.equity.currentProfit)]);
  } else {
    pasifData.push(['      2 - Dönem Net Zararı (-)', `(${formatCurrency(Math.abs(balanceSheet.equity.currentProfit))})`]);
  }
  
  pasifData.push(['ÖZKAYNAKLAR TOPLAMI', formatCurrency(balanceSheet.equity.total)]);
  pasifData.push(['', '']);
  pasifData.push(['PASİF (KAYNAKLAR) TOPLAMI', formatCurrency(balanceSheet.totalLiabilities)]);
  
  autoTable(doc, {
    startY: pasifStartY + 5,
    body: pasifData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      const rowText = String(pasifData[data.row.index]?.[0] || '');
      if (rowText.includes('TOPLAMI')) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (rowText.startsWith('I -') || rowText.startsWith('II -') || rowText.startsWith('III -')) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
}

function generateDetailedPdf(doc: jsPDF, balanceSheet: BalanceSheet, year: number, pageWidth: number) {
  // Ayrıntılı bilanço - hesap kodları ile
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('AKTİF (VARLIKLAR)', 14, 25);
  
  const aktivData: (string | number)[][] = [
    ['I - DÖNEN VARLIKLAR', ''],
    ['', ''],
    ['A - Hazır Değerler', formatCurrency(balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks)],
    ['   100 Kasa', formatCurrency(balanceSheet.currentAssets.cash)],
    ['   102 Bankalar', formatCurrency(balanceSheet.currentAssets.banks)],
    ['      102.01 Vadesiz Mevduat', formatCurrency(balanceSheet.currentAssets.banks)],
    ['      102.02 Vadeli Mevduat', '0,00'],
    ['', ''],
    ['C - Ticari Alacaklar', formatCurrency(balanceSheet.currentAssets.receivables)],
    ['   120 Alıcılar', formatCurrency(balanceSheet.currentAssets.receivables)],
    ['      120.01 Yurtiçi Alıcılar', formatCurrency(balanceSheet.currentAssets.receivables)],
    ['      120.02 Yurtdışı Alıcılar', '0,00'],
    ['   121 Alacak Senetleri', '0,00'],
    ['   126 Verilen Depozito ve Teminatlar', '0,00'],
    ['   127 Diğer Ticari Alacaklar', '0,00'],
    ['', ''],
  ];
  
  if (balanceSheet.currentAssets.partnerReceivables > 0) {
    aktivData.push(['D - Diğer Alacaklar', formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push(['   131 Ortaklardan Alacaklar', formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push(['', '']);
  }
  
  aktivData.push(['E - Stoklar', '0,00']);
  aktivData.push(['   150 İlk Madde ve Malzeme', '0,00']);
  aktivData.push(['   151 Yarı Mamuller', '0,00']);
  aktivData.push(['   153 Ticari Mallar', '0,00']);
  aktivData.push(['', '']);
  
  const otherVat = (balanceSheet.currentAssets as any).otherVat || 0;
  aktivData.push(['H - Diğer Dönen Varlıklar', formatCurrency(balanceSheet.currentAssets.vatReceivable + otherVat)]);
  aktivData.push(['   190 Devreden KDV', '0,00']);
  aktivData.push(['   191 İndirilecek KDV', formatCurrency(balanceSheet.currentAssets.vatReceivable)]);
  aktivData.push(['   193 Diğer KDV', formatCurrency(otherVat)]);
  aktivData.push(['', '']);
  aktivData.push(['DÖNEN VARLIKLAR TOPLAMI', formatCurrency(balanceSheet.currentAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push(['II - DURAN VARLIKLAR', '']);
  aktivData.push(['', '']);
  aktivData.push(['D - Maddi Duran Varlıklar', formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push(['   250 Arazi ve Arsalar', '0,00']);
  aktivData.push(['   252 Binalar', '0,00']);
  aktivData.push(['   253 Tesis, Makine ve Cihazlar', '0,00']);
  aktivData.push(['   254 Taşıtlar', formatCurrency(balanceSheet.fixedAssets.vehicles)]);
  aktivData.push(['   255 Demirbaşlar', formatCurrency(balanceSheet.fixedAssets.equipment)]);
  aktivData.push(['   257 Birikmiş Amortismanlar (-)', `(${formatCurrency(balanceSheet.fixedAssets.depreciation)})`]);
  aktivData.push(['', '']);
  aktivData.push(['DURAN VARLIKLAR TOPLAMI', formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push(['AKTİF (VARLIKLAR) TOPLAMI', formatCurrency(balanceSheet.totalAssets)]);
  
  autoTable(doc, {
    startY: 30,
    body: aktivData,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 0.5 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      const rowText = String(aktivData[data.row.index]?.[0] || '');
      if (rowText.includes('TOPLAMI') || rowText.startsWith('I -') || rowText.startsWith('II -')) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (rowText.match(/^[A-H] - /)) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  
  // New page for PASİF
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`31.12.${year} TARİHLİ BİLANÇO (Devam)`, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('PASİF (KAYNAKLAR)', 14, 25);
  
  const pasifData: (string | number)[][] = [
    ['I - KISA VADELİ YABANCI KAYNAKLAR', ''],
    ['', ''],
    ['A - Mali Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)],
    ['   300 Banka Kredileri', formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)],
    ['', ''],
    ['B - Ticari Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.payables)],
    ['   320 Satıcılar', formatCurrency(balanceSheet.shortTermLiabilities.payables)],
    ['      320.01 Yurtiçi Satıcılar', formatCurrency(balanceSheet.shortTermLiabilities.payables)],
    ['      320.02 Yurtdışı Satıcılar', '0,00'],
    ['', ''],
  ];
  
  const personnelPayables = (balanceSheet.shortTermLiabilities as any).personnelPayables || 0;
  pasifData.push(['C - Diğer Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables + personnelPayables)]);
  pasifData.push(['   331 Ortaklara Borçlar', formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables)]);
  pasifData.push(['   335 Personele Borçlar', formatCurrency(personnelPayables)]);
  pasifData.push(['', '']);
  
  const taxPayables = (balanceSheet.shortTermLiabilities as any).taxPayables || 0;
  const socialSecurityPayables = (balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0;
  pasifData.push(['F - Ödenecek Vergi ve Diğer Yükümlülükler', formatCurrency(taxPayables + socialSecurityPayables)]);
  pasifData.push(['   360 Ödenecek Vergi ve Fonlar', formatCurrency(taxPayables)]);
  pasifData.push(['   361 Ödenecek Sosyal Güvenlik Kesintileri', formatCurrency(socialSecurityPayables)]);
  pasifData.push(['', '']);
  
  pasifData.push(['I - Diğer Kısa Vadeli Yabancı Kaynaklar', formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
  pasifData.push(['   391 Hesaplanan KDV', formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
  pasifData.push(['', '']);
  pasifData.push(['KISA VADELİ YABANCI KAYNAKLAR TOPLAMI', formatCurrency(balanceSheet.shortTermLiabilities.total)]);
  pasifData.push(['', '']);
  
  pasifData.push(['II - UZUN VADELİ YABANCI KAYNAKLAR', '']);
  pasifData.push(['', '']);
  pasifData.push(['A - Mali Borçlar', formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
  pasifData.push(['   400 Banka Kredileri', formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
  pasifData.push(['', '']);
  pasifData.push(['E - Borç ve Gider Karşılıkları', '0,00']);
  pasifData.push(['   472 Kıdem Tazminatı Karşılığı', '0,00']);
  pasifData.push(['', '']);
  pasifData.push(['UZUN VADELİ YABANCI KAYNAKLAR TOPLAMI', formatCurrency(balanceSheet.longTermLiabilities.total)]);
  pasifData.push(['', '']);
  
  pasifData.push(['III - ÖZKAYNAKLAR', '']);
  pasifData.push(['', '']);
  const unpaidCapital = (balanceSheet.equity as any).unpaidCapital || 0;
  pasifData.push(['A - Ödenmiş Sermaye', formatCurrency(balanceSheet.equity.paidCapital - unpaidCapital)]);
  pasifData.push(['   500 Sermaye', formatCurrency(balanceSheet.equity.paidCapital)]);
  pasifData.push(['   501 Ödenmemiş Sermaye (-)', `(${formatCurrency(unpaidCapital)})`]);
  pasifData.push(['', '']);
  
  const legalReserves = (balanceSheet.equity as any).legalReserves || 0;
  pasifData.push(['C - Kar Yedekleri', formatCurrency(legalReserves)]);
  pasifData.push(['   540 Yasal Yedekler', formatCurrency(legalReserves)]);
  pasifData.push(['   541 Statü Yedekleri', '0,00']);
  pasifData.push(['   542 Olağanüstü Yedekler', '0,00']);
  pasifData.push(['', '']);
  
  pasifData.push(['D - Geçmiş Yıllar Karları', formatCurrency(balanceSheet.equity.retainedEarnings)]);
  pasifData.push(['   570 Geçmiş Yıllar Karları', formatCurrency(balanceSheet.equity.retainedEarnings)]);
  pasifData.push(['', '']);
  
  pasifData.push(['F - Dönem Net Karı (Zararı)', formatCurrency(balanceSheet.equity.currentProfit)]);
  if (balanceSheet.equity.currentProfit >= 0) {
    pasifData.push(['   590 Dönem Net Karı', formatCurrency(balanceSheet.equity.currentProfit)]);
  } else {
    pasifData.push(['   591 Dönem Net Zararı (-)', `(${formatCurrency(Math.abs(balanceSheet.equity.currentProfit))})`]);
  }
  pasifData.push(['', '']);
  pasifData.push(['ÖZKAYNAKLAR TOPLAMI', formatCurrency(balanceSheet.equity.total)]);
  pasifData.push(['', '']);
  pasifData.push(['PASİF (KAYNAKLAR) TOPLAMI', formatCurrency(balanceSheet.totalLiabilities)]);
  
  autoTable(doc, {
    startY: 30,
    body: pasifData,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 0.5 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      const rowText = String(pasifData[data.row.index]?.[0] || '');
      if (rowText.includes('TOPLAMI') || rowText.startsWith('I -') || rowText.startsWith('II -') || rowText.startsWith('III -')) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (rowText.match(/^[A-I] - /)) {
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
}
