// ============================================
// ORTAK BÖLÜM RENDERER'LAR
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyDataPoint } from '@/types/reports';
import { tr, addSectionHeader, formatPercent } from '../pdfUtils';
import { PDF_COLORS } from '../pdfTypes';

// ============================================
// AYLIK TREND TABLOSU
// ============================================

export function renderMonthlyTrendTable(
  doc: jsPDF,
  data: MonthlyDataPoint[],
  formatFn: (n: number) => string,
  options?: { year?: number }
): void {
  addSectionHeader(doc, tr('AYLIK TREND ANALIZI'));
  
  const tableData = data.map((m) => [
    tr(m.monthName),
    formatFn(m.income),
    formatFn(m.expense),
    formatFn(m.net),
    formatFn(m.cumulativeProfit),
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [[tr('Ay'), tr('Gelir'), tr('Gider'), 'Net', tr('Kumulatif')]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const value = parseFloat(String(cellData.cell.raw).replace(/[^\d,-]/g, '').replace(',', '.'));
        if (value < 0) {
          cellData.cell.styles.textColor = PDF_COLORS.danger;
        } else if (value > 0) {
          cellData.cell.styles.textColor = PDF_COLORS.success;
        }
      }
    },
  });
}

// ============================================
// FİNANSMAN ÖZETİ
// ============================================

export function renderFinancingSummary(
  doc: jsPDF,
  data: {
    partnerDeposits: number;
    partnerWithdrawals: number;
    partnerBalance: number;
    creditIn: number;
    creditOut: number;
    leasingOut: number;
    remainingDebt: number;
  },
  formatFn: (n: number) => string
): void {
  addSectionHeader(doc, tr('FINANSMAN VE ORTAK CARI'));
  
  // Ortak Cari
  let yPos = 40;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(tr('Ortak Cari Hesap'), 15, yPos);
  
  const partnerData = [
    [tr('Ortaktan Sermaye Girisi'), formatFn(data.partnerDeposits)],
    [tr('Ortaga Cekilen'), formatFn(data.partnerWithdrawals)],
    [tr('Net Bakiye (Ortaga Borc)'), formatFn(data.partnerBalance)],
  ];
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [[tr('Aciklama'), tr('Tutar')]],
    body: partnerData,
    theme: 'striped',
    headStyles: { fillColor: [168, 85, 247], textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.row.index === partnerData.length - 1) {
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
  });
  
  // Kredi ve Finansman
  yPos = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Kredi ve Finansman'), 15, yPos);
  
  const financeData = [
    [tr('Kullanilan Kredi'), formatFn(data.creditIn)],
    [tr('Odenen Kredi'), formatFn(data.creditOut)],
    [tr('Odenen Leasing'), formatFn(data.leasingOut)],
    [tr('Kalan Borc'), formatFn(data.remainingDebt)],
  ];
  
  autoTable(doc, {
    startY: yPos + 5,
    head: [[tr('Aciklama'), tr('Tutar')]],
    body: financeData,
    theme: 'striped',
    headStyles: { fillColor: [234, 179, 8], textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.row.index === financeData.length - 1) {
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
  });
}

// ============================================
// GELİR DAĞILIMI TABLOSU
// ============================================

export function renderIncomeDistribution(
  doc: jsPDF,
  data: Array<{ name: string; amount: number; percentage: number }>,
  formatFn: (n: number) => string
): void {
  addSectionHeader(doc, tr('GELIR DAGILIMI'), PDF_COLORS.success);
  
  const tableData = data.map(item => [
    tr(item.name.length > 40 ? item.name.substring(0, 37) + '...' : item.name),
    formatFn(item.amount),
    `%${item.percentage.toFixed(1)}`,
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [[tr('Hizmet / Gelir Kaynagi'), tr('Tutar'), '%']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.success, textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 25, halign: 'right' },
    },
  });
}

// ============================================
// GİDER DAĞILIMI TABLOSU
// ============================================

export function renderExpenseDistribution(
  doc: jsPDF,
  data: Array<{ name: string; amount: number; percentage: number; isFixed?: boolean }>,
  formatFn: (n: number) => string
): void {
  addSectionHeader(doc, tr('GIDER DAGILIMI'), PDF_COLORS.danger);
  
  const tableData = data.map(item => [
    tr(item.name.length > 35 ? item.name.substring(0, 32) + '...' : item.name),
    item.isFixed ? 'Sabit' : 'Degisken',
    formatFn(item.amount),
    `%${item.percentage.toFixed(1)}`,
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [[tr('Gider Kategorisi'), tr('Tur'), tr('Tutar'), '%']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.danger, textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 45, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 1) {
        const value = String(cellData.cell.raw);
        if (value === 'Sabit') {
          cellData.cell.styles.textColor = PDF_COLORS.primary;
        } else {
          cellData.cell.styles.textColor = [168, 85, 247];
        }
      }
    },
  });
  
  // Sabit vs Değişken özeti
  const yPos = (doc as any).lastAutoTable.finalY + 10;
  const fixedTotal = data.filter(c => c.isFixed).reduce((s, c) => s + c.amount, 0);
  const variableTotal = data.filter(c => !c.isFixed).reduce((s, c) => s + c.amount, 0);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Sabit vs Degisken Gider Ozeti:'), 15, yPos);
  
  autoTable(doc, {
    startY: yPos + 3,
    body: [
      [tr('Sabit Giderler'), formatFn(fixedTotal)],
      [tr('Degisken Giderler'), formatFn(variableTotal)],
      [tr('TOPLAM'), formatFn(fixedTotal + variableTotal)],
    ],
    theme: 'plain',
    margin: { left: 15, right: 15 },
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
}

// ============================================
// KDV ÖZETİ
// ============================================

export function renderVatSummary(
  doc: jsPDF,
  data: { calculated: number; deductible: number; net: number },
  formatFn: (n: number) => string
): void {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('KDV Ozeti'), 15, 40);
  
  const vatData = [
    [tr('Hesaplanan KDV (Borc)'), formatFn(data.calculated)],
    [tr('Indirilecek KDV (Alacak)'), formatFn(data.deductible)],
    [tr('Net KDV Pozisyonu'), formatFn(data.net)],
  ];
  
  autoTable(doc, {
    startY: 45,
    head: [[tr('Kalem'), tr('Tutar')]],
    body: vatData,
    theme: 'striped',
    headStyles: { fillColor: [234, 179, 8], textColor: PDF_COLORS.white },
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.row.index === 2) {
        cellData.cell.styles.fontStyle = 'bold';
        const val = data.net;
        if (val > 0) {
          cellData.cell.styles.textColor = PDF_COLORS.danger;
        } else if (val < 0) {
          cellData.cell.styles.textColor = PDF_COLORS.success;
        }
      }
    },
  });
}
