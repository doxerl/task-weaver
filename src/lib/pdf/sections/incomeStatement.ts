// ============================================
// GELİR TABLOSU BÖLÜM RENDERER
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IncomeStatementData, IncomeStatementLine, DetailedIncomeStatementData } from '@/types/reports';
import { tr, addSectionHeader, createCoverPage } from '../pdfUtils';
import { PDF_COLORS } from '../pdfTypes';

// ============================================
// GELİR TABLOSU PDF
// ============================================

export function renderIncomeStatement(
  doc: jsPDF,
  statement: IncomeStatementData,
  lines: IncomeStatementLine[],
  year: number,
  formatFn: (n: number) => string,
  options?: {
    currency?: 'TRY' | 'USD';
    yearlyAverageRate?: number;
  }
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { currency = 'TRY', yearlyAverageRate } = options || {};
  
  // Kapak sayfası
  createCoverPage(doc, {
    title: currency === 'USD' ? 'GELIR TABLOSU (USD)' : 'GELIR TABLOSU',
    subtitle: tr(`Donem: 01.01.${year} - 31.12.${year}`),
    year,
    currency,
    yearlyAverageRate,
  });
  
  // Özet göstergeler
  let yPos = 100;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('OZET GOSTERGELER'), 15, yPos);
  yPos += 10;
  
  const summaryData = [
    [tr('Brut Satislar'), formatFn(statement.grossSales.total)],
    [tr('Net Satislar'), formatFn(statement.netSales)],
    [tr('Brut Kar'), formatFn(statement.grossProfit)],
    [tr('Faaliyet Kari (EBIT)'), formatFn(statement.operatingProfit)],
    [tr('Vergi Oncesi Kar'), formatFn(statement.preTaxProfit)],
    [tr('Donem Net Kari'), formatFn(statement.netProfit)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [[tr('Kalem'), tr('Tutar')]],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
  });
  
  // Karlılık oranları
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('KARLILIK ORANLARI'), 15, yPos);
  yPos += 10;
  
  const ratioData = [
    [tr('Brut Kar Marji'), `%${statement.grossMargin.toFixed(1)}`],
    [tr('EBIT Marji (Faaliyet)'), `%${statement.ebitMargin.toFixed(1)}`],
    [tr('Net Kar Marji'), `%${statement.profitMargin.toFixed(1)}`],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [[tr('Oran'), tr('Deger')]],
    body: ratioData,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
  });
  
  // Detaylı gelir tablosu sayfası
  doc.addPage();
  addSectionHeader(doc, tr('DETAYLI GELIR TABLOSU'));
  
  // Satırları tabloya dönüştür
  const tableData = lines
    .filter(line => line.name)
    .map(line => {
      const indent = '  '.repeat(line.indent);
      const name = `${indent}${line.code ? `${line.code} - ` : ''}${line.name}`;
      
      let amountStr = '';
      if (line.amount !== 0) {
        amountStr = line.isNegative 
          ? `(${formatFn(Math.abs(line.amount))})` 
          : formatFn(line.amount);
      }
      
      return {
        name: tr(name),
        amount: amountStr,
        isTotal: line.isTotal,
        isSubtotal: line.isSubtotal,
      };
    });
  
  autoTable(doc, {
    startY: 35,
    head: [[tr('Kalem'), tr('Tutar')]],
    body: tableData.map(row => [row.name, row.amount]),
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
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
}

// ============================================
// AYRINTILI GELİR TABLOSU (RESMİ FORMAT)
// ============================================

export function renderDetailedIncomeStatement(
  doc: jsPDF,
  data: DetailedIncomeStatementData,
  formatFn: (n: number) => string,
  options?: {
    currency?: 'TRY' | 'USD';
    yearlyAverageRate?: number;
  }
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const { currency = 'TRY', yearlyAverageRate } = options || {};
  
  // Başlık
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(tr(`(${data.periodStart} - ${data.periodEnd} DONEMI)`), pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('AYRINTILI GELIR TABLOSU'), pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(tr(data.companyName), pageWidth / 2, 29, { align: 'center' });
  
  // Para birimi notu
  if (currency === 'USD' && yearlyAverageRate) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(tr(`Para Birimi: USD (Yillik Ort. Kur: ${yearlyAverageRate.toFixed(4)})`), pageWidth / 2, 35, { align: 'center' });
  }
  
  // Boş alt öğeleri filtrele
  const visibleLines = data.lines.filter(line => {
    if (line.isBold || line.isHeader) return true;
    if (line.isSubItem) {
      return line.subAmount !== undefined && line.subAmount !== 0;
    }
    return (line.subAmount !== undefined && line.subAmount !== 0) || 
           (line.totalAmount !== undefined && line.totalAmount !== 0);
  });
  
  // Format helper
  const formatValue = (value: number | undefined, isNegative?: boolean): string => {
    if (value === undefined) return '';
    if (value === 0) return '0,00';
    const absValue = Math.abs(value);
    const formatted = formatFn(absValue).replace(/[₺$]/g, '').trim();
    return isNegative || value < 0 ? `(${formatted})` : formatted;
  };
  
  // Tablo verisi
  const tableData = visibleLines.map(line => {
    const displayValue = line.isSubItem ? line.subAmount : line.totalAmount;
    
    return [
      line.code || '',
      tr(line.isSubItem ? `   ${line.name}` : line.name),
      formatValue(displayValue, line.isNegative),
    ];
  });
  
  autoTable(doc, {
    startY: currency === 'USD' ? 40 : 35,
    head: [[
      'Kod',
      tr('ACIKLAMA'),
      tr(`CARI DONEM (${data.year})`),
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
  });
}
