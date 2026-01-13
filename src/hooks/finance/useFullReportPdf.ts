import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FullReportData, MonthlyDataPoint } from '@/types/reports';

export interface FullReportPdfOptions {
  currency?: 'TRY' | 'USD';
  formatAmount?: (amount: number) => string;
  yearlyAverageRate?: number | null;
}

export interface FullReportChartRefs {
  trendChart?: HTMLElement | null;
  incomeChart?: HTMLElement | null;
  expenseChart?: HTMLElement | null;
}

export interface FullReportAdditionalData {
  detailedStatement?: {
    sections: Array<{
      title: string;
      items: Array<{ code: string; name: string; amount: number }>;
      total: number;
    }>;
  };
  balanceSheet?: {
    totalAssets: number;
    totalLiabilities: number;
    currentAssets: { total: number; cash: number; banks: number; receivables: number };
    fixedAssets: { total: number };
    shortTermLiabilities: { total: number };
    longTermLiabilities: { total: number };
    equity: { total: number; paidCapital: number; currentProfit: number };
  };
  vatSummary?: {
    calculated: number;
    deductible: number;
    net: number;
  };
  financingSummary?: {
    partnerDeposits: number;
    partnerWithdrawals: number;
    partnerBalance: number;
    creditIn: number;
    creditOut: number;
    leasingOut: number;
    remainingDebt: number;
  };
}

export interface FullReportProgress {
  current: number;
  total: number;
  stage: string;
}

// Normalize Turkish characters for PDF compatibility
const normalizeTurkish = (text: string): string => {
  const map: Record<string, string> = {
    'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, char => map[char] || char);
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

// Capture chart element to image
async function captureChartToImage(element: HTMLElement): Promise<string | null> {
  try {
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Chart capture error:', error);
    return null;
  }
}

export function useFullReportPdf() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<FullReportProgress>({ current: 0, total: 10, stage: '' });

  const generateFullReport = useCallback(async (
    data: FullReportData,
    chartRefs: FullReportChartRefs,
    additionalData: FullReportAdditionalData,
    options?: FullReportPdfOptions
  ) => {
    setIsGenerating(true);
    setProgress({ current: 0, total: 10, stage: 'Baslatiliyor...' });

    try {
      const { currency = 'TRY', formatAmount, yearlyAverageRate } = options || {};
      const fmt = formatAmount || formatCurrency;
      const isUsd = currency === 'USD';

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // Helper to add page numbers
      const addPageNumber = () => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Sayfa ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      };

      // ==========================================
      // PAGE 1: COVER PAGE
      // ==========================================
      setProgress({ current: 1, total: 10, stage: 'Kapak olusturuluyor...' });

      // Blue header bar
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 80, 'F');

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      const title = isUsd ? 'KAPSAMLI FINANSAL RAPOR (USD)' : 'KAPSAMLI FINANSAL RAPOR';
      doc.text(normalizeTurkish(title), pageWidth / 2, 40, { align: 'center' });

      // Subtitle
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(normalizeTurkish(`Donem: 01.01.${data.year} - 31.12.${data.year}`), pageWidth / 2, 55, { align: 'center' });

      // Date
      doc.setFontSize(12);
      doc.text(normalizeTurkish(`Hazirlama Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), pageWidth / 2, 70, { align: 'center' });

      // Currency info if USD
      if (isUsd && yearlyAverageRate) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(normalizeTurkish(`Para Birimi: USD (Yillik Ort. Kur: ${yearlyAverageRate.toFixed(2)} TL/USD)`), margin, 100);
      }

      // Table of contents
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('ICINDEKILER'), margin, 120);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const toc = [
        '1. Yonetici Ozeti ve Temel Gostergeler',
        '2. Aylik Trend Analizi',
        '3. Gelir Dagilimi',
        '4. Gider Dagilimi',
        '5. Gelir Tablosu',
        '6. Bilanco Ozeti',
        '7. KDV Ozeti',
        '8. Finansman ve Ortak Cari',
      ];

      let tocY = 130;
      toc.forEach((item, i) => {
        doc.text(normalizeTurkish(item), margin + 5, tocY + (i * 8));
      });

      addPageNumber();

      // ==========================================
      // PAGE 2: EXECUTIVE SUMMARY (KPIs)
      // ==========================================
      doc.addPage();
      setProgress({ current: 2, total: 10, stage: 'Ozet olusturuluyor...' });

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('1. YONETICI OZETI'), pageWidth / 2, 17, { align: 'center' });

      // KPI Table
      const kpiData = [
        ['Toplam Gelir (Brut)', fmt(data.kpis.totalIncome.value)],
        ['Toplam Gider (Brut)', fmt(data.kpis.totalExpenses.value)],
        ['Net Kar', fmt(data.kpis.netProfit.value)],
        ['Kar Marji', `%${data.kpis.profitMargin.value.toFixed(1)}`],
      ];

      autoTable(doc, {
        startY: 35,
        head: [[normalizeTurkish('Gosterge'), normalizeTurkish('Deger')]],
        body: kpiData.map(row => [normalizeTurkish(row[0]), row[1]]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 60, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      // Service Revenue Summary
      let yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('Hizmet Bazli Gelir Ozeti'), margin, yPos);

      const serviceData = data.serviceRevenue.slice(0, 5).map(item => [
        normalizeTurkish(item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name),
        fmt(item.amount),
        `%${item.percentage.toFixed(1)}`,
      ]);

      autoTable(doc, {
        startY: yPos + 5,
        head: [[normalizeTurkish('Hizmet'), normalizeTurkish('Tutar'), '%']],
        body: serviceData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 30, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      // Expense Categories Summary
      yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('Gider Kategorileri Ozeti'), margin, yPos);

      const expenseData = data.expenseCategories.slice(0, 5).map(item => [
        normalizeTurkish(item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name),
        fmt(item.amount),
        `%${item.percentage.toFixed(1)}`,
      ]);

      autoTable(doc, {
        startY: yPos + 5,
        head: [[normalizeTurkish('Kategori'), normalizeTurkish('Tutar'), '%']],
        body: expenseData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 30, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      addPageNumber();

      // ==========================================
      // PAGE 3: MONTHLY TREND CHART
      // ==========================================
      doc.addPage();
      setProgress({ current: 3, total: 10, stage: 'Trend grafigi ekleniyor...' });

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('2. AYLIK TREND ANALIZI'), pageWidth / 2, 17, { align: 'center' });

      // Try to capture trend chart
      if (chartRefs.trendChart) {
        const chartImage = await captureChartToImage(chartRefs.trendChart);
        if (chartImage) {
          doc.addImage(chartImage, 'PNG', margin, 35, pageWidth - (margin * 2), 100);
        }
      }

      // Monthly data table
      const monthlyTableData = data.monthlyData.map((m: MonthlyDataPoint) => [
        normalizeTurkish(m.monthName),
        fmt(m.income),
        fmt(m.expense),
        fmt(m.net),
        fmt(m.cumulativeProfit),
      ]);

      autoTable(doc, {
        startY: chartRefs.trendChart ? 145 : 35,
        head: [[normalizeTurkish('Ay'), normalizeTurkish('Gelir'), normalizeTurkish('Gider'), 'Net', normalizeTurkish('Kumulatif')]],
        body: monthlyTableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 40, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const value = parseFloat(String(data.cell.raw).replace(/[^\d,-]/g, '').replace(',', '.'));
            if (value < 0) {
              data.cell.styles.textColor = [239, 68, 68];
            } else if (value > 0) {
              data.cell.styles.textColor = [34, 197, 94];
            }
          }
        },
      });

      addPageNumber();

      // ==========================================
      // PAGE 4: INCOME DISTRIBUTION
      // ==========================================
      doc.addPage();
      setProgress({ current: 4, total: 10, stage: 'Gelir dagilimi ekleniyor...' });

      doc.setFillColor(34, 197, 94);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('3. GELIR DAGILIMI'), pageWidth / 2, 17, { align: 'center' });

      // Try to capture income chart
      if (chartRefs.incomeChart) {
        const chartImage = await captureChartToImage(chartRefs.incomeChart);
        if (chartImage) {
          doc.addImage(chartImage, 'PNG', margin, 35, pageWidth - (margin * 2), 100);
        }
      }

      // Full service revenue table
      const fullServiceData = data.serviceRevenue.map(item => [
        normalizeTurkish(item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name),
        fmt(item.amount),
        `%${item.percentage.toFixed(1)}`,
      ]);

      autoTable(doc, {
        startY: chartRefs.incomeChart ? 145 : 35,
        head: [[normalizeTurkish('Hizmet / Gelir Kaynagi'), normalizeTurkish('Tutar'), '%']],
        body: fullServiceData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 45, halign: 'right' },
          2: { cellWidth: 25, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      addPageNumber();

      // ==========================================
      // PAGE 5: EXPENSE DISTRIBUTION
      // ==========================================
      doc.addPage();
      setProgress({ current: 5, total: 10, stage: 'Gider dagilimi ekleniyor...' });

      doc.setFillColor(239, 68, 68);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('4. GIDER DAGILIMI'), pageWidth / 2, 17, { align: 'center' });

      // Try to capture expense chart
      if (chartRefs.expenseChart) {
        const chartImage = await captureChartToImage(chartRefs.expenseChart);
        if (chartImage) {
          doc.addImage(chartImage, 'PNG', margin, 35, pageWidth - (margin * 2), 100);
        }
      }

      // Full expense categories table
      const fullExpenseData = data.expenseCategories.map(item => [
        normalizeTurkish(item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name),
        fmt(item.amount),
        `%${item.percentage.toFixed(1)}`,
      ]);

      autoTable(doc, {
        startY: chartRefs.expenseChart ? 145 : 35,
        head: [[normalizeTurkish('Gider Kategorisi'), normalizeTurkish('Tutar'), '%']],
        body: fullExpenseData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 45, halign: 'right' },
          2: { cellWidth: 25, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      addPageNumber();

      // ==========================================
      // PAGE 6: INCOME STATEMENT
      // ==========================================
      doc.addPage();
      setProgress({ current: 6, total: 10, stage: 'Gelir tablosu ekleniyor...' });

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('5. GELIR TABLOSU'), pageWidth / 2, 17, { align: 'center' });

      const incomeStatementData = [
        [normalizeTurkish('Brut Satislar'), fmt(data.incomeStatement.grossSales.total)],
        [normalizeTurkish('  - Satis Iadeleri (-)'), fmt(data.incomeStatement.salesReturns || 0)],
        [normalizeTurkish('NET SATISLAR'), fmt(data.incomeStatement.netSales)],
        ['', ''],
        [normalizeTurkish('Satisin Maliyeti (-)'), fmt(data.incomeStatement.costOfSales || 0)],
        [normalizeTurkish('BRUT KAR'), fmt(data.incomeStatement.grossProfit)],
        ['', ''],
        [normalizeTurkish('Faaliyet Giderleri (-)'), fmt(data.incomeStatement.operatingExpenses?.total || 0)],
        [normalizeTurkish('FAALIYET KARI (EBIT)'), fmt(data.incomeStatement.operatingProfit)],
        ['', ''],
        [normalizeTurkish('Diger Gelirler (+)'), fmt(data.incomeStatement.otherIncome?.total || 0)],
        [normalizeTurkish('Diger Giderler (-)'), fmt(data.incomeStatement.otherExpenses?.total || 0)],
        [normalizeTurkish('Finansman Giderleri (-)'), fmt(data.incomeStatement.financeExpenses || 0)],
        ['', ''],
        [normalizeTurkish('VERGI ONCESI KAR'), fmt(data.incomeStatement.preTaxProfit)],
        [normalizeTurkish('Vergi Karsiligi (-)'), fmt(data.incomeStatement.taxExpense || 0)],
        [normalizeTurkish('DONEM NET KARI'), fmt(data.incomeStatement.netProfit)],
      ];

      autoTable(doc, {
        startY: 35,
        body: incomeStatementData.map(row => [normalizeTurkish(row[0]), row[1]]),
        theme: 'plain',
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 60, halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const text = String(data.cell.raw);
            // Bold for totals
            if (text.startsWith('NET') || text.startsWith('BRUT') || text.startsWith('FAALIYET') || 
                text.startsWith('VERGI') || text.startsWith('DONEM')) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [239, 246, 255];
            }
          }
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      // Profitability ratios
      yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('Karlilik Oranlari'), margin, yPos);

      const ratioData = [
        [normalizeTurkish('Brut Kar Marji'), `%${data.incomeStatement.grossMargin.toFixed(1)}`],
        [normalizeTurkish('EBIT Marji (Faaliyet)'), `%${data.incomeStatement.ebitMargin.toFixed(1)}`],
        [normalizeTurkish('Net Kar Marji'), `%${data.incomeStatement.profitMargin.toFixed(1)}`],
      ];

      autoTable(doc, {
        startY: yPos + 5,
        body: ratioData,
        theme: 'striped',
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 50, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });

      addPageNumber();

      // ==========================================
      // PAGE 7: BALANCE SHEET SUMMARY
      // ==========================================
      doc.addPage();
      setProgress({ current: 7, total: 10, stage: 'Bilanco ekleniyor...' });

      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('6. BILANCO OZETI'), pageWidth / 2, 17, { align: 'center' });

      if (additionalData.balanceSheet) {
        const bs = additionalData.balanceSheet;
        
        // Assets
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeTurkish('AKTIF (VARLIKLAR)'), margin, 40);

        const assetsData = [
          [normalizeTurkish('Donen Varliklar'), fmt(bs.currentAssets.total)],
          [normalizeTurkish('  - Hazir Degerler'), fmt(bs.currentAssets.cash + bs.currentAssets.banks)],
          [normalizeTurkish('  - Ticari Alacaklar'), fmt(bs.currentAssets.receivables)],
          [normalizeTurkish('Duran Varliklar'), fmt(bs.fixedAssets.total)],
          [normalizeTurkish('TOPLAM AKTIF'), fmt(bs.totalAssets)],
        ];

        autoTable(doc, {
          startY: 45,
          body: assetsData,
          theme: 'plain',
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 60, halign: 'right' },
          },
          didParseCell: (data) => {
            if (data.section === 'body') {
              const text = String(data.cell.raw);
              if (text === normalizeTurkish('TOPLAM AKTIF')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [220, 252, 231];
              }
            }
          },
        });

        // Liabilities
        yPos = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeTurkish('PASIF (KAYNAKLAR)'), margin, yPos);

        const liabilitiesData = [
          [normalizeTurkish('Kisa Vadeli Yabanci Kaynaklar'), fmt(bs.shortTermLiabilities.total)],
          [normalizeTurkish('Uzun Vadeli Yabanci Kaynaklar'), fmt(bs.longTermLiabilities.total)],
          [normalizeTurkish('Ozkaynaklar'), fmt(bs.equity.total)],
          [normalizeTurkish('  - Odenmis Sermaye'), fmt(bs.equity.paidCapital)],
          [normalizeTurkish('  - Donem Net Kari'), fmt(bs.equity.currentProfit)],
          [normalizeTurkish('TOPLAM PASIF'), fmt(bs.totalLiabilities)],
        ];

        autoTable(doc, {
          startY: yPos + 5,
          body: liabilitiesData,
          theme: 'plain',
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 60, halign: 'right' },
          },
          didParseCell: (data) => {
            if (data.section === 'body') {
              const text = String(data.cell.raw);
              if (text === normalizeTurkish('TOPLAM PASIF')) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [219, 234, 254];
              }
            }
          },
        });
      } else {
        doc.setTextColor(128, 128, 128);
        doc.setFontSize(11);
        doc.text(normalizeTurkish('Bilanco verisi mevcut degil.'), margin, 40);
      }

      addPageNumber();

      // ==========================================
      // PAGE 8: VAT SUMMARY
      // ==========================================
      doc.addPage();
      setProgress({ current: 8, total: 10, stage: 'KDV ozeti ekleniyor...' });

      doc.setFillColor(168, 85, 247);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('7. KDV OZETI'), pageWidth / 2, 17, { align: 'center' });

      if (additionalData.vatSummary) {
        const vat = additionalData.vatSummary;
        
        const vatData = [
          [normalizeTurkish('Hesaplanan KDV'), fmt(vat.calculated)],
          [normalizeTurkish('Indirilecek KDV'), fmt(vat.deductible)],
          [vat.net >= 0 ? normalizeTurkish('Odenecek KDV') : normalizeTurkish('Devreden KDV'), fmt(Math.abs(vat.net))],
        ];

        autoTable(doc, {
          startY: 35,
          head: [[normalizeTurkish('Kalem'), normalizeTurkish('Tutar')]],
          body: vatData,
          theme: 'striped',
          headStyles: { fillColor: [168, 85, 247], textColor: 255 },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 60, halign: 'right' },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === 2) {
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });
      } else {
        doc.setTextColor(128, 128, 128);
        doc.setFontSize(11);
        doc.text(normalizeTurkish('KDV verisi mevcut degil.'), margin, 40);
      }

      addPageNumber();

      // ==========================================
      // PAGE 9-10: FINANCING & PARTNER ACCOUNT
      // ==========================================
      doc.addPage();
      setProgress({ current: 9, total: 10, stage: 'Finansman ekleniyor...' });

      doc.setFillColor(236, 72, 153);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('8. FINANSMAN VE ORTAK CARI'), pageWidth / 2, 17, { align: 'center' });

      // Partner Account
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('Ortak Cari Hesabi'), margin, 40);

      const partnerData = [
        [normalizeTurkish('Ortaktan Tahsilat'), fmt(data.partnerAccount.totalCredit)],
        [normalizeTurkish('Ortaga Odeme'), fmt(data.partnerAccount.totalDebit)],
        [normalizeTurkish('Net Bakiye'), fmt(data.partnerAccount.balance)],
      ];

      autoTable(doc, {
        startY: 45,
        body: partnerData,
        theme: 'striped',
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 60, halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === 2) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      // Financing
      yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('Kredi ve Finansman'), margin, yPos);

      const financingData = [
        [normalizeTurkish('Alinan Kredi'), fmt(data.financing.creditUsed)],
        [normalizeTurkish('Odenen Taksit'), fmt(data.financing.creditPaid)],
        [normalizeTurkish('Leasing Odemesi'), fmt(data.financing.leasingPaid)],
        [normalizeTurkish('Faiz Gideri'), fmt(data.financing.interestPaid)],
        [normalizeTurkish('Kalan Borc'), fmt(data.financing.remainingDebt)],
      ];

      autoTable(doc, {
        startY: yPos + 5,
        body: financingData,
        theme: 'striped',
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 60, halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === 4) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [239, 68, 68];
          }
        },
      });

      addPageNumber();

      // ==========================================
      // FINALIZE: Add page numbers to all pages
      // ==========================================
      setProgress({ current: 10, total: 10, stage: 'Tamamlaniyor...' });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Sayfa ${i} / ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save
      const currencySuffix = isUsd ? '_USD' : '';
      const fileName = `Kapsamli_Finansal_Rapor_${data.year}${currencySuffix}.pdf`;
      doc.save(fileName);

    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 10, stage: '' });
    }
  }, []);

  return { generateFullReport, isGenerating, progress };
}
