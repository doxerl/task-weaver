import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState } from 'react';
import { toast } from 'sonner';
import { SimulationScenario } from '@/types/simulation';
import { normalizeTurkishText } from '@/lib/fonts/roboto';

interface ScenarioSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  capitalNeed: number;
}

interface WinnerResult {
  winner: 'A' | 'B' | 'TIE';
  scenarioName: string;
  scoreA: number;
  scoreB: number;
  totalMetrics: number;
  advantages: string[];
  disadvantages: string[];
}

interface ScenarioInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  category: 'revenue' | 'expense' | 'profit' | 'margin' | 'capital' | 'efficiency';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
}

interface DecisionRecommendation {
  id: string;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  suitableFor: string[];
  keyActions: string[];
  expectedOutcome: string;
}

interface QuarterlyComparison {
  quarter: string;
  scenarioARevenue: number;
  scenarioAExpense: number;
  scenarioANet: number;
  scenarioBRevenue: number;
  scenarioBExpense: number;
  scenarioBNet: number;
}

interface ScenarioComparisonPdfData {
  scenarioA: SimulationScenario;
  scenarioB: SimulationScenario;
  summaryA: ScenarioSummary;
  summaryB: ScenarioSummary;
  winner: WinnerResult;
  insights: ScenarioInsight[];
  recommendations: DecisionRecommendation[];
  quarterlyComparison: QuarterlyComparison[];
}

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

// Draw quarterly bar chart using jsPDF primitives
function drawQuarterlyBarChart(
  doc: jsPDF,
  data: QuarterlyComparison[],
  scenarioAName: string,
  scenarioBName: string,
  startY: number,
  t: (text: string) => string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const chartWidth = pageWidth - 2 * margin;
  const chartHeight = 90;
  const chartX = margin;
  const chartY = startY;

  // Chart background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'F');

  // Chart border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'S');

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(t('Net Kar Karsilastirmasi'), chartX + 5, chartY + 10);

  // Find min/max for scaling
  const allNetValues = data.flatMap(d => [d.scenarioANet, d.scenarioBNet]);
  const maxVal = Math.max(...allNetValues, 0);
  const minVal = Math.min(...allNetValues, 0);
  const range = Math.max(maxVal - minVal, 1);

  // Chart area dimensions
  const innerMargin = 10;
  const legendHeight = 15;
  const labelHeight = 15;
  const barAreaHeight = chartHeight - legendHeight - labelHeight - innerMargin * 2;
  const barAreaY = chartY + legendHeight + innerMargin;
  
  // Zero line position
  const zeroRatio = maxVal >= 0 && minVal < 0 ? maxVal / range : (maxVal >= 0 ? 1 : 0);
  const zeroLineY = barAreaY + zeroRatio * barAreaHeight;

  // Draw zero line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(chartX + innerMargin, zeroLineY, chartX + chartWidth - innerMargin, zeroLineY);

  // Draw zero label
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('$0', chartX + 3, zeroLineY + 2);

  // Bar dimensions
  const numQuarters = data.length;
  const groupWidth = (chartWidth - innerMargin * 2) / numQuarters;
  const barWidth = groupWidth * 0.25;
  const barGap = 3;

  // Draw bars for each quarter
  data.forEach((q, i) => {
    const groupCenterX = chartX + innerMargin + i * groupWidth + groupWidth / 2;

    // Scenario A bar (blue)
    const heightA = (Math.abs(q.scenarioANet) / range) * barAreaHeight;
    const barAX = groupCenterX - barWidth - barGap / 2;
    let barAY: number;
    
    if (q.scenarioANet >= 0) {
      barAY = zeroLineY - heightA;
    } else {
      barAY = zeroLineY;
    }
    
    doc.setFillColor(59, 130, 246); // blue-500
    if (heightA > 1) {
      doc.roundedRect(barAX, barAY, barWidth, Math.max(heightA, 2), 1, 1, 'F');
    }

    // Scenario B bar (purple)
    const heightB = (Math.abs(q.scenarioBNet) / range) * barAreaHeight;
    const barBX = groupCenterX + barGap / 2;
    let barBY: number;
    
    if (q.scenarioBNet >= 0) {
      barBY = zeroLineY - heightB;
    } else {
      barBY = zeroLineY;
    }
    
    doc.setFillColor(139, 92, 246); // violet-500
    if (heightB > 1) {
      doc.roundedRect(barBX, barBY, barWidth, Math.max(heightB, 2), 1, 1, 'F');
    }

    // Value labels above/below bars
    doc.setFontSize(6);
    
    if (heightA > 5) {
      doc.setTextColor(255, 255, 255);
      const labelYA = q.scenarioANet >= 0 ? barAY + heightA / 2 + 1 : barAY + heightA / 2 + 1;
      doc.text(formatCurrency(q.scenarioANet), barAX + barWidth / 2, labelYA, { align: 'center' });
    }
    
    if (heightB > 5) {
      doc.setTextColor(255, 255, 255);
      const labelYB = q.scenarioBNet >= 0 ? barBY + heightB / 2 + 1 : barBY + heightB / 2 + 1;
      doc.text(formatCurrency(q.scenarioBNet), barBX + barWidth / 2, labelYB, { align: 'center' });
    }

    // Quarter label
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(q.quarter, groupCenterX, chartY + chartHeight - 5, { align: 'center' });
  });

  // Legend
  const legendY = chartY + 18;
  
  // Scenario A legend
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(chartX + chartWidth - 120, legendY - 4, 8, 5, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(t(scenarioAName), chartX + chartWidth - 110, legendY);

  // Scenario B legend
  doc.setFillColor(139, 92, 246);
  doc.roundedRect(chartX + chartWidth - 60, legendY - 4, 8, 5, 1, 1, 'F');
  doc.text(t(scenarioBName), chartX + chartWidth - 50, legendY);

  return chartY + chartHeight + 10;
}

// Draw revenue/expense trend lines
function drawTrendLinesChart(
  doc: jsPDF,
  data: QuarterlyComparison[],
  startY: number,
  t: (text: string) => string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const chartWidth = pageWidth - 2 * margin;
  const chartHeight = 70;
  const chartX = margin;
  const chartY = startY;

  // Chart background
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 3, 3, 'F');

  // Title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(t('Gelir/Gider Trend Analizi'), chartX + 5, chartY + 10);

  // Find max value for scaling
  const allValues = data.flatMap(d => [
    d.scenarioARevenue, d.scenarioAExpense,
    d.scenarioBRevenue, d.scenarioBExpense
  ]);
  const maxVal = Math.max(...allValues, 1);

  // Chart area
  const innerMargin = 15;
  const topPadding = 18;
  const bottomPadding = 15;
  const lineAreaHeight = chartHeight - topPadding - bottomPadding;
  const lineAreaY = chartY + topPadding;
  
  const numPoints = data.length;
  const pointGap = (chartWidth - innerMargin * 2) / Math.max(numPoints - 1, 1);

  // Helper to get Y position
  const getY = (value: number) => lineAreaY + lineAreaHeight - (value / maxVal) * lineAreaHeight;

  // Draw lines helper
  const drawLine = (values: number[], color: [number, number, number], lineWidth: number = 1.5) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(lineWidth);
    
    for (let i = 0; i < values.length - 1; i++) {
      const x1 = chartX + innerMargin + i * pointGap;
      const y1 = getY(values[i]);
      const x2 = chartX + innerMargin + (i + 1) * pointGap;
      const y2 = getY(values[i + 1]);
      doc.line(x1, y1, x2, y2);
    }

    // Draw points
    values.forEach((val, i) => {
      const x = chartX + innerMargin + i * pointGap;
      const y = getY(val);
      doc.setFillColor(...color);
      doc.circle(x, y, 1.5, 'F');
    });
  };

  // Draw all four lines
  drawLine(data.map(d => d.scenarioARevenue), [34, 197, 94]);   // green - A revenue
  drawLine(data.map(d => d.scenarioAExpense), [239, 68, 68]);    // red - A expense
  drawLine(data.map(d => d.scenarioBRevenue), [134, 239, 172]);  // light green - B revenue
  drawLine(data.map(d => d.scenarioBExpense), [252, 165, 165]);  // light red - B expense

  // X-axis labels
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  data.forEach((q, i) => {
    const x = chartX + innerMargin + i * pointGap;
    doc.text(q.quarter, x, chartY + chartHeight - 5, { align: 'center' });
  });

  // Legend
  const legendY = chartY + chartHeight + 8;
  doc.setFontSize(6);
  
  doc.setFillColor(34, 197, 94);
  doc.circle(chartX + 10, legendY, 1.5, 'F');
  doc.setTextColor(51, 65, 85);
  doc.text('Gelir A', chartX + 14, legendY + 1);
  
  doc.setFillColor(239, 68, 68);
  doc.circle(chartX + 40, legendY, 1.5, 'F');
  doc.text('Gider A', chartX + 44, legendY + 1);
  
  doc.setFillColor(134, 239, 172);
  doc.circle(chartX + 70, legendY, 1.5, 'F');
  doc.text('Gelir B', chartX + 74, legendY + 1);
  
  doc.setFillColor(252, 165, 165);
  doc.circle(chartX + 100, legendY, 1.5, 'F');
  doc.text('Gider B', chartX + 104, legendY + 1);

  return legendY + 10;
}

// Add scenario item breakdown table
function addScenarioItemBreakdown(
  doc: jsPDF,
  scenario: SimulationScenario,
  scenarioLabel: string,
  color: [number, number, number],
  startY: number,
  t: (text: string) => string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let currentY = startY;

  // Scenario header
  doc.setFillColor(...color);
  doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 8, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(t(`${scenarioLabel}: ${scenario.name}`), margin + 3, currentY + 6);
  currentY += 12;

  // Revenue items table
  if (scenario.revenues && scenario.revenues.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(34, 197, 94);
    doc.setFont('helvetica', 'bold');
    doc.text(t('Gelir Kalemleri'), margin, currentY + 4);
    currentY += 6;

    const revenueRows = scenario.revenues.map(r => {
      const quarterly = r.projectedAmount / 4;
      // Calculate growth from base to projected
      const growthPercent = r.baseAmount > 0 
        ? ((r.projectedAmount - r.baseAmount) / r.baseAmount * 100) 
        : 0;
      
      // Use quarterly data if available, otherwise distribute evenly
      const q1 = r.projectedQuarterly?.q1 ?? quarterly;
      const q2 = r.projectedQuarterly?.q2 ?? quarterly;
      const q3 = r.projectedQuarterly?.q3 ?? quarterly;
      const q4 = r.projectedQuarterly?.q4 ?? quarterly;
      
      return [
        t(r.category),
        formatCurrency(q1),
        formatCurrency(q2),
        formatCurrency(q3),
        formatCurrency(q4),
        formatCurrency(r.projectedAmount),
        `${growthPercent.toFixed(0)}%`
      ];
    });

    // Add total row
    const totalRevenue = scenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    revenueRows.push([
      t('TOPLAM'),
      '-',
      '-',
      '-',
      '-',
      formatCurrency(totalRevenue),
      '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[t('Kalem'), 'Q1', 'Q2', 'Q3', 'Q4', t('Yillik'), t('Buyume')]],
      body: revenueRows,
      theme: 'grid',
      tableWidth: pageWidth - 2 * margin,
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: [255, 255, 255],
        fontSize: 6,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 6,
        textColor: [51, 65, 85],
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 38 },
        1: { halign: 'right', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 27 },
        6: { halign: 'right', cellWidth: 18 },
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244],
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.row.index === revenueRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 252, 231];
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Expense items table
  if (scenario.expenses && scenario.expenses.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(239, 68, 68);
    doc.setFont('helvetica', 'bold');
    doc.text(t('Gider Kalemleri'), margin, currentY + 4);
    currentY += 6;

    const expenseRows = scenario.expenses.map(e => {
      const quarterly = e.projectedAmount / 4;
      // Calculate growth from base to projected
      const growthPercent = e.baseAmount > 0 
        ? ((e.projectedAmount - e.baseAmount) / e.baseAmount * 100) 
        : 0;
      
      // Use quarterly data if available, otherwise distribute evenly
      const q1 = e.projectedQuarterly?.q1 ?? quarterly;
      const q2 = e.projectedQuarterly?.q2 ?? quarterly;
      const q3 = e.projectedQuarterly?.q3 ?? quarterly;
      const q4 = e.projectedQuarterly?.q4 ?? quarterly;
      
      return [
        t(e.category),
        formatCurrency(q1),
        formatCurrency(q2),
        formatCurrency(q3),
        formatCurrency(q4),
        formatCurrency(e.projectedAmount),
        `${growthPercent.toFixed(0)}%`
      ];
    });

    const totalExpense = scenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    expenseRows.push([
      t('TOPLAM'),
      '-',
      '-',
      '-',
      '-',
      formatCurrency(totalExpense),
      '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[t('Kalem'), 'Q1', 'Q2', 'Q3', 'Q4', t('Yillik'), t('Buyume')]],
      body: expenseRows,
      theme: 'grid',
      tableWidth: pageWidth - 2 * margin,
      headStyles: {
        fillColor: [239, 68, 68],
        textColor: [255, 255, 255],
        fontSize: 6,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 6,
        textColor: [51, 65, 85],
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 38 },
        1: { halign: 'right', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 27 },
        6: { halign: 'right', cellWidth: 18 },
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242],
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.row.index === expenseRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [254, 226, 226];
        }
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Net summary box
  const totalRevenue = scenario.revenues?.reduce((sum, r) => sum + r.projectedAmount, 0) || 0;
  const totalExpense = scenario.expenses?.reduce((sum, e) => sum + e.projectedAmount, 0) || 0;
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const boxColor = netProfit >= 0 ? [220, 252, 231] : [254, 226, 226];
  doc.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
  doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 15, 2, 2, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(t('NET KAR:'), margin + 3, currentY + 6);
  
  const textColor = netProfit >= 0 ? [22, 101, 52] : [153, 27, 27];
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  doc.text(formatCurrency(netProfit), margin + 35, currentY + 6);
  
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t('Kar Marji')}: ${profitMargin.toFixed(1)}%  |  ${t('Gelir')}: ${formatCurrency(totalRevenue)}  |  ${t('Gider')}: ${formatCurrency(totalExpense)}`, margin + 3, currentY + 12);

  return currentY + 20;
}

export function useScenarioComparisonPdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async (data: ScenarioComparisonPdfData) => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Helper to normalize Turkish text
      const t = (text: string) => normalizeTurkishText(text);

      // ============== PAGE 1: HEADER & WINNER ==============
      
      // Header background
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Senaryo Karsilastirma Raporu'), margin, 18);
      
      // Subtitle
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`${t(data.scenarioA.name)} vs ${t(data.scenarioB.name)}`, margin, 28);
      
      // Date
      doc.setFontSize(9);
      doc.text(`${t('Hazirlanma')}: ${new Date().toLocaleDateString('tr-TR')}`, margin, 35);
      
      yPos = 50;
      
      // Winner Card
      doc.setFillColor(220, 252, 231); // green-100
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F');
      
      doc.setTextColor(22, 101, 52); // green-800
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Onerilen Senaryo'), margin + 5, yPos + 8);
      
      doc.setFontSize(14);
      doc.text(t(data.winner.scenarioName), margin + 5, yPos + 18);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const winText = t(`${data.winner.totalMetrics} metrikten ${Math.max(data.winner.scoreA, data.winner.scoreB)}'inde daha iyi`);
      doc.text(winText, margin + 5, yPos + 25);
      
      yPos += 38;
      
      // Summary Table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(t('Ozet Karsilastirma'), margin, yPos);
      yPos += 5;
      
      const diffRevenue = ((data.summaryA.totalRevenue - data.summaryB.totalRevenue) / Math.max(data.summaryB.totalRevenue, 1)) * 100;
      const diffExpense = ((data.summaryA.totalExpense - data.summaryB.totalExpense) / Math.max(data.summaryB.totalExpense, 1)) * 100;
      const diffProfit = data.summaryB.netProfit !== 0 
        ? ((data.summaryA.netProfit - data.summaryB.netProfit) / Math.abs(data.summaryB.netProfit)) * 100 
        : 0;
      const diffMargin = data.summaryA.profitMargin - data.summaryB.profitMargin;

      autoTable(doc, {
        startY: yPos,
        head: [[t('Metrik'), t(data.scenarioA.name), t(data.scenarioB.name), t('Fark')]],
        body: [
          [t('Toplam Gelir'), formatCurrency(data.summaryA.totalRevenue), formatCurrency(data.summaryB.totalRevenue), formatPercent(diffRevenue)],
          [t('Toplam Gider'), formatCurrency(data.summaryA.totalExpense), formatCurrency(data.summaryB.totalExpense), formatPercent(diffExpense)],
          [t('Net Kar'), formatCurrency(data.summaryA.netProfit), formatCurrency(data.summaryB.netProfit), formatPercent(diffProfit)],
          [t('Kar Marji'), `${data.summaryA.profitMargin.toFixed(1)}%`, `${data.summaryB.profitMargin.toFixed(1)}%`, `${diffMargin >= 0 ? '+' : ''}${diffMargin.toFixed(1)}pp`],
        ],
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          3: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Quarterly Summary Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Ceyreklik Ozet'), margin, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [[t('Ceyrek'), `${t('A Net')}`, `${t('B Net')}`, t('Fark'), t('Avantaj')]],
        body: data.quarterlyComparison.map(q => {
          const diff = q.scenarioANet - q.scenarioBNet;
          return [
            q.quarter,
            formatCurrency(q.scenarioANet),
            formatCurrency(q.scenarioBNet),
            formatCurrency(diff),
            diff > 0 ? 'A' : diff < 0 ? 'B' : '-'
          ];
        }),
        theme: 'striped',
        headStyles: {
          fillColor: [100, 116, 139],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8, halign: 'center' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      });
      
      // ============== PAGE 2: SCENARIO A DETAILS ==============
      doc.addPage();
      yPos = margin;
      
      // Page header
      doc.setFillColor(59, 130, 246); // blue-500
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Senaryo A - Detayli Projeksiyon'), margin, 14);
      
      yPos = 28;
      yPos = addScenarioItemBreakdown(doc, data.scenarioA, 'Senaryo A', [59, 130, 246], yPos, t);
      
      // ============== PAGE 3: SCENARIO B DETAILS ==============
      doc.addPage();
      yPos = margin;
      
      // Page header
      doc.setFillColor(139, 92, 246); // violet-500
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Senaryo B - Detayli Projeksiyon'), margin, 14);
      
      yPos = 28;
      yPos = addScenarioItemBreakdown(doc, data.scenarioB, 'Senaryo B', [139, 92, 246], yPos, t);
      
      // ============== PAGE 4: CHARTS ==============
      doc.addPage();
      yPos = margin;
      
      // Page header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Ceyreklik Trend Grafikleri'), margin, 14);
      
      yPos = 28;
      
      // Bar chart
      yPos = drawQuarterlyBarChart(doc, data.quarterlyComparison, data.scenarioA.name, data.scenarioB.name, yPos, t);
      
      yPos += 5;
      
      // Trend lines chart
      yPos = drawTrendLinesChart(doc, data.quarterlyComparison, yPos, t);
      
      yPos += 10;
      
      // Best/Worst quarter cards
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(t('Ceyreklik Performans Ozeti'), margin, yPos);
      yPos += 6;
      
      const netDiffs = data.quarterlyComparison.map(q => ({
        quarter: q.quarter,
        diffA: q.scenarioANet,
        diffB: q.scenarioBNet,
        diff: q.scenarioANet - q.scenarioBNet,
      }));
      const bestQuarter = netDiffs.reduce((a, b) => a.diff > b.diff ? a : b);
      const worstQuarter = netDiffs.reduce((a, b) => a.diff < b.diff ? a : b);
      
      const cardWidth = (pageWidth - 2 * margin - 10) / 2;
      
      // Best quarter card
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(margin, yPos, cardWidth, 22, 2, 2, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Senaryo A En Iyi'), margin + 3, yPos + 7);
      doc.setFontSize(10);
      doc.text(`${bestQuarter.quarter}: ${formatCurrency(bestQuarter.diffA)}`, margin + 3, yPos + 16);
      
      // Worst quarter card
      doc.setFillColor(254, 226, 226);
      doc.roundedRect(margin + cardWidth + 10, yPos, cardWidth, 22, 2, 2, 'F');
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Senaryo A En Zayif'), margin + cardWidth + 13, yPos + 7);
      doc.setFontSize(10);
      doc.text(`${worstQuarter.quarter}: ${formatCurrency(worstQuarter.diffA)}`, margin + cardWidth + 13, yPos + 16);
      
      // ============== PAGE 5: INSIGHTS ==============
      doc.addPage();
      yPos = margin;
      
      // Page header
      doc.setFillColor(234, 179, 8); // amber
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Kritik Cikarimlar'), margin, 14);
      
      yPos = 28;
      doc.setTextColor(30, 41, 59);
      
      data.insights.forEach((insight) => {
        if (yPos > pageHeight - 35) {
          doc.addPage();
          yPos = margin;
        }
        
        const bgColor = insight.type === 'positive' ? [220, 252, 231] 
          : insight.type === 'warning' ? [254, 249, 195]
          : insight.type === 'negative' ? [254, 226, 226]
          : [241, 245, 249];
        
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 22, 2, 2, 'F');
        
        const icon = insight.type === 'positive' ? '+' 
          : insight.type === 'warning' ? '!'
          : insight.type === 'negative' ? '-'
          : 'i';
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`[${icon}] ${t(insight.title)}`, margin + 3, yPos + 8);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(t(insight.description), pageWidth - 2 * margin - 10);
        doc.text(descLines.slice(0, 2), margin + 3, yPos + 14);
        
        yPos += 26;
      });
      
      // ============== PAGE 6: RECOMMENDATIONS ==============
      doc.addPage();
      yPos = margin;
      
      // Page header
      doc.setFillColor(34, 197, 94); // green
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Karar Onerileri'), margin, 14);
      
      yPos = 28;
      doc.setTextColor(30, 41, 59);
      
      data.recommendations.forEach((rec, index) => {
        if (yPos > pageHeight - 55) {
          doc.addPage();
          yPos = margin;
        }
        
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 2, 2, 'F');
        
        // Risk badge
        const riskColor = rec.riskLevel === 'low' ? [34, 197, 94]
          : rec.riskLevel === 'medium' ? [234, 179, 8]
          : [239, 68, 68];
        
        doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.roundedRect(pageWidth - margin - 22, yPos + 3, 20, 6, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        const riskText = rec.riskLevel === 'low' ? t('Dusuk') : rec.riskLevel === 'medium' ? t('Orta') : t('Yuksek');
        doc.text(riskText, pageWidth - margin - 12, yPos + 7, { align: 'center' });
        
        // Title
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${t(rec.title)}`, margin + 3, yPos + 9);
        
        // Description
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const recDescLines = doc.splitTextToSize(t(rec.description), pageWidth - 2 * margin - 30);
        doc.text(recDescLines.slice(0, 2), margin + 3, yPos + 16);
        
        // Key actions
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(t('Aksiyonlar:'), margin + 3, yPos + 28);
        doc.setFont('helvetica', 'normal');
        rec.keyActions.slice(0, 2).forEach((action, i) => {
          doc.text(`- ${t(action)}`, margin + 5, yPos + 33 + (i * 4));
        });
        
        // Expected outcome
        doc.setFont('helvetica', 'bold');
        doc.text(t('Beklenen:'), pageWidth / 2, yPos + 28);
        doc.setFont('helvetica', 'normal');
        const outcomeLines = doc.splitTextToSize(t(rec.expectedOutcome), pageWidth / 2 - margin - 5);
        doc.text(outcomeLines.slice(0, 2), pageWidth / 2, yPos + 33);
        
        yPos += 50;
      });
      
      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`${t('Sayfa')} ${i} / ${totalPages}`, pageWidth - margin - 12, pageHeight - 8);
        doc.text(t('PlannerDeck Senaryo Karsilastirma'), margin, pageHeight - 8);
      }
      
      // Save
      const fileName = `senaryo-karsilastirma-${t(data.scenarioA.name)}-vs-${t(data.scenarioB.name)}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName.replace(/\s+/g, '-').toLowerCase());
      
      toast.success('PDF başarıyla indirildi');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePdf,
    isGenerating,
  };
}
