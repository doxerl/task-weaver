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
    advancedAnalysis?: any;
    roiAnalysis?: any;
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

  // ==========================================
  // SAYFA 6: NAKİT DURUMU VE SERMAYE ANALİZİ
  // ==========================================
  if (data.advancedAnalysis) {
    doc.addPage();
    addSectionHeader(doc, tr('NAKIT DURUMU VE SERMAYE ANALIZI'), PDF_COLORS.info);
    
    const { currentCash, workingCapital, capitalNeeds } = data.advancedAnalysis;
    
    // Nakit pozisyonu tablosu
    const cashPositionData = [
      [tr('Banka Bakiyesi'), formatUSD(currentCash?.bankBalance || 0)],
      [tr('Kasa'), formatUSD(currentCash?.cashOnHand || 0)],
      [tr('Toplam Likit Varliklar'), formatUSD(currentCash?.totalLiquidity || 0)],
    ];
    
    autoTable(doc, {
      startY: 35,
      head: [[tr('Nakit Pozisyonu'), tr('Tutar (USD)')]],
      body: cashPositionData,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.info, textColor: PDF_COLORS.white },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index === cashPositionData.length - 1) {
          cellData.cell.styles.fontStyle = 'bold';
          cellData.cell.styles.fillColor = [224, 242, 254];
        }
      },
    });
    
    // İşletme sermayesi tablosu
    const workingCapitalData = [
      [tr('Aylik Operasyonel Nakit Ihtiyaci'), formatUSD(workingCapital?.monthlyOperatingCash || 0)],
      [tr('Guvenlik Tamponu (ay)'), `${workingCapital?.safetyMonths || 0} ay`],
      [tr('Guvenlik Tamponu (USD)'), formatUSD(workingCapital?.safetyBuffer || 0)],
      [tr('Net Isletme Sermayesi'), formatUSD(workingCapital?.netWorkingCapital || 0)],
    ];
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [[tr('Isletme Sermayesi'), tr('Deger')]],
      body: workingCapitalData,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' },
      },
    });
    
    // Sermaye yeterliliği durumu
    const sufficiencyStatus = capitalNeeds?.isSufficient 
      ? 'YETERLI - Mevcut kaynaklar hedefleri karsilamaktadir'
      : 'EK SERMAYE GEREKLI';
    const sufficiencyColor = capitalNeeds?.isSufficient ? PDF_COLORS.success : PDF_COLORS.danger;
    
    const capitalNeedsData = [
      [tr('Toplam Yatirim Ihtiyaci'), formatUSD(capitalNeeds?.totalInvestment || 0)],
      [tr('Mevcut Nakit'), formatUSD(capitalNeeds?.availableCash || 0)],
      [tr('Net Sermaye Acigi'), formatUSD(Math.abs(capitalNeeds?.netCapitalGap || 0))],
      [tr('En Yuksek Nakit Acigi'), formatUSD(capitalNeeds?.peakCashDeficit || 0)],
      [tr('Sermaye Durumu'), sufficiencyStatus],
    ];
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [[tr('Sermaye Ihtiyaci Analizi'), tr('Deger')]],
      body: capitalNeedsData,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.gray, textColor: PDF_COLORS.white },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 100, halign: 'right' },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index === capitalNeedsData.length - 1) {
          cellData.cell.styles.textColor = sufficiencyColor;
          cellData.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  // ==========================================
  // SAYFA 7: ÇEYREKLİK NAKİT AKIŞ TABLOSU
  // ==========================================
  if (data.advancedAnalysis?.burnRateAnalysis?.quarterlyProjectionsWithInvestment) {
    doc.addPage();
    addSectionHeader(doc, tr('CEYREKLIK NAKIT AKIS PROJEKSIYONU'), PDF_COLORS.primary);
    
    const projections = data.advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment;
    const criticalQuarter = data.advancedAnalysis.burnRateAnalysis.criticalQuarter;
    
    const cashFlowTableData = projections.map((p: any) => [
      p.quarter,
      formatUSD(p.openingBalance),
      formatUSD(p.revenue),
      formatUSD(p.expense),
      formatUSD(p.investment),
      formatUSD(p.netCashFlow),
      formatUSD(p.closingBalance),
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [[
        tr('Ceyrek'),
        tr('Acilis'),
        tr('Gelir'),
        tr('Gider'),
        tr('Yatirim'),
        tr('Net Akis'),
        tr('Kapanis'),
      ]],
      body: cashFlowTableData,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 28, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
        6: { cellWidth: 28, halign: 'right' },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body') {
          const rowData = cashFlowTableData[cellData.row.index];
          const quarter = rowData[0];
          
          // Kritik çeyreği vurgula
          if (quarter === criticalQuarter) {
            cellData.cell.styles.fillColor = [254, 226, 226];
          }
          
          // Net akış ve kapanış renklendirmesi
          if (cellData.column.index === 5 || cellData.column.index === 6) {
            const value = parseFloat(String(cellData.cell.raw).replace(/[^\d.-]/g, ''));
            if (value < 0) {
              cellData.cell.styles.textColor = PDF_COLORS.danger;
            } else if (value > 0) {
              cellData.cell.styles.textColor = PDF_COLORS.success;
            }
          }
        }
      },
    });
    
    // Burn rate özeti
    const burnRate = data.advancedAnalysis.burnRateAnalysis;
    const burnRateSummary = [
      [tr('Brut Yakim Hizi (Aylik)'), formatUSD(burnRate.grossBurnRate || 0)],
      [tr('Net Yakim Hizi (Aylik)'), formatUSD(burnRate.netBurnRate || 0)],
      [tr('Pist Suresi'), `${burnRate.runwayMonths || 0} ay`],
    ];
    
    if (criticalQuarter) {
      burnRateSummary.push([tr('Kritik Ceyrek'), criticalQuarter]);
    }
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [[tr('Yakim Hizi Analizi'), tr('Deger')]],
      body: burnRateSummary,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.warning, textColor: PDF_COLORS.white },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body') {
          const label = String(cellData.row.cells[0]?.raw || '');
          if (label.includes('Kritik')) {
            cellData.cell.styles.textColor = PDF_COLORS.danger;
            cellData.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
  }

  // ==========================================
  // SAYFA 8: ROI ANALİZİ
  // ==========================================
  if (data.roiAnalysis) {
    doc.addPage();
    addSectionHeader(doc, tr('YATIRIM GETIRI ANALIZI (ROI)'), PDF_COLORS.success);
    
    const { simpleROI, paybackPeriod, npvAnalysis, sensitivity } = data.roiAnalysis;
    
    // Temel ROI metrikleri
    const roiMetrics = [
      [tr('Basit ROI'), formatPercent(simpleROI || 0)],
      [tr('Geri Odeme Suresi'), `${paybackPeriod?.months || 0} ay`],
      [tr('1 Yil Icinde Geri Odeme'), paybackPeriod?.isWithinYear ? 'Evet' : 'Hayir'],
    ];
    
    autoTable(doc, {
      startY: 35,
      head: [[tr('ROI Metrikleri'), tr('Deger')]],
      body: roiMetrics,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.success, textColor: PDF_COLORS.white },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 1) {
          const value = String(cellData.cell.raw);
          if (value.includes('+') || value === 'Evet') {
            cellData.cell.styles.textColor = PDF_COLORS.success;
          } else if (value.includes('-') || value === 'Hayir') {
            cellData.cell.styles.textColor = PDF_COLORS.danger;
          }
        }
      },
    });
    
    // NPV Analizi
    const npvMetrics = [
      [tr('Net Bugunku Deger (NPV)'), formatUSD(npvAnalysis?.npv || 0)],
      [tr('Iskonto Orani'), `%${npvAnalysis?.discountRate || 0}`],
      [tr('Ic Verim Orani (IRR)'), formatPercent(npvAnalysis?.irr || 0)],
      [tr('NPV Durumu'), npvAnalysis?.isPositiveNPV ? 'POZITIF - Yatirim Onerilir' : 'NEGATIF - Risk Yuksek'],
    ];
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [[tr('NPV Analizi'), tr('Deger')]],
      body: npvMetrics,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 100, halign: 'right' },
      },
      didParseCell: (cellData) => {
        if (cellData.section === 'body' && cellData.row.index === npvMetrics.length - 1) {
          const value = String(cellData.cell.raw);
          cellData.cell.styles.fontStyle = 'bold';
          if (value.includes('POZITIF')) {
            cellData.cell.styles.textColor = PDF_COLORS.success;
          } else {
            cellData.cell.styles.textColor = PDF_COLORS.danger;
          }
        }
      },
    });
    
    // Duyarlılık analizi
    if (sensitivity) {
      const sensitivityData = [
        [
          tr(sensitivity.pessimistic?.name || 'Pesimist'),
          formatUSD(sensitivity.pessimistic?.profit || 0),
          formatPercent(sensitivity.pessimistic?.margin || 0),
          formatPercent(sensitivity.pessimistic?.roi || 0),
        ],
        [
          tr(sensitivity.baseline?.name || 'Baz'),
          formatUSD(sensitivity.baseline?.profit || 0),
          formatPercent(sensitivity.baseline?.margin || 0),
          formatPercent(sensitivity.baseline?.roi || 0),
        ],
        [
          tr(sensitivity.optimistic?.name || 'Optimist'),
          formatUSD(sensitivity.optimistic?.profit || 0),
          formatPercent(sensitivity.optimistic?.margin || 0),
          formatPercent(sensitivity.optimistic?.roi || 0),
        ],
      ];
      
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [[tr('Senaryo'), tr('Kar'), tr('Marj'), tr('ROI')]],
        body: sensitivityData,
        theme: 'grid',
        headStyles: { fillColor: PDF_COLORS.info, textColor: PDF_COLORS.white },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 45, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' },
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body') {
            // Pesimist kırmızı, optimist yeşil
            if (cellData.row.index === 0) {
              cellData.cell.styles.fillColor = [254, 242, 242];
            } else if (cellData.row.index === 2) {
              cellData.cell.styles.fillColor = [240, 253, 244];
            }
          }
        },
      });
    }
  }
}
