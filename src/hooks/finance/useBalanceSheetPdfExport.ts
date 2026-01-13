import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BalanceSheet } from '@/types/finance';
import { normalizeTurkishText } from '@/lib/fonts/roboto';

const formatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Türkçe metni normalize eden yardımcı fonksiyon
const tr = (text: string): string => normalizeTurkishText(text);

export interface BalanceSheetPdfOptions {
  currency?: 'TRY' | 'USD';
  formatAmount?: (n: number) => string;
  yearlyAverageRate?: number | null;
}

export function useBalanceSheetPdfExport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBalanceSheetPdf = useCallback(async (
    balanceSheet: BalanceSheet,
    year: number,
    detailed: boolean = false,
    options?: BalanceSheetPdfOptions
  ) => {
    setIsGenerating(true);
    
    const { currency = 'TRY', formatAmount, yearlyAverageRate } = options || {};
    
    // Use provided format function or default
    const fmt = formatAmount || formatCurrency;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // ===== COVER PAGE =====
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      const title = currency === 'USD' ? tr('BİLANÇO (USD)') : tr('BİLANÇO');
      doc.text(title, pageWidth / 2, 60, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(`31.12.${year} Tarihli`, pageWidth / 2, 80, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(tr(`Hazırlanma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), pageWidth / 2, 100, { align: 'center' });
      
      // Currency info for USD
      if (currency === 'USD' && yearlyAverageRate) {
        doc.text(tr(`Para Birimi: USD (Yıllık Ort. Kur: ${yearlyAverageRate.toFixed(2)} TL/USD)`), pageWidth / 2, 112, { align: 'center' });
      }
      
      // Balance check info
      const yPos = currency === 'USD' && yearlyAverageRate ? 128 : 120;
      const balanceStatus = balanceSheet.isBalanced 
        ? tr('Denklik Durumu: Aktif = Pasif ✓')
        : tr(`Denklik Farkı: ${fmt(balanceSheet.difference)}`);
      doc.text(balanceStatus, pageWidth / 2, yPos, { align: 'center' });
      
      // ===== BALANCE SHEET PAGE =====
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const pageTitle = currency === 'USD' 
        ? tr(`31.12.${year} TARİHLİ BİLANÇO (USD)`)
        : tr(`31.12.${year} TARİHLİ BİLANÇO`);
      doc.text(pageTitle, pageWidth / 2, 15, { align: 'center' });
      
      if (detailed) {
        // ===== DETAILED BALANCE SHEET =====
        generateDetailedPdf(doc, balanceSheet, year, pageWidth, fmt, currency);
      } else {
        // ===== SUMMARY BALANCE SHEET =====
        generateSummaryPdf(doc, balanceSheet, pageWidth, fmt);
      }
      
      // Save
      const currencySuffix = currency === 'USD' ? '_USD' : '';
      const fileName = detailed 
        ? `Bilanco_${year}_Ayrintili${currencySuffix}.pdf` 
        : `Bilanco_${year}_Ozet${currencySuffix}.pdf`;
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

function generateSummaryPdf(
  doc: jsPDF, 
  balanceSheet: BalanceSheet, 
  pageWidth: number,
  fmt: (n: number) => string
) {
  // AKTİF (VARLIKLAR) Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('AKTİF (VARLIKLAR)'), 14, 25);
  
  const aktivData: (string | number)[][] = [
    [tr('I - DÖNEN VARLIKLAR'), ''],
    [tr('   A - Hazır Değerler'), fmt(balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks)],
    [tr('      1 - Kasa'), fmt(balanceSheet.currentAssets.cash)],
    [tr('      3 - Bankalar'), fmt(balanceSheet.currentAssets.banks)],
    [tr('   C - Ticari Alacaklar'), fmt(balanceSheet.currentAssets.receivables)],
    [tr('      1 - Alıcılar'), fmt(balanceSheet.currentAssets.receivables)],
  ];
  
  if (balanceSheet.currentAssets.partnerReceivables > 0) {
    aktivData.push([tr('   D - Diğer Alacaklar'), fmt(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push([tr('      1 - Ortaklardan Alacaklar'), fmt(balanceSheet.currentAssets.partnerReceivables)]);
  }
  
  const otherVat = (balanceSheet.currentAssets as any).otherVat || 0;
  aktivData.push([tr('   H - Diğer Dönen Varlıklar'), fmt(balanceSheet.currentAssets.vatReceivable + otherVat)]);
  aktivData.push([tr('      2 - İndirilecek KDV'), fmt(balanceSheet.currentAssets.vatReceivable)]);
  if (otherVat > 0) {
    aktivData.push([tr('      3 - Diğer KDV'), fmt(otherVat)]);
  }
  
  aktivData.push([tr('DÖNEN VARLIKLAR TOPLAMI'), fmt(balanceSheet.currentAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('II - DURAN VARLIKLAR'), '']);
  aktivData.push([tr('   D - Maddi Duran Varlıklar'), fmt(balanceSheet.fixedAssets.total)]);
  aktivData.push([tr('      5 - Taşıtlar'), fmt(balanceSheet.fixedAssets.vehicles)]);
  aktivData.push([tr('      6 - Demirbaşlar'), fmt(balanceSheet.fixedAssets.equipment)]);
  aktivData.push([tr('      8 - Birikmiş Amortismanlar (-)'), `(${fmt(balanceSheet.fixedAssets.depreciation)})`]);
  aktivData.push([tr('DURAN VARLIKLAR TOPLAMI'), fmt(balanceSheet.fixedAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('AKTİF (VARLIKLAR) TOPLAMI'), fmt(balanceSheet.totalAssets)]);
  
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
    pasifData.push([tr('   A - Mali Borçlar'), fmt(balanceSheet.shortTermLiabilities.loanInstallments)]);
    pasifData.push([tr('      1 - Banka Kredileri'), fmt(balanceSheet.shortTermLiabilities.loanInstallments)]);
  }
  
  pasifData.push([tr('   B - Ticari Borçlar'), fmt(balanceSheet.shortTermLiabilities.payables)]);
  pasifData.push([tr('      1 - Satıcılar'), fmt(balanceSheet.shortTermLiabilities.payables)]);
  
  const personnelPayables = (balanceSheet.shortTermLiabilities as any).personnelPayables || 0;
  if (balanceSheet.shortTermLiabilities.partnerPayables > 0 || personnelPayables > 0) {
    pasifData.push([tr('   C - Diğer Borçlar'), fmt(balanceSheet.shortTermLiabilities.partnerPayables + personnelPayables)]);
    if (balanceSheet.shortTermLiabilities.partnerPayables > 0) {
      pasifData.push([tr('      1 - Ortaklara Borçlar'), fmt(balanceSheet.shortTermLiabilities.partnerPayables)]);
    }
    if (personnelPayables > 0) {
      pasifData.push([tr('      4 - Personele Borçlar'), fmt(personnelPayables)]);
    }
  }
  
  const taxPayables = (balanceSheet.shortTermLiabilities as any).taxPayables || 0;
  const socialSecurityPayables = (balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0;
  if (taxPayables > 0 || socialSecurityPayables > 0) {
    pasifData.push([tr('   F - Ödenecek Vergi ve Diğer Yük.'), fmt(taxPayables + socialSecurityPayables)]);
    if (taxPayables > 0) {
      pasifData.push([tr('      1 - Ödenecek Vergi ve Fonlar'), fmt(taxPayables)]);
    }
    if (socialSecurityPayables > 0) {
      pasifData.push([tr('      2 - Ödenecek SGK Kesintileri'), fmt(socialSecurityPayables)]);
    }
  }
  
  if (balanceSheet.shortTermLiabilities.vatPayable > 0) {
    pasifData.push([tr('   I - Diğer Kısa Vadeli Yab. Kay.'), fmt(balanceSheet.shortTermLiabilities.vatPayable)]);
    pasifData.push([tr('      1 - Hesaplanan KDV'), fmt(balanceSheet.shortTermLiabilities.vatPayable)]);
  }
  
  pasifData.push([tr('KISA VADELİ YABANCI KAY. TOPLAMI'), fmt(balanceSheet.shortTermLiabilities.total)]);
  
  if (balanceSheet.longTermLiabilities.total > 0) {
    pasifData.push(['', '']);
    pasifData.push([tr('II - UZUN VADELİ YABANCI KAYNAKLAR'), '']);
    pasifData.push([tr('   A - Mali Borçlar'), fmt(balanceSheet.longTermLiabilities.bankLoans)]);
    pasifData.push([tr('      1 - Banka Kredileri'), fmt(balanceSheet.longTermLiabilities.bankLoans)]);
    pasifData.push([tr('UZUN VADELİ YABANCI KAY. TOPLAMI'), fmt(balanceSheet.longTermLiabilities.total)]);
  }
  
  pasifData.push(['', '']);
  pasifData.push([tr('III - ÖZKAYNAKLAR'), '']);
  
  const unpaidCapital = (balanceSheet.equity as any).unpaidCapital || 0;
  pasifData.push([tr('   A - Ödenmiş Sermaye'), fmt(balanceSheet.equity.paidCapital - unpaidCapital)]);
  pasifData.push([tr('      1 - Sermaye'), fmt(balanceSheet.equity.paidCapital)]);
  if (unpaidCapital > 0) {
    pasifData.push([tr('      2 - Ödenmemiş Sermaye (-)'), `(${fmt(unpaidCapital)})`]);
  }
  
  const legalReserves = (balanceSheet.equity as any).legalReserves || 0;
  if (legalReserves > 0) {
    pasifData.push([tr('   C - Kar Yedekleri'), fmt(legalReserves)]);
    pasifData.push([tr('      1 - Yasal Yedekler'), fmt(legalReserves)]);
  }
  
  if (balanceSheet.equity.retainedEarnings !== 0) {
    pasifData.push([tr('   D - Geçmiş Yıllar Karları'), fmt(balanceSheet.equity.retainedEarnings)]);
    pasifData.push([tr('      1 - Geçmiş Yıllar Karları'), fmt(balanceSheet.equity.retainedEarnings)]);
  }
  
  pasifData.push([tr('   F - Dönem Net Karı (Zararı)'), fmt(balanceSheet.equity.currentProfit)]);
  if (balanceSheet.equity.currentProfit >= 0) {
    pasifData.push([tr('      1 - Dönem Net Karı'), fmt(balanceSheet.equity.currentProfit)]);
  } else {
    pasifData.push([tr('      2 - Dönem Net Zararı (-)'), `(${fmt(Math.abs(balanceSheet.equity.currentProfit))})`]);
  }
  
  pasifData.push([tr('ÖZKAYNAKLAR TOPLAMI'), fmt(balanceSheet.equity.total)]);
  pasifData.push(['', '']);
  pasifData.push([tr('PASİF (KAYNAKLAR) TOPLAMI'), fmt(balanceSheet.totalLiabilities)]);
  
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

function generateDetailedPdf(
  doc: jsPDF, 
  balanceSheet: BalanceSheet, 
  year: number, 
  pageWidth: number,
  fmt: (n: number) => string,
  currency: 'TRY' | 'USD' = 'TRY'
) {
  // Ayrıntılı bilanço - hesap kodları ile
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('AKTİF (VARLIKLAR)'), 14, 25);
  
  const aktivData: (string | number)[][] = [
    [tr('I - DÖNEN VARLIKLAR'), ''],
    ['', ''],
    [tr('A - Hazır Değerler'), fmt(balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks)],
    [tr('   100 Kasa'), fmt(balanceSheet.currentAssets.cash)],
    [tr('   102 Bankalar'), fmt(balanceSheet.currentAssets.banks)],
    [tr('      102.01 Vadesiz Mevduat'), fmt(balanceSheet.currentAssets.banks)],
    [tr('      102.02 Vadeli Mevduat'), '0,00'],
    ['', ''],
    [tr('C - Ticari Alacaklar'), fmt(balanceSheet.currentAssets.receivables)],
    [tr('   120 Alıcılar'), fmt(balanceSheet.currentAssets.receivables)],
    [tr('      120.01 Yurtiçi Alıcılar'), fmt(balanceSheet.currentAssets.receivables)],
    [tr('      120.02 Yurtdışı Alıcılar'), '0,00'],
    [tr('   121 Alacak Senetleri'), '0,00'],
    [tr('   126 Verilen Depozito ve Teminatlar'), '0,00'],
    [tr('   127 Diğer Ticari Alacaklar'), '0,00'],
    ['', ''],
  ];
  
  if (balanceSheet.currentAssets.partnerReceivables > 0) {
    aktivData.push([tr('D - Diğer Alacaklar'), fmt(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push([tr('   131 Ortaklardan Alacaklar'), fmt(balanceSheet.currentAssets.partnerReceivables)]);
    aktivData.push(['', '']);
  }
  
  aktivData.push([tr('E - Stoklar'), '0,00']);
  aktivData.push([tr('   150 İlk Madde ve Malzeme'), '0,00']);
  aktivData.push([tr('   151 Yarı Mamuller'), '0,00']);
  aktivData.push([tr('   153 Ticari Mallar'), '0,00']);
  aktivData.push(['', '']);
  
  const otherVat = (balanceSheet.currentAssets as any).otherVat || 0;
  aktivData.push([tr('H - Diğer Dönen Varlıklar'), fmt(balanceSheet.currentAssets.vatReceivable + otherVat)]);
  aktivData.push([tr('   190 Devreden KDV'), '0,00']);
  aktivData.push([tr('   191 İndirilecek KDV'), fmt(balanceSheet.currentAssets.vatReceivable)]);
  aktivData.push([tr('   193 Diğer KDV'), fmt(otherVat)]);
  aktivData.push(['', '']);
  aktivData.push([tr('DÖNEN VARLIKLAR TOPLAMI'), fmt(balanceSheet.currentAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('II - DURAN VARLIKLAR'), '']);
  aktivData.push(['', '']);
  aktivData.push([tr('D - Maddi Duran Varlıklar'), fmt(balanceSheet.fixedAssets.total)]);
  aktivData.push([tr('   250 Arazi ve Arsalar'), '0,00']);
  aktivData.push([tr('   252 Binalar'), '0,00']);
  aktivData.push([tr('   253 Tesis, Makine ve Cihazlar'), '0,00']);
  aktivData.push([tr('   254 Taşıtlar'), fmt(balanceSheet.fixedAssets.vehicles)]);
  aktivData.push([tr('   255 Demirbaşlar'), fmt(balanceSheet.fixedAssets.equipment)]);
  aktivData.push([tr('   257 Birikmiş Amortismanlar (-)'), `(${fmt(balanceSheet.fixedAssets.depreciation)})`]);
  aktivData.push(['', '']);
  aktivData.push([tr('DURAN VARLIKLAR TOPLAMI'), fmt(balanceSheet.fixedAssets.total)]);
  aktivData.push(['', '']);
  aktivData.push([tr('AKTİF (VARLIKLAR) TOPLAMI'), fmt(balanceSheet.totalAssets)]);
  
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
  const continueTitle = currency === 'USD'
    ? tr(`31.12.${year} TARİHLİ BİLANÇO (USD) (Devam)`)
    : tr(`31.12.${year} TARİHLİ BİLANÇO (Devam)`);
  doc.text(continueTitle, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(tr('PASİF (KAYNAKLAR)'), 14, 25);
  
  const pasifData: (string | number)[][] = [
    [tr('I - KISA VADELİ YABANCI KAYNAKLAR'), ''],
    ['', ''],
    [tr('A - Mali Borçlar'), fmt(balanceSheet.shortTermLiabilities.loanInstallments)],
    [tr('   300 Banka Kredileri'), fmt(balanceSheet.shortTermLiabilities.loanInstallments)],
    ['', ''],
    [tr('B - Ticari Borçlar'), fmt(balanceSheet.shortTermLiabilities.payables)],
    [tr('   320 Satıcılar'), fmt(balanceSheet.shortTermLiabilities.payables)],
    [tr('      320.01 Yurtiçi Satıcılar'), fmt(balanceSheet.shortTermLiabilities.payables)],
    [tr('      320.02 Yurtdışı Satıcılar'), '0,00'],
    ['', ''],
  ];
  
  const personnelPayables = (balanceSheet.shortTermLiabilities as any).personnelPayables || 0;
  pasifData.push([tr('C - Diğer Borçlar'), fmt(balanceSheet.shortTermLiabilities.partnerPayables + personnelPayables)]);
  pasifData.push([tr('   331 Ortaklara Borçlar'), fmt(balanceSheet.shortTermLiabilities.partnerPayables)]);
  pasifData.push([tr('   335 Personele Borçlar'), fmt(personnelPayables)]);
  pasifData.push(['', '']);
  
  const taxPayables = (balanceSheet.shortTermLiabilities as any).taxPayables || 0;
  const socialSecurityPayables = (balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0;
  pasifData.push([tr('F - Ödenecek Vergi ve Diğer Yükümlülükler'), fmt(taxPayables + socialSecurityPayables)]);
  pasifData.push([tr('   360 Ödenecek Vergi ve Fonlar'), fmt(taxPayables)]);
  pasifData.push([tr('   361 Ödenecek Sosyal Güvenlik Kesintileri'), fmt(socialSecurityPayables)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('I - Diğer Kısa Vadeli Yabancı Kaynaklar'), fmt(balanceSheet.shortTermLiabilities.vatPayable)]);
  pasifData.push([tr('   391 Hesaplanan KDV'), fmt(balanceSheet.shortTermLiabilities.vatPayable)]);
  pasifData.push(['', '']);
  pasifData.push([tr('KISA VADELİ YABANCI KAYNAKLAR TOPLAMI'), fmt(balanceSheet.shortTermLiabilities.total)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('II - UZUN VADELİ YABANCI KAYNAKLAR'), '']);
  pasifData.push(['', '']);
  pasifData.push([tr('A - Mali Borçlar'), fmt(balanceSheet.longTermLiabilities.bankLoans)]);
  pasifData.push([tr('   400 Banka Kredileri'), fmt(balanceSheet.longTermLiabilities.bankLoans)]);
  pasifData.push(['', '']);
  pasifData.push([tr('E - Borç ve Gider Karşılıkları'), '0,00']);
  pasifData.push([tr('   472 Kıdem Tazminatı Karşılığı'), '0,00']);
  pasifData.push(['', '']);
  pasifData.push([tr('UZUN VADELİ YABANCI KAYNAKLAR TOPLAMI'), fmt(balanceSheet.longTermLiabilities.total)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('III - ÖZKAYNAKLAR'), '']);
  pasifData.push(['', '']);
  const unpaidCapital = (balanceSheet.equity as any).unpaidCapital || 0;
  pasifData.push([tr('A - Ödenmiş Sermaye'), fmt(balanceSheet.equity.paidCapital - unpaidCapital)]);
  pasifData.push([tr('   500 Sermaye'), fmt(balanceSheet.equity.paidCapital)]);
  if (unpaidCapital > 0) {
    pasifData.push([tr('   501 Ödenmemiş Sermaye (-)'), `(${fmt(unpaidCapital)})`]);
  }
  pasifData.push(['', '']);
  
  const legalReserves = (balanceSheet.equity as any).legalReserves || 0;
  pasifData.push([tr('C - Kar Yedekleri'), fmt(legalReserves)]);
  pasifData.push([tr('   540 Yasal Yedekler'), fmt(legalReserves)]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('D - Geçmiş Yıllar Karları'), fmt(balanceSheet.equity.retainedEarnings)]);
  pasifData.push([tr('   570 Geçmiş Yıllar Karları'), fmt(Math.max(0, balanceSheet.equity.retainedEarnings))]);
  pasifData.push([tr('   580 Geçmiş Yıllar Zararları (-)'), fmt(Math.min(0, balanceSheet.equity.retainedEarnings))]);
  pasifData.push(['', '']);
  
  pasifData.push([tr('F - Dönem Net Karı (Zararı)'), fmt(balanceSheet.equity.currentProfit)]);
  if (balanceSheet.equity.currentProfit >= 0) {
    pasifData.push([tr('   590 Dönem Net Karı'), fmt(balanceSheet.equity.currentProfit)]);
  } else {
    pasifData.push([tr('   591 Dönem Net Zararı (-)'), `(${fmt(Math.abs(balanceSheet.equity.currentProfit))})`]);
  }
  pasifData.push(['', '']);
  pasifData.push([tr('ÖZKAYNAKLAR TOPLAMI'), fmt(balanceSheet.equity.total)]);
  pasifData.push(['', '']);
  pasifData.push([tr('PASİF (KAYNAKLAR) TOPLAMI'), fmt(balanceSheet.totalLiabilities)]);
  
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
