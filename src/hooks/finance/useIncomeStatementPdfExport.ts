import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IncomeStatementData, IncomeStatementLine } from '@/types/reports';

export interface IncomeStatementPdfOptions {
  currency?: 'TRY' | 'USD';
  formatAmount?: (amount: number) => string;
  yearlyAverageRate?: number | null;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export function useIncomeStatementPdfExport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateIncomeStatementPdf = useCallback(async (
    statement: IncomeStatementData,
    lines: IncomeStatementLine[],
    year: number,
    options?: IncomeStatementPdfOptions
  ) => {
    setIsGenerating(true);

    try {
      const { currency = 'TRY', formatAmount, yearlyAverageRate } = options || {};
      const fmt = formatAmount || formatCurrency;
      const isUsd = currency === 'USD';

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;

      // === COVER PAGE ===
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 60, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      const title = isUsd ? 'GELIR TABLOSU (USD)' : 'GELIR TABLOSU';
      doc.text(title, pageWidth / 2, 35, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Donem: 01.01.${year} - 31.12.${year}`, pageWidth / 2, 50, { align: 'center' });

      // Report info
      doc.setTextColor(0, 0, 0);
      let yPos = 80;
      doc.setFontSize(11);
      doc.text(`Hazirlama Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, margin, yPos);
      yPos += 8;

      if (isUsd && yearlyAverageRate) {
        doc.text(`Para Birimi: USD (Yillik Ort. Kur: ${yearlyAverageRate.toFixed(2)} TL/USD)`, margin, yPos);
        yPos += 8;
      }

      // Key metrics summary
      yPos += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('OZET GOSTERGELER', margin, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const summaryData = [
        ['Brut Satislar', fmt(statement.grossSales.total)],
        ['Net Satislar', fmt(statement.netSales)],
        ['Brut Kar', fmt(statement.grossProfit)],
        ['Faaliyet Kari (EBIT)', fmt(statement.operatingProfit)],
        ['Vergi Oncesi Kar', fmt(statement.preTaxProfit)],
        ['Donem Net Kari', fmt(statement.netProfit)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Kalem', 'Tutar']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 60, halign: 'right' },
        },
      });

      // Profitability ratios
      yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('KARLILIK ORANLARI', margin, yPos);
      yPos += 10;

      const ratioData = [
        ['Brut Kar Marji', `%${statement.grossMargin.toFixed(1)}`],
        ['EBIT Marji (Faaliyet)', `%${statement.ebitMargin.toFixed(1)}`],
        ['Net Kar Marji', `%${statement.profitMargin.toFixed(1)}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Oran', 'Deger']],
        body: ratioData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 60, halign: 'right' },
        },
      });

      // === PAGE 2: DETAILED INCOME STATEMENT ===
      doc.addPage();

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAYLI GELIR TABLOSU', pageWidth / 2, 17, { align: 'center' });

      // Build table data from lines
      const tableData = lines
        .filter(line => line.name) // Skip empty lines
        .map(line => {
          const indent = '  '.repeat(line.indent);
          const name = `${indent}${line.code ? `${line.code} - ` : ''}${line.name}`;
          
          let amountStr = '';
          if (line.amount !== 0) {
            amountStr = line.isNegative 
              ? `(${fmt(Math.abs(line.amount))})` 
              : fmt(line.amount);
          }

          return {
            name,
            amount: amountStr,
            isTotal: line.isTotal,
            isSubtotal: line.isSubtotal,
          };
        });

      autoTable(doc, {
        startY: 35,
        head: [['Kalem', 'Tutar']],
        body: tableData.map(row => [row.name, row.amount]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 50, halign: 'right' },
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowData = tableData[data.row.index];
            if (rowData?.isTotal) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [239, 246, 255];
            } else if (rowData?.isSubtotal) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [248, 250, 252];
            }
          }
        },
      });

      // Footer
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
      const fileName = `GelirTablosu_${year}${currencySuffix}.pdf`;
      doc.save(fileName);

    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateIncomeStatementPdf, isGenerating };
}
