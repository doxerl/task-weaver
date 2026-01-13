import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FullReportData, MONTH_NAMES_SHORT_TR } from '@/types/reports';

export interface PdfExportOptions {
  currency?: 'TRY' | 'USD';
  formatAmount?: (amount: number) => string;
  yearlyAverageRate?: number | null;
}

const defaultFormatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export function usePdfExport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = useCallback(async (data: FullReportData, options?: PdfExportOptions) => {
    setIsGenerating(true);
    
    const { currency = 'TRY', formatAmount, yearlyAverageRate } = options || {};
    const fmt = formatAmount || defaultFormatCurrency;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // ===== PAGE 1: Cover =====
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      const titleSuffix = currency === 'USD' ? ' (USD)' : '';
      doc.text(`FINANSAL RAPOR${titleSuffix}`, pageWidth / 2, 60, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      const periodText = data.period === 'yearly' ? 'Yillik' : data.period;
      doc.text(`${data.year} ${periodText} Donem`, pageWidth / 2, 80, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Hazirlanma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 100, { align: 'center' });
      
      // Currency info for USD
      if (currency === 'USD' && yearlyAverageRate) {
        doc.setFontSize(10);
        doc.text(`Para Birimi: USD (Yillik Ort. Kur: ${yearlyAverageRate.toFixed(2)} TL)`, pageWidth / 2, 115, { align: 'center' });
      }
      
      // ===== PAGE 2: Executive Summary =====
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('YONETICI OZETI', 14, 20);
      
      // KPI Table
      const kpiData = [
        ['Toplam Gelir', fmt(data.kpis.totalIncome.value), `${data.kpis.totalIncome.changePercent?.toFixed(1) || 0}%`],
        ['Toplam Gider', fmt(data.kpis.totalExpenses.value), `${data.kpis.totalExpenses.changePercent?.toFixed(1) || 0}%`],
        ['Net Kar', fmt(data.kpis.netProfit.value), `${data.kpis.netProfit.changePercent?.toFixed(1) || 0}%`],
        ['Kar Marji', `%${data.kpis.profitMargin.value.toFixed(1)}`, '-'],
      ];
      
      autoTable(doc, {
        startY: 30,
        head: [['Metrik', 'Değer', 'Değişim']],
        body: kpiData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 60, halign: 'right' },
          2: { cellWidth: 40, halign: 'center' },
        },
      });
      
      // Monthly Trend Table
      const monthlyTableData = data.monthlyData.map(m => [
        m.monthName,
        fmt(m.income),
        fmt(m.expense),
        fmt(m.net),
      ]);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Ay', 'Gelir', 'Gider', 'Net']],
        body: monthlyTableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      });
      
      // ===== PAGE 3-4: Income Statement =====
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('GELIR-GIDER TABLOSU', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Donem: 01.01.${data.year} - 31.12.${data.year}`, 14, 28);
      
      const is = data.incomeStatement;
      const statementData = [
        ['A. BRUT SATISLAR', '', '', true],
        ['   1. SBT Tracker Geliri', fmt(is.grossSales.sbt), '', false],
        ['   2. Leadership & Sustainability', fmt(is.grossSales.ls), '', false],
        ['   3. ZDHC InCheck', fmt(is.grossSales.zdhc), '', false],
        ['   4. Danismanlik', fmt(is.grossSales.danis), '', false],
        ['   5. Diger Gelirler', fmt(is.grossSales.diger), '', false],
        ['   BRUT SATISLAR TOPLAMI', fmt(is.grossSales.total), '', true],
        ['', '', '', false],
        ['B. SATIS INDIRIMLERI (-)', fmt(is.salesReturns), '', false],
        ['   NET SATISLAR', fmt(is.netSales), '', true],
        ['', '', '', false],
        ['C. SATISLARIN MALIYETI (-)', fmt(is.costOfSales), '', false],
        ['   BRUT KAR', fmt(is.grossProfit), '', true],
        ['', '', '', false],
        ['D. FAALIYET GIDERLERI (-)', '', '', true],
        ['   1. Personel Giderleri', fmt(is.operatingExpenses.personel), '', false],
        ['   2. Kira Giderleri', fmt(is.operatingExpenses.kira), '', false],
        ['   3. Ulasim Giderleri', fmt(is.operatingExpenses.ulasim), '', false],
        ['   4. Telekomunikasyon', fmt(is.operatingExpenses.telekom), '', false],
        ['   5. Sigorta Giderleri', fmt(is.operatingExpenses.sigorta), '', false],
        ['   6. Ofis & Malzeme', fmt(is.operatingExpenses.ofis), '', false],
        ['   7. Muhasebe & Hukuk', fmt(is.operatingExpenses.muhasebe), '', false],
        ['   8. Yazilim & Abonelik', fmt(is.operatingExpenses.yazilim), '', false],
        ['   9. Banka Masraflari', fmt(is.operatingExpenses.banka), '', false],
        ['  10. Diger Giderler', fmt(is.operatingExpenses.diger), '', false],
        ['   FAALIYET GIDERLERI TOPLAMI', fmt(is.operatingExpenses.total), '', true],
        ['', '', '', false],
        ['   FAALIYET KARI (EBIT)', fmt(is.operatingProfit), '', true],
        ['', '', '', false],
        ['E. DIGER FAALIYET GELIRLERI (+)', fmt(is.otherIncome.total), '', false],
        ['F. DIGER FAALIYET GIDERLERI (-)', fmt(is.otherExpenses.total), '', false],
        ['', '', '', false],
        ['   VERGI ONCESI KAR', fmt(is.preTaxProfit), '', true],
        ['', '', '', false],
        ['G. VERGI GIDERI (-) (%25)', fmt(is.taxExpense), '', false],
        ['', '', '', false],
        ['   DONEM NET KARI', fmt(is.netProfit), '', true],
        ['', '', '', false],
        ['   Kar Marji', `%${is.profitMargin.toFixed(1)}`, '', false],
        ['   EBIT Marji', `%${is.ebitMargin.toFixed(1)}`, '', false],
      ];
      
      autoTable(doc, {
        startY: 35,
        body: statementData.map(row => [row[0], row[1]]),
        theme: 'plain',
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 50, halign: 'right' },
        },
        didParseCell: (data) => {
          const row = statementData[data.row.index];
          if (row && row[3]) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      
      // ===== PAGE 5: Service Revenue =====
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('HIZMET BAZLI GELIR DAGILIMI', 14, 20);
      
      const serviceData = data.serviceRevenue.map(s => [
        s.name,
        fmt(s.amount),
        `%${s.percentage.toFixed(1)}`,
      ]);
      
      autoTable(doc, {
        startY: 30,
        head: [['Hizmet', 'Tutar', 'Oran']],
        body: serviceData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'center' },
        },
      });
      
      // ===== PAGE 6: Expense Categories =====
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('GIDER KATEGORILERI DAGILIMI', 14, 20);
      
      const expenseData = data.expenseCategories.slice(0, 15).map(e => [
        e.name,
        fmt(e.amount),
        `%${e.percentage.toFixed(1)}`,
        e.isFixed ? 'Sabit' : 'Degisken',
      ]);
      
      autoTable(doc, {
        startY: 30,
        head: [['Kategori', 'Tutar', 'Oran', 'Tip']],
        body: expenseData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'center' },
          3: { halign: 'center' },
        },
      });
      
      // ===== PAGE 7: Partner & Financing =====
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('ORTAK & FINANSMAN', 14, 20);
      
      // Partner Account Summary
      doc.setFontSize(14);
      doc.text('Ortak Cari Hesabi', 14, 35);
      
      autoTable(doc, {
        startY: 40,
        body: [
          ['Toplam Borc (Ortaga)', fmt(data.partnerAccount.totalDebit)],
          ['Toplam Alacak (Ortaktan)', fmt(data.partnerAccount.totalCredit)],
          ['Net Bakiye', fmt(data.partnerAccount.balance)],
        ],
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right' },
        },
      });
      
      // Financing Summary
      doc.setFontSize(14);
      doc.text('Finansman Durumu', 14, (doc as any).lastAutoTable.finalY + 20);
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 25,
        body: [
          ['Kredi Kullanimi', fmt(data.financing.creditUsed)],
          ['Kredi Odemesi', fmt(data.financing.creditPaid)],
          ['Leasing Odemesi', fmt(data.financing.leasingPaid)],
          ['Faiz Odemesi', fmt(data.financing.interestPaid)],
          ['Kalan Borc (Tahmini)', fmt(data.financing.remainingDebt)],
        ],
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right' },
        },
      });
      
      // Save
      const currencySuffix = currency === 'USD' ? '_USD' : '';
      const fileName = `Finansal_Rapor_${data.year}_${data.period}${currencySuffix}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generatePdf, isGenerating };
}
