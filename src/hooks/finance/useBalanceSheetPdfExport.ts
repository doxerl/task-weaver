import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BalanceSheet } from '@/types/finance';
import { normalizeTurkishText } from '@/lib/fonts/roboto';

const formatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Türkçe metni normalize eden yardımcı fonksiyon
const tr = (text: string): string => normalizeTurkishText(text);

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
      doc.text(tr('BİLANÇO'), pageWidth / 2, 60, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(`31.12.${year} Tarihli`, pageWidth / 2, 80, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(tr(`Hazırlanma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), pageWidth / 2, 100, { align: 'center' });
      
      // Balance check info
      const balanceStatus = balanceSheet.isBalanced 
        ? tr('Denklik Durumu: Aktif = Pasif ✓')
        : tr(`Denklik Farkı: ₺${formatCurrency(balanceSheet.difference)}`);
      doc.text(balanceStatus, pageWidth / 2, 120, { align: 'center' });
      
      // ===== BALANCE SHEET PAGE =====
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(tr(`31.12.${year} TARİHLİ BİLANÇO`), pageWidth / 2, 15, { align: 'center' });
      
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
  doc.text(tr('AKTİF (VARLIKLAR)'), 14, 25);
  
  const aktivData: (string | number)[][] = [
    [tr('I - DÖNEN VARLIKLAR'), ''],
    [tr('   A - Hazır Değerler'), formatCurrency(balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks)],
    [tr('      1 - Kasa'), formatCurrency(balanceSheet.currentAssets.cash)],
    [tr('      3 - Bankalar'), formatCurrency(balanceSheet.currentAssets.banks)],
    [tr('   C - Ticari Alacaklar'), formatCurrency(balanceSheet.currentAssets.receivables)],
    [tr('      1 - Alıcılar'), formatCurrency(balanceSheet.currentAssets.receivables)],
  ];
  
  if (balanceSheet.currentAssets.partnerReceivables > 0) {
    aktivData.push([tr('   D - Diğer Alacaklar'), formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push([tr('      1 - Ortaklardan Alacaklar'), formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
  }
  
  const otherVat = (balanceSheet.currentAssets as any).otherVat || 0;
  aktivData.push([tr('   H - Diğer Dönen Varlıklar'), formatCurrency(balanceSheet.currentAssets.vatReceivable + otherVat)]);
  aktivData.push([tr('      2 - İndirilecek KDV'), formatCurrency(balanceSheet.currentAssets.vatReceivable)]);
  if (otherVat > 0) {
    aktivData.push([tr('      3 - Diğer KDV'), formatCurrency(otherVat)]);
  }
  
  aktivData.push([tr('DÖNEN VARLIKLAR TOPLAMI'), formatCurrency(balanceSheet.currentAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('II - DURAN VARLIKLAR'), '']);
  aktivData.push([tr('   D - Maddi Duran Varlıklar'), formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push([tr('      5 - Taşıtlar'), formatCurrency(balanceSheet.fixedAssets.vehicles)]);
  aktivData.push([tr('      6 - Demirbaşlar'), formatCurrency(balanceSheet.fixedAssets.equipment)]);
  aktivData.push([tr('      8 - Birikmiş Amortismanlar (-)'), `(${formatCurrency(balanceSheet.fixedAssets.depreciation)})`]);
  aktivData.push([tr('DURAN VARLIKLAR TOPLAMI'), formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('AKTİF (VARLIKLAR) TOPLAMI'), formatCurrency(balanceSheet.totalAssets)]);
  
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
  doc.text(tr('PASİF (KAYNAKLAR)'), 14, pasifStartY);
  
  const pasifData: (string | number)[][] = [
    [tr('I - KISA VADELİ YABANCI KAYNAKLAR'), ''],
  ];
  
  if (balanceSheet.shortTermLiabilities.loanInstallments > 0) {
    pasifData.push([tr('   A - Mali Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)]);
    pasifData.push([tr('      1 - Banka Kredileri'), formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)]);
  }
  
  pasifData.push([tr('   B - Ticari Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.payables)]);
  pasifData.push([tr('      1 - Satıcılar'), formatCurrency(balanceSheet.shortTermLiabilities.payables)]);
  
  const personnelPayables = (balanceSheet.shortTermLiabilities as any).personnelPayables || 0;
  if (balanceSheet.shortTermLiabilities.partnerPayables > 0 || personnelPayables > 0) {
    pasifData.push([tr('   C - Diğer Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables + personnelPayables)]);
    if (balanceSheet.shortTermLiabilities.partnerPayables > 0) {
      pasifData.push([tr('      1 - Ortaklara Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables)]);
    }
    if (personnelPayables > 0) {
      pasifData.push([tr('      4 - Personele Borçlar'), formatCurrency(personnelPayables)]);
    }
  }
  
  const taxPayables = (balanceSheet.shortTermLiabilities as any).taxPayables || 0;
  const socialSecurityPayables = (balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0;
  if (taxPayables > 0 || socialSecurityPayables > 0) {
    pasifData.push([tr('   F - Ödenecek Vergi ve Diğer Yük.'), formatCurrency(taxPayables + socialSecurityPayables)]);
    if (taxPayables > 0) {
      pasifData.push([tr('      1 - Ödenecek Vergi ve Fonlar'), formatCurrency(taxPayables)]);
    }
    if (socialSecurityPayables > 0) {
      pasifData.push([tr('      2 - Ödenecek SGK Kesintileri'), formatCurrency(socialSecurityPayables)]);
    }
  }
  
  if (balanceSheet.shortTermLiabilities.vatPayable > 0) {
    pasifData.push([tr('   I - Diğer Kısa Vadeli Yab. Kay.'), formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
    pasifData.push([tr('      1 - Hesaplanan KDV'), formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
  }
  
  pasifData.push([tr('KISA VADELİ YABANCI KAY. TOPLAMI'), formatCurrency(balanceSheet.shortTermLiabilities.total)]);
  
  if (balanceSheet.longTermLiabilities.total > 0) {
    pasifData.push(['', '']);
    pasifData.push([tr('II - UZUN VADELİ YABANCI KAYNAKLAR'), '']);
    pasifData.push([tr('   A - Mali Borçlar'), formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
    pasifData.push([tr('      1 - Banka Kredileri'), formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
    pasifData.push([tr('UZUN VADELİ YABANCI KAY. TOPLAMI'), formatCurrency(balanceSheet.longTermLiabilities.total)]);
  }
  
  pasifData.push(['', '']);
  pasifData.push([tr('III - ÖZKAYNAKLAR'), '']);
  
  const unpaidCapital = (balanceSheet.equity as any).unpaidCapital || 0;
  pasifData.push([tr('   A - Ödenmiş Sermaye'), formatCurrency(balanceSheet.equity.paidCapital - unpaidCapital)]);
  pasifData.push([tr('      1 - Sermaye'), formatCurrency(balanceSheet.equity.paidCapital)]);
  if (unpaidCapital > 0) {
    pasifData.push([tr('      2 - Ödenmemiş Sermaye (-)'), `(${formatCurrency(unpaidCapital)})`]);
  }
  
  const legalReserves = (balanceSheet.equity as any).legalReserves || 0;
  if (legalReserves > 0) {
    pasifData.push([tr('   C - Kar Yedekleri'), formatCurrency(legalReserves)]);
    pasifData.push([tr('      1 - Yasal Yedekler'), formatCurrency(legalReserves)]);
  }
  
  if (balanceSheet.equity.retainedEarnings !== 0) {
    pasifData.push([tr('   D - Geçmiş Yıllar Karları'), formatCurrency(balanceSheet.equity.retainedEarnings)]);
    pasifData.push([tr('      1 - Geçmiş Yıllar Karları'), formatCurrency(balanceSheet.equity.retainedEarnings)]);
  }
  
  pasifData.push([tr('   F - Dönem Net Karı (Zararı)'), formatCurrency(balanceSheet.equity.currentProfit)]);
  if (balanceSheet.equity.currentProfit >= 0) {
    pasifData.push([tr('      1 - Dönem Net Karı'), formatCurrency(balanceSheet.equity.currentProfit)]);
  } else {
    pasifData.push([tr('      2 - Dönem Net Zararı (-)'), `(${formatCurrency(Math.abs(balanceSheet.equity.currentProfit))})`]);
  }
  
  pasifData.push([tr('ÖZKAYNAKLAR TOPLAMI'), formatCurrency(balanceSheet.equity.total)]);
  pasifData.push(['', '']);
  pasifData.push([tr('PASİF (KAYNAKLAR) TOPLAMI'), formatCurrency(balanceSheet.totalLiabilities)]);
  
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
  doc.text(tr('AKTİF (VARLIKLAR)'), 14, 25);
  
  const aktivData: (string | number)[][] = [
    [tr('I - DÖNEN VARLIKLAR'), ''],
    ['', ''],
    [tr('A - Hazır Değerler'), formatCurrency(balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks)],
    [tr('   100 Kasa'), formatCurrency(balanceSheet.currentAssets.cash)],
    [tr('   102 Bankalar'), formatCurrency(balanceSheet.currentAssets.banks)],
    [tr('      102.01 Vadesiz Mevduat'), formatCurrency(balanceSheet.currentAssets.banks)],
    [tr('      102.02 Vadeli Mevduat'), '0,00'],
    ['', ''],
    [tr('C - Ticari Alacaklar'), formatCurrency(balanceSheet.currentAssets.receivables)],
    [tr('   120 Alıcılar'), formatCurrency(balanceSheet.currentAssets.receivables)],
    [tr('      120.01 Yurtiçi Alıcılar'), formatCurrency(balanceSheet.currentAssets.receivables)],
    [tr('      120.02 Yurtdışı Alıcılar'), '0,00'],
    [tr('   121 Alacak Senetleri'), '0,00'],
    [tr('   126 Verilen Depozito ve Teminatlar'), '0,00'],
    [tr('   127 Diğer Ticari Alacaklar'), '0,00'],
    ['', ''],
  ];
  
  if (balanceSheet.currentAssets.partnerReceivables > 0) {
    aktivData.push([tr('D - Diğer Alacaklar'), formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push([tr('   131 Ortaklardan Alacaklar'), formatCurrency(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push(['', '']);
  }
  
  aktivData.push([tr('E - Stoklar'), '0,00']);
  aktivData.push([tr('   150 İlk Madde ve Malzeme'), '0,00']);
  aktivData.push([tr('   151 Yarı Mamuller'), '0,00']);
  aktivData.push([tr('   153 Ticari Mallar'), '0,00']);
  aktivData.push(['', '']);
  
  const otherVat = (balanceSheet.currentAssets as any).otherVat || 0;
  aktivData.push([tr('H - Diğer Dönen Varlıklar'), formatCurrency(balanceSheet.currentAssets.vatReceivable + otherVat)]);
  aktivData.push([tr('   190 Devreden KDV'), '0,00']);
  aktivData.push([tr('   191 İndirilecek KDV'), formatCurrency(balanceSheet.currentAssets.vatReceivable)]);
  aktivData.push([tr('   193 Diğer KDV'), formatCurrency(otherVat)]);
  aktivData.push(['', '']);
  aktivData.push([tr('DÖNEN VARLIKLAR TOPLAMI'), formatCurrency(balanceSheet.currentAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('II - DURAN VARLIKLAR'), '']);
  aktivData.push(['', '']);
  aktivData.push([tr('D - Maddi Duran Varlıklar'), formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push([tr('   250 Arazi ve Arsalar'), '0,00']);
  aktivData.push([tr('   252 Binalar'), '0,00']);
  aktivData.push([tr('   253 Tesis, Makine ve Cihazlar'), '0,00']);
  aktivData.push([tr('   254 Taşıtlar'), formatCurrency(balanceSheet.fixedAssets.vehicles)]);
  aktivData.push([tr('   255 Demirbaşlar'), formatCurrency(balanceSheet.fixedAssets.equipment)]);
  aktivData.push([tr('   257 Birikmiş Amortismanlar (-)'), `(${formatCurrency(balanceSheet.fixedAssets.depreciation)})`]);
  aktivData.push(['', '']);
  aktivData.push([tr('DURAN VARLIKLAR TOPLAMI'), formatCurrency(balanceSheet.fixedAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('AKTİF (VARLIKLAR) TOPLAMI'), formatCurrency(balanceSheet.totalAssets)]);
  
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
  doc.text(tr(`31.12.${year} TARİHLİ BİLANÇO (Devam)`), pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(tr('PASİF (KAYNAKLAR)'), 14, 25);
  
  const pasifData: (string | number)[][] = [
    [tr('I - KISA VADELİ YABANCI KAYNAKLAR'), ''],
    ['', ''],
    [tr('A - Mali Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)],
    [tr('   300 Banka Kredileri'), formatCurrency(balanceSheet.shortTermLiabilities.loanInstallments)],
    ['', ''],
    [tr('B - Ticari Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.payables)],
    [tr('   320 Satıcılar'), formatCurrency(balanceSheet.shortTermLiabilities.payables)],
    [tr('      320.01 Yurtiçi Satıcılar'), formatCurrency(balanceSheet.shortTermLiabilities.payables)],
    [tr('      320.02 Yurtdışı Satıcılar'), '0,00'],
    ['', ''],
  ];
  
  const personnelPayables = (balanceSheet.shortTermLiabilities as any).personnelPayables || 0;
  pasifData.push([tr('C - Diğer Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables + personnelPayables)]);
  pasifData.push([tr('   331 Ortaklara Borçlar'), formatCurrency(balanceSheet.shortTermLiabilities.partnerPayables)]);
  pasifData.push([tr('   335 Personele Borçlar'), formatCurrency(personnelPayables)]);
  pasifData.push(['', '']);
  
  const taxPayables = (balanceSheet.shortTermLiabilities as any).taxPayables || 0;
  const socialSecurityPayables = (balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0;
  pasifData.push([tr('F - Ödenecek Vergi ve Diğer Yükümlülükler'), formatCurrency(taxPayables + socialSecurityPayables)]);
  pasifData.push([tr('   360 Ödenecek Vergi ve Fonlar'), formatCurrency(taxPayables)]);
  pasifData.push([tr('   361 Ödenecek Sosyal Güvenlik Kesintileri'), formatCurrency(socialSecurityPayables)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('I - Diğer Kısa Vadeli Yabancı Kaynaklar'), formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
  pasifData.push([tr('   391 Hesaplanan KDV'), formatCurrency(balanceSheet.shortTermLiabilities.vatPayable)]);
  pasifData.push(['', '']);
  pasifData.push([tr('KISA VADELİ YABANCI KAYNAKLAR TOPLAMI'), formatCurrency(balanceSheet.shortTermLiabilities.total)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('II - UZUN VADELİ YABANCI KAYNAKLAR'), '']);
  pasifData.push(['', '']);
  pasifData.push([tr('A - Mali Borçlar'), formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
  pasifData.push([tr('   400 Banka Kredileri'), formatCurrency(balanceSheet.longTermLiabilities.bankLoans)]);
  pasifData.push(['', '']);
  pasifData.push([tr('E - Borç ve Gider Karşılıkları'), '0,00']);
  pasifData.push([tr('   472 Kıdem Tazminatı Karşılığı'), '0,00']);
  pasifData.push(['', '']);
  pasifData.push([tr('UZUN VADELİ YABANCI KAYNAKLAR TOPLAMI'), formatCurrency(balanceSheet.longTermLiabilities.total)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('III - ÖZKAYNAKLAR'), '']);
  pasifData.push(['', '']);
  const unpaidCapital = (balanceSheet.equity as any).unpaidCapital || 0;
  pasifData.push([tr('A - Ödenmiş Sermaye'), formatCurrency(balanceSheet.equity.paidCapital - unpaidCapital)]);
  pasifData.push([tr('   500 Sermaye'), formatCurrency(balanceSheet.equity.paidCapital)]);
  if (unpaidCapital > 0) {
    pasifData.push([tr('   501 Ödenmemiş Sermaye (-)'), `(${formatCurrency(unpaidCapital)})`]);
  }
  pasifData.push(['', '']);
  
  const legalReserves = (balanceSheet.equity as any).legalReserves || 0;
  pasifData.push([tr('C - Kar Yedekleri'), formatCurrency(legalReserves)]);
  pasifData.push([tr('   540 Yasal Yedekler'), formatCurrency(legalReserves)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('D - Geçmiş Yıllar Karları'), formatCurrency(balanceSheet.equity.retainedEarnings)]);
  pasifData.push([tr('   570 Geçmiş Yıllar Karları'), formatCurrency(Math.max(0, balanceSheet.equity.retainedEarnings))]);
  pasifData.push([tr('   580 Geçmiş Yıllar Zararları (-)'), formatCurrency(Math.min(0, balanceSheet.equity.retainedEarnings))]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('F - Dönem Net Karı (Zararı)'), formatCurrency(balanceSheet.equity.currentProfit)]);
  if (balanceSheet.equity.currentProfit >= 0) {
    pasifData.push([tr('   590 Dönem Net Karı'), formatCurrency(balanceSheet.equity.currentProfit)]);
  } else {
    pasifData.push([tr('   591 Dönem Net Zararı (-)'), `(${formatCurrency(Math.abs(balanceSheet.equity.currentProfit))})`]);
  }
  pasifData.push(['', '']);
  pasifData.push([tr('ÖZKAYNAKLAR TOPLAMI'), formatCurrency(balanceSheet.equity.total)]);
  pasifData.push(['', '']);
  pasifData.push([tr('PASİF (KAYNAKLAR) TOPLAMI'), formatCurrency(balanceSheet.totalLiabilities)]);
  
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
