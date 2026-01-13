import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FullReportData, MonthlyDataPoint, DetailedIncomeStatementData, DetailedIncomeStatementLine } from '@/types/reports';
import { BalanceSheet } from '@/types/finance';

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
  // Detailed Income Statement (Official Format)
  detailedIncomeStatement?: DetailedIncomeStatementData;
  
  // Full Balance Sheet with account codes
  fullBalanceSheet?: BalanceSheet;
  
  // Legacy balance sheet summary (for backward compatibility)
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
  const [progress, setProgress] = useState<FullReportProgress>({ current: 0, total: 12, stage: '' });

  const generateFullReport = useCallback(async (
    data: FullReportData,
    chartRefs: FullReportChartRefs,
    additionalData: FullReportAdditionalData,
    options?: FullReportPdfOptions
  ) => {
    setIsGenerating(true);
    setProgress({ current: 0, total: 12, stage: 'Baslatiliyor...' });

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
      setProgress({ current: 1, total: 12, stage: 'Kapak olusturuluyor...' });

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
        '4. Gider Dagilimi ve Alt Kirilimlari',
        '5. Resmi Ayrintili Gelir Tablosu',
        '6. Tam Bilanco',
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
      setProgress({ current: 2, total: 12, stage: 'Ozet olusturuluyor...' });

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
      setProgress({ current: 3, total: 12, stage: 'Trend grafigi ekleniyor...' });

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
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 3) {
            const value = parseFloat(String(cellData.cell.raw).replace(/[^\d,-]/g, '').replace(',', '.'));
            if (value < 0) {
              cellData.cell.styles.textColor = [239, 68, 68];
            } else if (value > 0) {
              cellData.cell.styles.textColor = [34, 197, 94];
            }
          }
        },
      });

      addPageNumber();

      // ==========================================
      // PAGE 4: INCOME DISTRIBUTION
      // ==========================================
      doc.addPage();
      setProgress({ current: 4, total: 12, stage: 'Gelir dagilimi ekleniyor...' });

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
      // PAGE 5: EXPENSE DISTRIBUTION WITH SUB-BREAKDOWNS
      // ==========================================
      doc.addPage();
      setProgress({ current: 5, total: 12, stage: 'Gider dagilimi ekleniyor...' });

      doc.setFillColor(239, 68, 68);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('4. GIDER DAGILIMI VE ALT KIRILIMLARI'), pageWidth / 2, 17, { align: 'center' });

      // Try to capture expense chart
      if (chartRefs.expenseChart) {
        const chartImage = await captureChartToImage(chartRefs.expenseChart);
        if (chartImage) {
          doc.addImage(chartImage, 'PNG', margin, 35, pageWidth - (margin * 2), 100);
        }
      }

      // Full expense categories table with Fixed/Variable indication
      const fullExpenseData = data.expenseCategories.map(item => [
        normalizeTurkish(item.name.length > 35 ? item.name.substring(0, 32) + '...' : item.name),
        item.isFixed ? 'Sabit' : 'Degisken',
        fmt(item.amount),
        `%${item.percentage.toFixed(1)}`,
      ]);

      autoTable(doc, {
        startY: chartRefs.expenseChart ? 145 : 35,
        head: [[normalizeTurkish('Gider Kategorisi'), normalizeTurkish('Tur'), normalizeTurkish('Tutar'), '%']],
        body: fullExpenseData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 45, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
        },
        showHead: 'everyPage',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.column.index === 1) {
            const value = String(cellData.cell.raw);
            if (value === 'Sabit') {
              cellData.cell.styles.textColor = [59, 130, 246];
            } else {
              cellData.cell.styles.textColor = [168, 85, 247];
            }
          }
        },
      });

      // Summary: Fixed vs Variable
      yPos = (doc as any).lastAutoTable.finalY + 10;
      const fixedTotal = data.expenseCategories.filter(c => c.isFixed).reduce((s, c) => s + c.amount, 0);
      const variableTotal = data.expenseCategories.filter(c => !c.isFixed).reduce((s, c) => s + c.amount, 0);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('Sabit vs Degisken Gider Ozeti:'), margin, yPos);

      autoTable(doc, {
        startY: yPos + 3,
        body: [
          [normalizeTurkish('Sabit Giderler'), fmt(fixedTotal)],
          [normalizeTurkish('Degisken Giderler'), fmt(variableTotal)],
          [normalizeTurkish('TOPLAM'), fmt(fixedTotal + variableTotal)],
        ],
        theme: 'plain',
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'right' },
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.row.index === 2) {
            cellData.cell.styles.fontStyle = 'bold';
          }
        },
      });

      addPageNumber();

      // ==========================================
      // PAGE 6-7: OFFICIAL DETAILED INCOME STATEMENT
      // ==========================================
      doc.addPage();
      setProgress({ current: 6, total: 12, stage: 'Ayrintili gelir tablosu ekleniyor...' });

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('5. RESMI AYRINTILI GELIR TABLOSU'), pageWidth / 2, 17, { align: 'center' });

      if (additionalData.detailedIncomeStatement && additionalData.detailedIncomeStatement.lines.length > 0) {
        const detailedData = additionalData.detailedIncomeStatement;

        // Header info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(normalizeTurkish(`(${detailedData.periodStart} - ${detailedData.periodEnd} DONEMI)`), pageWidth / 2, 32, { align: 'center' });
        doc.text(normalizeTurkish(detailedData.companyName || ''), pageWidth / 2, 38, { align: 'center' });

        // Format value helper for detailed statement
        const formatDetailedValue = (value: number | undefined, isNegative?: boolean): string => {
          if (value === undefined) return '';
          if (value === 0) return '0,00';
          const absValue = Math.abs(value);
          const formatted = fmt(absValue).replace(/[₺$]/g, '').trim();
          return isNegative || value < 0 ? `(${formatted})` : formatted;
        };

        // Filter out empty sub-items for cleaner PDF
        const visibleLines = detailedData.lines.filter((line: DetailedIncomeStatementLine) => {
          if (line.isBold || line.isHeader) return true;
          if (line.isSubItem) {
            return line.subAmount !== undefined && line.subAmount !== 0;
          }
          return (line.subAmount !== undefined && line.subAmount !== 0) || 
                 (line.totalAmount !== undefined && line.totalAmount !== 0);
        });

        // Prepare table data
        const tableData = visibleLines.map((line: DetailedIncomeStatementLine) => {
          const displayValue = line.isSubItem ? line.subAmount : line.totalAmount;
          return [
            line.code || '',
            normalizeTurkish(line.isSubItem ? `   ${line.name}` : line.name),
            formatDetailedValue(displayValue, line.isNegative),
          ];
        });

        autoTable(doc, {
          startY: 45,
          head: [['Kod', normalizeTurkish('ACIKLAMA'), normalizeTurkish(`CARI DONEM (${data.year})`)]],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'left', cellWidth: 120 },
            2: { halign: 'right', cellWidth: 40 },
          },
          didParseCell: (hookData) => {
            if (hookData.section === 'body') {
              const lineIndex = hookData.row.index;
              const line = visibleLines[lineIndex];
              if (line) {
                if (line.isBold || line.isHeader) {
                  hookData.cell.styles.fontStyle = 'bold';
                }
                if (hookData.column.index === 2 && line.isNegative) {
                  hookData.cell.styles.textColor = [200, 0, 0];
                }
                if (line.isBold && !line.isHeader) {
                  hookData.cell.styles.fillColor = [245, 245, 245];
                }
              }
            }
          },
          showHead: 'everyPage',
          pageBreak: 'auto',
          rowPageBreak: 'avoid',
        });

        // Profitability ratios
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        // Check if we need a new page
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeTurkish('Karlilik Oranlari'), margin, yPos);

        const ratioData = [
          [normalizeTurkish('Brut Kar Marji'), `%${data.incomeStatement.grossMargin.toFixed(1)}`],
          [normalizeTurkish('EBIT Marji (Faaliyet)'), `%${data.incomeStatement.ebitMargin.toFixed(1)}`],
          [normalizeTurkish('Net Kar Marji'), `%${data.incomeStatement.profitMargin.toFixed(1)}`],
        ];

        autoTable(doc, {
          startY: yPos + 3,
          body: ratioData,
          theme: 'striped',
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'right' },
          },
        });
      } else {
        // Fallback to simple income statement
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(normalizeTurkish('Ayrintili gelir tablosu verisi mevcut degil. Ozet gosteriliyor.'), margin, 35);

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
          startY: 45,
          body: incomeStatementData.map(row => [normalizeTurkish(row[0]), row[1]]),
          theme: 'plain',
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 110 },
            1: { cellWidth: 60, halign: 'right' },
          },
          didParseCell: (cellData) => {
            if (cellData.section === 'body') {
              const text = String(cellData.cell.raw);
              if (text.startsWith('NET') || text.startsWith('BRUT') || text.startsWith('FAALIYET') || 
                  text.startsWith('VERGI') || text.startsWith('DONEM')) {
                cellData.cell.styles.fontStyle = 'bold';
                cellData.cell.styles.fillColor = [239, 246, 255];
              }
            }
          },
        });
      }

      addPageNumber();

      // ==========================================
      // PAGE 8-9: FULL BALANCE SHEET
      // ==========================================
      doc.addPage();
      setProgress({ current: 7, total: 12, stage: 'Tam bilanco ekleniyor...' });

      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('6. TAM BILANCO'), pageWidth / 2, 17, { align: 'center' });

      const bs = additionalData.fullBalanceSheet || additionalData.balanceSheet;
      
      if (bs && 'currentAssets' in bs) {
        const fullBs = bs as BalanceSheet;
        
        // Sub-header
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(normalizeTurkish(`31.12.${data.year} Tarihli`), pageWidth / 2, 32, { align: 'center' });

        // AKTIF (ASSETS)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeTurkish('AKTIF (VARLIKLAR)'), margin, 42);

        const otherVat = (fullBs.currentAssets as any).otherVat || 0;
        const aktivData: (string | number)[][] = [
          [normalizeTurkish('I - DONEN VARLIKLAR'), ''],
          [normalizeTurkish('   A - Hazir Degerler'), fmt(fullBs.currentAssets.cash + fullBs.currentAssets.banks)],
          [normalizeTurkish('      100 Kasa'), fmt(fullBs.currentAssets.cash)],
          [normalizeTurkish('      102 Bankalar'), fmt(fullBs.currentAssets.banks)],
          [normalizeTurkish('   C - Ticari Alacaklar'), fmt(fullBs.currentAssets.receivables)],
          [normalizeTurkish('      120 Alicilar'), fmt(fullBs.currentAssets.receivables)],
        ];

        if (fullBs.currentAssets.partnerReceivables > 0) {
          aktivData.push([normalizeTurkish('   D - Diger Alacaklar'), fmt(fullBs.currentAssets.partnerReceivables)]);
          aktivData.push([normalizeTurkish('      131 Ortaklardan Alacaklar'), fmt(fullBs.currentAssets.partnerReceivables)]);
        }

        aktivData.push([normalizeTurkish('   H - Diger Donen Varliklar'), fmt(fullBs.currentAssets.vatReceivable + otherVat)]);
        aktivData.push([normalizeTurkish('      191 Indirilecek KDV'), fmt(fullBs.currentAssets.vatReceivable)]);
        if (otherVat > 0) {
          aktivData.push([normalizeTurkish('      193 Diger KDV'), fmt(otherVat)]);
        }
        aktivData.push([normalizeTurkish('DONEN VARLIKLAR TOPLAMI'), fmt(fullBs.currentAssets.total)]);
        aktivData.push(['', '']);
        aktivData.push([normalizeTurkish('II - DURAN VARLIKLAR'), '']);
        aktivData.push([normalizeTurkish('   D - Maddi Duran Varliklar'), fmt(fullBs.fixedAssets.total)]);
        aktivData.push([normalizeTurkish('      254 Tasitlar'), fmt(fullBs.fixedAssets.vehicles)]);
        aktivData.push([normalizeTurkish('      255 Demirbaslar'), fmt(fullBs.fixedAssets.equipment)]);
        aktivData.push([normalizeTurkish('      257 Birikmis Amortismanlar (-)'), `(${fmt(fullBs.fixedAssets.depreciation)})`]);
        aktivData.push([normalizeTurkish('DURAN VARLIKLAR TOPLAMI'), fmt(fullBs.fixedAssets.total)]);
        aktivData.push(['', '']);
        aktivData.push([normalizeTurkish('AKTIF (VARLIKLAR) TOPLAMI'), fmt(fullBs.totalAssets)]);

        autoTable(doc, {
          startY: 47,
          body: aktivData,
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 1 },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 110 },
            1: { cellWidth: 50, halign: 'right' },
          },
          didParseCell: (cellData) => {
            const rowText = String(aktivData[cellData.row.index]?.[0] || '');
            if (rowText.includes('TOPLAMI')) {
              cellData.cell.styles.fontStyle = 'bold';
            }
            if (rowText.startsWith('I -') || rowText.startsWith('II -')) {
              cellData.cell.styles.fontStyle = 'bold';
            }
          },
        });

        // PASİF (LIABILITIES) - New page if needed
        yPos = (doc as any).lastAutoTable.finalY + 10;
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeTurkish('PASIF (KAYNAKLAR)'), margin, yPos);

        const personnelPayables = (fullBs.shortTermLiabilities as any).personnelPayables || 0;
        const taxPayables = (fullBs.shortTermLiabilities as any).taxPayables || 0;
        const socialSecurityPayables = (fullBs.shortTermLiabilities as any).socialSecurityPayables || 0;

        const pasifData: (string | number)[][] = [
          [normalizeTurkish('I - KISA VADELI YABANCI KAYNAKLAR'), ''],
        ];

        if (fullBs.shortTermLiabilities.loanInstallments > 0) {
          pasifData.push([normalizeTurkish('   A - Mali Borclar'), fmt(fullBs.shortTermLiabilities.loanInstallments)]);
          pasifData.push([normalizeTurkish('      300 Banka Kredileri'), fmt(fullBs.shortTermLiabilities.loanInstallments)]);
        }

        pasifData.push([normalizeTurkish('   B - Ticari Borclar'), fmt(fullBs.shortTermLiabilities.payables)]);
        pasifData.push([normalizeTurkish('      320 Saticilar'), fmt(fullBs.shortTermLiabilities.payables)]);

        if (fullBs.shortTermLiabilities.partnerPayables > 0 || personnelPayables > 0) {
          pasifData.push([normalizeTurkish('   C - Diger Borclar'), fmt(fullBs.shortTermLiabilities.partnerPayables + personnelPayables)]);
          if (fullBs.shortTermLiabilities.partnerPayables > 0) {
            pasifData.push([normalizeTurkish('      331 Ortaklara Borclar'), fmt(fullBs.shortTermLiabilities.partnerPayables)]);
          }
          if (personnelPayables > 0) {
            pasifData.push([normalizeTurkish('      335 Personele Borclar'), fmt(personnelPayables)]);
          }
        }

        if (taxPayables > 0 || socialSecurityPayables > 0) {
          pasifData.push([normalizeTurkish('   F - Odenecek Vergi ve Diger Yuk.'), fmt(taxPayables + socialSecurityPayables)]);
          if (taxPayables > 0) {
            pasifData.push([normalizeTurkish('      360 Odenecek Vergi ve Fonlar'), fmt(taxPayables)]);
          }
          if (socialSecurityPayables > 0) {
            pasifData.push([normalizeTurkish('      361 Odenecek SGK Kesintileri'), fmt(socialSecurityPayables)]);
          }
        }

        if (fullBs.shortTermLiabilities.vatPayable > 0) {
          pasifData.push([normalizeTurkish('   I - Diger Kisa Vadeli Yab. Kay.'), fmt(fullBs.shortTermLiabilities.vatPayable)]);
          pasifData.push([normalizeTurkish('      391 Hesaplanan KDV'), fmt(fullBs.shortTermLiabilities.vatPayable)]);
        }

        pasifData.push([normalizeTurkish('KISA VADELI YABANCI KAY. TOPLAMI'), fmt(fullBs.shortTermLiabilities.total)]);

        if (fullBs.longTermLiabilities.total > 0) {
          pasifData.push(['', '']);
          pasifData.push([normalizeTurkish('II - UZUN VADELI YABANCI KAYNAKLAR'), '']);
          pasifData.push([normalizeTurkish('   A - Mali Borclar'), fmt(fullBs.longTermLiabilities.bankLoans)]);
          pasifData.push([normalizeTurkish('      400 Banka Kredileri'), fmt(fullBs.longTermLiabilities.bankLoans)]);
          pasifData.push([normalizeTurkish('UZUN VADELI YABANCI KAY. TOPLAMI'), fmt(fullBs.longTermLiabilities.total)]);
        }

        pasifData.push(['', '']);
        pasifData.push([normalizeTurkish('III - OZKAYNAKLAR'), '']);
        pasifData.push([normalizeTurkish('   A - Odenmis Sermaye'), fmt(fullBs.equity.paidCapital)]);
        pasifData.push([normalizeTurkish('      500 Sermaye'), fmt(fullBs.equity.paidCapital)]);
        
        if (fullBs.equity.retainedEarnings !== 0) {
          pasifData.push([normalizeTurkish('   D - Gecmis Yillar Karlari'), fmt(fullBs.equity.retainedEarnings)]);
        }
        
        pasifData.push([normalizeTurkish('   F - Donem Net Kari (Zarari)'), fmt(fullBs.equity.currentProfit)]);
        if (fullBs.equity.currentProfit >= 0) {
          pasifData.push([normalizeTurkish('      590 Donem Net Kari'), fmt(fullBs.equity.currentProfit)]);
        } else {
          pasifData.push([normalizeTurkish('      591 Donem Net Zarari (-)'), `(${fmt(Math.abs(fullBs.equity.currentProfit))})`]);
        }
        
        pasifData.push([normalizeTurkish('OZKAYNAKLAR TOPLAMI'), fmt(fullBs.equity.total)]);
        pasifData.push(['', '']);
        pasifData.push([normalizeTurkish('PASIF (KAYNAKLAR) TOPLAMI'), fmt(fullBs.totalLiabilities)]);

        // Balance check
        pasifData.push(['', '']);
        const balanceStatus = fullBs.isBalanced 
          ? normalizeTurkish('Denklik: Aktif = Pasif [OK]')
          : normalizeTurkish(`Denklik Farki: ${fmt(fullBs.difference)}`);
        pasifData.push([balanceStatus, '']);

        autoTable(doc, {
          startY: yPos + 5,
          body: pasifData,
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 1 },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 110 },
            1: { cellWidth: 50, halign: 'right' },
          },
          didParseCell: (cellData) => {
            const rowText = String(pasifData[cellData.row.index]?.[0] || '');
            if (rowText.includes('TOPLAMI') || rowText.startsWith('Denklik')) {
              cellData.cell.styles.fontStyle = 'bold';
            }
            if (rowText.startsWith('I -') || rowText.startsWith('II -') || rowText.startsWith('III -')) {
              cellData.cell.styles.fontStyle = 'bold';
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
      // PAGE 10: VAT SUMMARY
      // ==========================================
      doc.addPage();
      setProgress({ current: 8, total: 12, stage: 'KDV ozeti ekleniyor...' });

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
          didParseCell: (cellData) => {
            if (cellData.section === 'body' && cellData.row.index === 2) {
              cellData.cell.styles.fontStyle = 'bold';
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
      // PAGE 11: FINANCING & PARTNER ACCOUNT
      // ==========================================
      doc.addPage();
      setProgress({ current: 9, total: 12, stage: 'Finansman ekleniyor...' });

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
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.row.index === 2) {
            cellData.cell.styles.fontStyle = 'bold';
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
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.row.index === 4) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.textColor = [239, 68, 68];
          }
        },
      });

      addPageNumber();

      // ==========================================
      // FINALIZE: Add page numbers to all pages
      // ==========================================
      setProgress({ current: 10, total: 12, stage: 'Tamamlaniyor...' });

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
      setProgress({ current: 0, total: 12, stage: '' });
    }
  }, []);

  return { generateFullReport, isGenerating, progress };
}
