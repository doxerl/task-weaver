import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DetailedIncomeStatementData } from '@/types/reports';
import { normalizeTurkishText } from '@/lib/fonts/roboto';

interface PdfOptions {
  currency?: 'TRY' | 'USD';
  formatAmount?: (n: number) => string;
  yearlyAverageRate?: number;
}

export function useDetailedIncomeStatementPdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = useCallback(async (data: DetailedIncomeStatementData, options: PdfOptions = {}) => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const currency = options.currency || 'TRY';

      // Helper to normalize Turkish text for PDF
      const n = normalizeTurkishText;

      // Format helper - with parentheses for negative values
      const formatValue = (value: number | undefined, isNegative?: boolean): string => {
        if (value === undefined) return '';
        if (value === 0) return '0,00';
        const absValue = Math.abs(value);
        const formatted = options.formatAmount 
          ? options.formatAmount(absValue).replace(/[₺$]/g, '').trim()
          : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absValue);
        return isNegative || value < 0 ? `(${formatted})` : formatted;
      };

      // Header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(n(`(${data.periodStart} - ${data.periodEnd} DONEMI)`), pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(n('AYRINTILI GELIR TABLOSU'), pageWidth / 2, 22, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(n(data.companyName), pageWidth / 2, 29, { align: 'center' });

      // Currency note
      if (currency === 'USD' && options.yearlyAverageRate) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(n(`Para Birimi: USD (Yillik Ort. Kur: ${options.yearlyAverageRate.toFixed(4)})`), pageWidth / 2, 35, { align: 'center' });
      }

      // Filter out empty sub-items for cleaner PDF
      const visibleLines = data.lines.filter(line => {
        if (line.isBold || line.isHeader) return true;
        if (line.isSubItem) {
          return line.subAmount !== undefined && line.subAmount !== 0;
        }
        return (line.subAmount !== undefined && line.subAmount !== 0) || 
               (line.totalAmount !== undefined && line.totalAmount !== 0);
      });

      // Prepare table data - Single column format (Resmi Türk formatı)
      const tableData = visibleLines.map(line => {
        // Use subAmount for sub-items, totalAmount for headers/totals
        const displayValue = line.isSubItem ? line.subAmount : line.totalAmount;
        
        return [
          line.code || '',
          n(line.isSubItem ? `   ${line.name}` : line.name),
          formatValue(displayValue, line.isNegative),
        ];
      });

      // Generate table - Single amount column
      autoTable(doc, {
        startY: currency === 'USD' ? 40 : 35,
        head: [[
          'Kod',
          n('ACIKLAMA'),
          n(`CARI DONEM (${data.year})`),
        ]],
        body: tableData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
        },
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
              // Bold for headers and totals
              if (line.isBold || line.isHeader) {
                hookData.cell.styles.fontStyle = 'bold';
              }
              // Red for negative values in amount column
              if (hookData.column.index === 2 && line.isNegative) {
                hookData.cell.styles.textColor = [200, 0, 0];
              }
              // Highlight total rows
              if (line.isBold && !line.isHeader) {
                hookData.cell.styles.fillColor = [245, 245, 245];
              }
            }
          }
        },
      });

      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Sayfa No: ${i}/${pageCount}`,
          pageWidth - 15,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
      }

      // Save
      const filename = `AyrintiliGelirTablosu_${data.year}${currency === 'USD' ? '_USD' : ''}.pdf`;
      doc.save(filename);

    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generatePdf, isGenerating };
}
