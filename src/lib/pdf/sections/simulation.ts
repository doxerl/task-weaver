// ============================================
// SİMÜLASYON BÖLÜM RENDERER
// ============================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { tr, formatUSD, formatTRY, formatPercent, createCoverPage, addSectionHeader } from '../pdfUtils';
import { PDF_COLORS } from '../pdfTypes';

// ============================================
// SİMÜLASYON PDF
// ============================================

export function renderSimulation(
  doc: jsPDF,
  data: {
    scenarioName: string;
    revenues: any[];
    expenses: any[];
    investments: any[];
    summary: any;
    assumedExchangeRate: number;
    notes?: string;
  },
  companyName: string = 'Sirket'
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // ==========================================
  // SAYFA 1: KAPAK SAYFASI
  // ==========================================
  
  // Mavi başlık bandı
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 90, 'F');
  
  // Şirket adı
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(tr(companyName.toUpperCase()), pageWidth / 2, 25, { align: 'center' });
  
  // Ana başlık
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('2026', pageWidth / 2, 50, { align: 'center' });
  doc.setFontSize(20);
  doc.text(tr('BUYUME SIMULASYONU'), pageWidth / 2, 62, { align: 'center' });
  
  // Senaryo adı
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(tr(data.scenarioName || 'Varsayilan Senaryo'), pageWidth / 2, 78, { align: 'center' });
  
  // Tarih ve kur bilgisi
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(tr(`Hazirlama Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), margin, 110);
  doc.text(tr(`Varsayilan Kur: ${data.assumedExchangeRate.toFixed(2)} TL/USD`), margin, 118);
  
  // Özet kutusu
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, 130, pageWidth - margin * 2, 80, 3, 3, 'S');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(tr('OZET METRIKLER'), margin + 5, 142);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  const summaryLines = [
    [`2025 Gercek Gelir:`, formatUSD(data.summary.base.totalRevenue)],
    [`2026 Hedef Gelir:`, formatUSD(data.summary.projected.totalRevenue)],
    [`Gelir Buyumesi:`, formatPercent(data.summary.growth.revenueGrowth)],
    [`2025 Net Kar:`, formatUSD(data.summary.base.netProfit)],
    [`2026 Net Kar:`, formatUSD(data.summary.projected.netProfit)],
    [`Kar Buyumesi:`, formatPercent(data.summary.growth.profitGrowth)],
  ];
  
  let lineY = 155;
  summaryLines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(tr(label), margin + 10, lineY);
    doc.setFont('helvetica', 'bold');
    const valueX = margin + 80;
    
    if (value.includes('+')) {
      doc.setTextColor(...PDF_COLORS.success);
    } else if (value.includes('-')) {
      doc.setTextColor(...PDF_COLORS.danger);
    }
    doc.text(value, valueX, lineY);
    doc.setTextColor(0, 0, 0);
    lineY += 10;
  });
  
  // Sermaye ihtiyacı
  const netCapitalNeed = data.summary.capitalNeeds.netCapitalNeed;
  const netCapitalTRY = netCapitalNeed * data.assumedExchangeRate;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Sermaye Ihtiyaci:'), margin + 10, lineY + 5);
  doc.setTextColor(netCapitalNeed > 0 ? 239 : 34, netCapitalNeed > 0 ? 68 : 197, netCapitalNeed > 0 ? 68 : 94);
  doc.text(`${formatUSD(Math.abs(netCapitalNeed))} (${formatTRY(Math.abs(netCapitalTRY))})`, margin + 80, lineY + 5);
  doc.setTextColor(0, 0, 0);
  
  // Notlar
  if (data.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const notesLines = doc.splitTextToSize(tr(`Not: ${data.notes}`), pageWidth - margin * 2 - 10);
    doc.text(notesLines, margin, 225);
  }
  
  // ==========================================
  // SAYFA 2: YÖNETİCİ ÖZETİ
  // ==========================================
  doc.addPage();
  addSectionHeader(doc, tr('YONETICI OZETI'));
  
  // KPI karşılaştırma tablosu
  const kpiTableData = [
    [tr('Metrik'), '2025', '2026', tr('Degisim')],
    [
      tr('Toplam Gelir'),
      formatUSD(data.summary.base.totalRevenue),
      formatUSD(data.summary.projected.totalRevenue),
      formatPercent(data.summary.growth.revenueGrowth)
    ],
    [
      tr('Toplam Gider'),
      formatUSD(data.summary.base.totalExpense),
      formatUSD(data.summary.projected.totalExpense),
      formatPercent(data.summary.growth.expenseGrowth)
    ],
    [
      tr('Net Kar'),
      formatUSD(data.summary.base.netProfit),
      formatUSD(data.summary.projected.netProfit),
      formatPercent(data.summary.growth.profitGrowth)
    ],
    [
      tr('Kar Marji'),
      `${data.summary.base.profitMargin.toFixed(1)}%`,
      `${data.summary.projected.profitMargin.toFixed(1)}%`,
      formatPercent(data.summary.projected.profitMargin - data.summary.base.profitMargin)
    ],
  ];
  
  autoTable(doc, {
    startY: 35,
    head: [kpiTableData[0]],
    body: kpiTableData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 45, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const value = String(cellData.cell.raw);
        if (value.includes('+')) {
          cellData.cell.styles.textColor = PDF_COLORS.success;
        } else if (value.includes('-')) {
          cellData.cell.styles.textColor = PDF_COLORS.danger;
        }
      }
    },
  });
  
  // ==========================================
  // SAYFA 3: GELİR PROJEKSİYONLARI
  // ==========================================
  doc.addPage();
  addSectionHeader(doc, tr('GELIR PROJEKSIYONLARI'), PDF_COLORS.success);
  
  const revenueTableData = data.revenues.map(r => [
    tr(r.category.length > 25 ? r.category.substring(0, 22) + '...' : r.category),
    formatUSD(r.baseAmount),
    formatUSD(r.projectedAmount),
    formatPercent(r.baseAmount > 0 ? ((r.projectedAmount - r.baseAmount) / r.baseAmount) * 100 : 0),
  ]);
  
  // Toplam satırı
  const totalBaseRevenue = data.revenues.reduce((sum, r) => sum + r.baseAmount, 0);
  const totalProjectedRevenue = data.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  revenueTableData.push([
    'TOPLAM',
    formatUSD(totalBaseRevenue),
    formatUSD(totalProjectedRevenue),
    formatPercent(totalBaseRevenue > 0 ? ((totalProjectedRevenue - totalBaseRevenue) / totalBaseRevenue) * 100 : 0),
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [[tr('Gelir Kalemi'), '2025', '2026', tr('Degisim')]],
    body: revenueTableData,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.success, textColor: PDF_COLORS.white },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.row.index === revenueTableData.length - 1) {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [220, 252, 231];
      }
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const value = String(cellData.cell.raw);
        if (value.includes('+')) {
          cellData.cell.styles.textColor = PDF_COLORS.success;
        } else if (value.includes('-')) {
          cellData.cell.styles.textColor = PDF_COLORS.danger;
        }
      }
    },
  });
  
  // ==========================================
  // SAYFA 4: GİDER PROJEKSİYONLARI
  // ==========================================
  doc.addPage();
  addSectionHeader(doc, tr('GIDER PROJEKSIYONLARI'), PDF_COLORS.danger);
  
  const expenseTableData = data.expenses.map(e => [
    tr(e.category.length > 25 ? e.category.substring(0, 22) + '...' : e.category),
    formatUSD(e.baseAmount),
    formatUSD(e.projectedAmount),
    formatPercent(e.baseAmount > 0 ? ((e.projectedAmount - e.baseAmount) / e.baseAmount) * 100 : 0),
  ]);
  
  // Toplam satırı
  const totalBaseExpense = data.expenses.reduce((sum, e) => sum + e.baseAmount, 0);
  const totalProjectedExpense = data.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  expenseTableData.push([
    'TOPLAM',
    formatUSD(totalBaseExpense),
    formatUSD(totalProjectedExpense),
    formatPercent(totalBaseExpense > 0 ? ((totalProjectedExpense - totalBaseExpense) / totalBaseExpense) * 100 : 0),
  ]);
  
  autoTable(doc, {
    startY: 35,
    head: [[tr('Gider Kalemi'), '2025', '2026', tr('Degisim')]],
    body: expenseTableData,
    theme: 'striped',
    headStyles: { fillColor: PDF_COLORS.danger, textColor: PDF_COLORS.white },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (cellData) => {
      if (cellData.section === 'body' && cellData.row.index === expenseTableData.length - 1) {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [254, 226, 226];
      }
      if (cellData.section === 'body' && cellData.column.index === 3) {
        const value = String(cellData.cell.raw);
        // Giderlerde artış kötü, azalma iyi
        if (value.includes('+')) {
          cellData.cell.styles.textColor = PDF_COLORS.danger;
        } else if (value.includes('-')) {
          cellData.cell.styles.textColor = PDF_COLORS.success;
        }
      }
    },
  });
  
  // ==========================================
  // SAYFA 5: YATIRIMLAR (varsa)
  // ==========================================
  if (data.investments && data.investments.length > 0) {
    doc.addPage();
    addSectionHeader(doc, tr('YATIRIM PLANI'), PDF_COLORS.warning);
    
    const investmentTableData = data.investments.map(inv => [
      tr(inv.name.length > 30 ? inv.name.substring(0, 27) + '...' : inv.name),
      formatUSD(inv.amount),
      tr(inv.timing || '-'),
      tr(inv.notes || '-'),
    ]);
    
    const totalInvestment = data.investments.reduce((sum, inv) => sum + inv.amount, 0);
    investmentTableData.push([
      'TOPLAM',
      formatUSD(totalInvestment),
      '',
      '',
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [[tr('Yatirim'), tr('Tutar'), tr('Zamanlama'), tr('Not')]],
      body: investmentTableData,
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.warning, textColor: PDF_COLORS.white },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 45 },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index === investmentTableData.length - 1) {
          cellData.cell.styles.fontStyle = 'bold';
          cellData.cell.styles.fillColor = [254, 249, 195];
        }
      },
    });
  }
}
