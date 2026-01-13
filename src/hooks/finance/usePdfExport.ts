import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FullReportData, MONTH_NAMES_SHORT_TR } from '@/types/reports';

const formatCurrency = (n: number) => 
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export function usePdfExport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = useCallback(async (data: FullReportData) => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // ===== PAGE 1: Cover =====
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('FİNANSAL RAPOR', pageWidth / 2, 60, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      const periodText = data.period === 'yearly' ? 'Yıllık' : data.period;
      doc.text(`${data.year} ${periodText} Dönem`, pageWidth / 2, 80, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Hazırlanma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 100, { align: 'center' });
      
      // ===== PAGE 2: Executive Summary =====
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('YÖNETİCİ ÖZETİ', 14, 20);
      
      // KPI Table
      const kpiData = [
        ['Toplam Gelir', formatCurrency(data.kpis.totalIncome.value), `${data.kpis.totalIncome.changePercent?.toFixed(1) || 0}%`],
        ['Toplam Gider', formatCurrency(data.kpis.totalExpenses.value), `${data.kpis.totalExpenses.changePercent?.toFixed(1) || 0}%`],
        ['Net Kâr', formatCurrency(data.kpis.netProfit.value), `${data.kpis.netProfit.changePercent?.toFixed(1) || 0}%`],
        ['Kâr Marjı', `%${data.kpis.profitMargin.value.toFixed(1)}`, '-'],
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
        formatCurrency(m.income),
        formatCurrency(m.expense),
        formatCurrency(m.net),
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
      doc.text('GELİR-GİDER TABLOSU', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dönem: 01.01.${data.year} - 31.12.${data.year}`, 14, 28);
      
      const is = data.incomeStatement;
      const statementData = [
        ['A. BRÜT SATIŞLAR', '', '', true],
        ['   1. SBT Tracker Geliri', formatCurrency(is.grossSales.sbt), '', false],
        ['   2. Leadership & Sustainability', formatCurrency(is.grossSales.ls), '', false],
        ['   3. ZDHC InCheck', formatCurrency(is.grossSales.zdhc), '', false],
        ['   4. Danışmanlık', formatCurrency(is.grossSales.danis), '', false],
        ['   5. Diğer Gelirler', formatCurrency(is.grossSales.diger), '', false],
        ['   BRÜT SATIŞLAR TOPLAMI', formatCurrency(is.grossSales.total), '', true],
        ['', '', '', false],
        ['B. SATIŞ İNDİRİMLERİ (-)', formatCurrency(is.salesReturns), '', false],
        ['   NET SATIŞLAR', formatCurrency(is.netSales), '', true],
        ['', '', '', false],
        ['C. SATIŞLARIN MALİYETİ (-)', formatCurrency(is.costOfSales), '', false],
        ['   BRÜT KÂR', formatCurrency(is.grossProfit), '', true],
        ['', '', '', false],
        ['D. FAALİYET GİDERLERİ (-)', '', '', true],
        ['   1. Personel Giderleri', formatCurrency(is.operatingExpenses.personel), '', false],
        ['   2. Kira Giderleri', formatCurrency(is.operatingExpenses.kira), '', false],
        ['   3. Ulaşım Giderleri', formatCurrency(is.operatingExpenses.ulasim), '', false],
        ['   4. Telekomünikasyon', formatCurrency(is.operatingExpenses.telekom), '', false],
        ['   5. Sigorta Giderleri', formatCurrency(is.operatingExpenses.sigorta), '', false],
        ['   6. Ofis & Malzeme', formatCurrency(is.operatingExpenses.ofis), '', false],
        ['   7. Muhasebe & Hukuk', formatCurrency(is.operatingExpenses.muhasebe), '', false],
        ['   8. Yazılım & Abonelik', formatCurrency(is.operatingExpenses.yazilim), '', false],
        ['   9. Banka Masrafları', formatCurrency(is.operatingExpenses.banka), '', false],
        ['  10. Diğer Giderler', formatCurrency(is.operatingExpenses.diger), '', false],
        ['   FAALİYET GİDERLERİ TOPLAMI', formatCurrency(is.operatingExpenses.total), '', true],
        ['', '', '', false],
        ['   FAALİYET KÂRI (EBIT)', formatCurrency(is.operatingProfit), '', true],
        ['', '', '', false],
        ['E. DİĞER FAALİYET GELİRLERİ (+)', formatCurrency(is.otherIncome.total), '', false],
        ['F. DİĞER FAALİYET GİDERLERİ (-)', formatCurrency(is.otherExpenses.total), '', false],
        ['', '', '', false],
        ['   VERGİ ÖNCESİ KÂR', formatCurrency(is.preTaxProfit), '', true],
        ['', '', '', false],
        ['G. VERGİ GİDERİ (-) (%25)', formatCurrency(is.taxExpense), '', false],
        ['', '', '', false],
        ['   DÖNEM NET KÂRI', formatCurrency(is.netProfit), '', true],
        ['', '', '', false],
        ['   Kâr Marjı', `%${is.profitMargin.toFixed(1)}`, '', false],
        ['   EBIT Marjı', `%${is.ebitMargin.toFixed(1)}`, '', false],
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
      doc.text('HİZMET BAZLI GELİR DAĞILIMI', 14, 20);
      
      const serviceData = data.serviceRevenue.map(s => [
        s.name,
        formatCurrency(s.amount),
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
      doc.text('GİDER KATEGORİLERİ DAĞILIMI', 14, 20);
      
      const expenseData = data.expenseCategories.slice(0, 15).map(e => [
        e.name,
        formatCurrency(e.amount),
        `%${e.percentage.toFixed(1)}`,
        e.isFixed ? 'Sabit' : 'Değişken',
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
      doc.text('ORTAK & FİNANSMAN', 14, 20);
      
      // Partner Account Summary
      doc.setFontSize(14);
      doc.text('Ortak Cari Hesabı', 14, 35);
      
      autoTable(doc, {
        startY: 40,
        body: [
          ['Toplam Borç (Ortağa)', formatCurrency(data.partnerAccount.totalDebit)],
          ['Toplam Alacak (Ortaktan)', formatCurrency(data.partnerAccount.totalCredit)],
          ['Net Bakiye', formatCurrency(data.partnerAccount.balance)],
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
          ['Kredi Kullanımı', formatCurrency(data.financing.creditUsed)],
          ['Kredi Ödemesi', formatCurrency(data.financing.creditPaid)],
          ['Leasing Ödemesi', formatCurrency(data.financing.leasingPaid)],
          ['Faiz Ödemesi', formatCurrency(data.financing.interestPaid)],
          ['Kalan Borç (Tahmini)', formatCurrency(data.financing.remainingDebt)],
        ],
        theme: 'grid',
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right' },
        },
      });
      
      // Save
      const fileName = `Finansal_Rapor_${data.year}_${data.period}.pdf`;
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
