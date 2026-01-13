import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectionItem, InvestmentItem, SimulationSummary } from '@/types/simulation';

export interface SimulationPdfData {
  scenarioName: string;
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  summary: SimulationSummary;
  assumedExchangeRate: number;
  notes: string;
}

export interface SimulationChartRefs {
  chartsContainer?: HTMLElement | null;
}

export interface SimulationPdfOptions {
  companyName?: string;
}

export interface SimulationPdfProgress {
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

const formatUSD = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const formatTRY = (n: number): string =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

const formatPercent = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

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

export function useSimulationPdf() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<SimulationPdfProgress>({ current: 0, total: 8, stage: '' });

  const generatePdf = useCallback(async (
    data: SimulationPdfData,
    chartRefs: SimulationChartRefs,
    options?: SimulationPdfOptions
  ) => {
    setIsGenerating(true);
    setProgress({ current: 0, total: 8, stage: 'Baslatiliyor...' });

    try {
      const { companyName = 'Sirket' } = options || {};

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

      // Helper to draw section header
      const drawSectionHeader = (title: string, color: [number, number, number] = [59, 130, 246]) => {
        doc.setFillColor(...color);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeTurkish(title), pageWidth / 2, 17, { align: 'center' });
      };

      // ==========================================
      // PAGE 1: COVER PAGE
      // ==========================================
      setProgress({ current: 1, total: 8, stage: 'Kapak olusturuluyor...' });

      // Blue header bar - bigger
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 90, 'F');

      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(normalizeTurkish(companyName.toUpperCase()), pageWidth / 2, 25, { align: 'center' });

      // Main title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('2026', pageWidth / 2, 50, { align: 'center' });
      doc.setFontSize(20);
      doc.text(normalizeTurkish('BUYUME SIMULASYONU'), pageWidth / 2, 62, { align: 'center' });

      // Scenario name
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(normalizeTurkish(data.scenarioName || 'Varsayilan Senaryo'), pageWidth / 2, 78, { align: 'center' });

      // Date and exchange rate info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(normalizeTurkish(`Hazirlama Tarihi: ${new Date().toLocaleDateString('tr-TR')}`), margin, 110);
      doc.text(normalizeTurkish(`Varsayilan Kur: ${data.assumedExchangeRate.toFixed(2)} TL/USD`), margin, 118);

      // Summary box
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, 130, pageWidth - margin * 2, 80, 3, 3, 'S');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(normalizeTurkish('OZET METRIKLER'), margin + 5, 142);

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
        doc.text(normalizeTurkish(label), margin + 10, lineY);
        doc.setFont('helvetica', 'bold');
        const valueX = margin + 80;
        // Color code growth values
        if (value.includes('+')) {
          doc.setTextColor(34, 197, 94);
        } else if (value.includes('-')) {
          doc.setTextColor(239, 68, 68);
        }
        doc.text(value, valueX, lineY);
        doc.setTextColor(0, 0, 0);
        lineY += 10;
      });

      // Capital needs in TRY
      const netCapitalNeed = data.summary.capitalNeeds.netCapitalNeed;
      const netCapitalTRY = netCapitalNeed * data.assumedExchangeRate;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(normalizeTurkish('Sermaye Ihtiyaci:'), margin + 10, lineY + 5);
      doc.setTextColor(netCapitalNeed > 0 ? 239 : 34, netCapitalNeed > 0 ? 68 : 197, netCapitalNeed > 0 ? 68 : 94);
      doc.text(`${formatUSD(Math.abs(netCapitalNeed))} (${formatTRY(Math.abs(netCapitalTRY))})`, margin + 80, lineY + 5);
      doc.setTextColor(0, 0, 0);

      // Notes if available
      if (data.notes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const notesLines = doc.splitTextToSize(normalizeTurkish(`Not: ${data.notes}`), pageWidth - margin * 2 - 10);
        doc.text(notesLines, margin, 225);
      }

      addPageNumber();

      // ==========================================
      // PAGE 2: EXECUTIVE SUMMARY
      // ==========================================
      doc.addPage();
      setProgress({ current: 2, total: 8, stage: 'Yonetici ozeti olusturuluyor...' });

      drawSectionHeader('YONETICI OZETI');

      // KPI comparison table
      const kpiTableData = [
        [normalizeTurkish('Metrik'), '2025', '2026', normalizeTurkish('Degisim')],
        [
          normalizeTurkish('Toplam Gelir'),
          formatUSD(data.summary.base.totalRevenue),
          formatUSD(data.summary.projected.totalRevenue),
          formatPercent(data.summary.growth.revenueGrowth)
        ],
        [
          normalizeTurkish('Toplam Gider'),
          formatUSD(data.summary.base.totalExpense),
          formatUSD(data.summary.projected.totalExpense),
          formatPercent(data.summary.growth.expenseGrowth)
        ],
        [
          normalizeTurkish('Net Kar'),
          formatUSD(data.summary.base.netProfit),
          formatUSD(data.summary.projected.netProfit),
          formatPercent(data.summary.growth.profitGrowth)
        ],
        [
          normalizeTurkish('Kar Marji'),
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
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
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
              cellData.cell.styles.textColor = [34, 197, 94];
            } else if (value.includes('-')) {
              cellData.cell.styles.textColor = [239, 68, 68];
            }
          }
        },
      });

      // Growth Indicators Visual
      let yPos = (doc as any).lastAutoTable.finalY + 20;
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(normalizeTurkish('Buyume Gostergeleri'), margin, yPos);

      yPos += 15;

      // Draw growth bars
      const drawGrowthBar = (label: string, growth: number, y: number, color: [number, number, number]) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(normalizeTurkish(label), margin, y);
        
        const barWidth = 100;
        const barHeight = 8;
        const barX = margin + 50;
        
        // Background bar
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(barX, y - 6, barWidth, barHeight, 2, 2, 'F');
        
        // Growth bar
        const growthWidth = Math.min(Math.abs(growth), 100) * (barWidth / 100);
        doc.setFillColor(...color);
        doc.roundedRect(barX, y - 6, growthWidth, barHeight, 2, 2, 'F');
        
        // Percentage text
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...color);
        doc.text(formatPercent(growth), barX + barWidth + 5, y);
      };

      drawGrowthBar('Gelir', data.summary.growth.revenueGrowth, yPos, [34, 197, 94]);
      drawGrowthBar('Gider', data.summary.growth.expenseGrowth, yPos + 20, [239, 68, 68]);
      drawGrowthBar('Kar', data.summary.growth.profitGrowth, yPos + 40, [59, 130, 246]);

      drawSectionHeader('GELIR PROJEKSIYONLARI', [34, 197, 94]);

      const revenueTableData = data.revenues.map(r => [
        normalizeTurkish(r.category.length > 25 ? r.category.substring(0, 22) + '...' : r.category),
        formatUSD(r.baseAmount),
        formatUSD(r.projectedAmount),
        formatPercent(r.baseAmount > 0 ? ((r.projectedAmount - r.baseAmount) / r.baseAmount) * 100 : 0),
      ]);

      // Add total row
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
        head: [[normalizeTurkish('Gelir Kalemi'), '2025', '2026', normalizeTurkish('Degisim')]],
        body: revenueTableData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
        },
        didParseCell: (cellData) => {
          // Bold for total row
          if (cellData.section === 'body' && cellData.row.index === revenueTableData.length - 1) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.fillColor = [220, 252, 231];
          }
          // Color for growth column
          if (cellData.section === 'body' && cellData.column.index === 3) {
            const value = String(cellData.cell.raw);
            if (value.includes('+')) {
              cellData.cell.styles.textColor = [34, 197, 94];
            } else if (value.includes('-')) {
              cellData.cell.styles.textColor = [239, 68, 68];
            }
          }
        },
      });

      addPageNumber();

      // ==========================================
      // PAGE 4: EXPENSE PROJECTIONS
      // ==========================================
      doc.addPage();
      setProgress({ current: 4, total: 8, stage: 'Gider projeksiyonlari ekleniyor...' });

      drawSectionHeader('GIDER PROJEKSIYONLARI', [239, 68, 68]);

      const expenseTableData = data.expenses.map(e => [
        normalizeTurkish(e.category.length > 25 ? e.category.substring(0, 22) + '...' : e.category),
        formatUSD(e.baseAmount),
        formatUSD(e.projectedAmount),
        formatPercent(e.baseAmount > 0 ? ((e.projectedAmount - e.baseAmount) / e.baseAmount) * 100 : 0),
      ]);

      // Add total row
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
        head: [[normalizeTurkish('Gider Kalemi'), '2025', '2026', normalizeTurkish('Degisim')]],
        body: expenseTableData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: 255 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
        },
        didParseCell: (cellData) => {
          // Bold for total row
          if (cellData.section === 'body' && cellData.row.index === expenseTableData.length - 1) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.fillColor = [254, 226, 226];
          }
          // Color for growth column
          if (cellData.section === 'body' && cellData.column.index === 3) {
            const value = String(cellData.cell.raw);
            if (value.includes('+')) {
              cellData.cell.styles.textColor = [239, 68, 68]; // Red for expense growth
            } else if (value.includes('-')) {
              cellData.cell.styles.textColor = [34, 197, 94]; // Green for expense reduction
            }
          }
        },
      });

      addPageNumber();

      // ==========================================
      // PAGE 5: CHARTS
      // ==========================================
      doc.addPage();
      setProgress({ current: 5, total: 8, stage: 'Grafikler yakalaniyor...' });

      drawSectionHeader('KARSILASTIRMA GRAFIKLERI', [59, 130, 246]);

      // Capture charts if available
      if (chartRefs.chartsContainer) {
        const chartImage = await captureChartToImage(chartRefs.chartsContainer);
        if (chartImage) {
          // Calculate dimensions to fit on page
          const imgWidth = pageWidth - margin * 2;
          const imgHeight = 180; // Approximate height
          doc.addImage(chartImage, 'PNG', margin, 35, imgWidth, imgHeight);
        } else {
          doc.setFontSize(12);
          doc.setTextColor(128, 128, 128);
          doc.text(normalizeTurkish('Grafikler yuklenemedi'), pageWidth / 2, 100, { align: 'center' });
        }
      } else {
        // Show text-based chart alternative
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(normalizeTurkish('Grafik goruntuleme icin uygulamayi ziyaret edin'), pageWidth / 2, 100, { align: 'center' });
      }

      addPageNumber();

      // ==========================================
      // PAGE 6: CAPITAL ANALYSIS
      // ==========================================
      doc.addPage();
      setProgress({ current: 6, total: 8, stage: 'Sermaye analizi ekleniyor...' });

      drawSectionHeader('SERMAYE ANALIZI', [245, 158, 11]);

      const capitalNeeds = data.summary.capitalNeeds;

      // Investment table
      if (data.investments.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(normalizeTurkish('Planlanan Yatirimlar'), margin, 40);

        const investmentTableData = data.investments.map(inv => [
          normalizeTurkish(inv.name),
          formatUSD(inv.amount),
          inv.description ? normalizeTurkish(inv.description.substring(0, 30)) : '-',
        ]);

        investmentTableData.push([
          'TOPLAM',
          formatUSD(capitalNeeds.totalInvestment),
          '',
        ]);

        autoTable(doc, {
          startY: 45,
          head: [[normalizeTurkish('Yatirim'), normalizeTurkish('Tutar'), normalizeTurkish('Aciklama')]],
          body: investmentTableData,
          theme: 'striped',
          headStyles: { fillColor: [245, 158, 11], textColor: 255 },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 40, halign: 'right' },
            2: { cellWidth: 70 },
          },
          didParseCell: (cellData) => {
            if (cellData.section === 'body' && cellData.row.index === investmentTableData.length - 1) {
              cellData.cell.styles.fontStyle = 'bold';
              cellData.cell.styles.fillColor = [254, 243, 199];
            }
          },
        });
      }

      // Capital needs summary
      yPos = data.investments.length > 0 ? (doc as any).lastAutoTable.finalY + 20 : 45;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(normalizeTurkish('Sermaye Ihtiyaci Ozeti'), margin, yPos);

      const capitalSummaryData = [
        [normalizeTurkish('Toplam Yatirim Ihtiyaci'), formatUSD(capitalNeeds.totalInvestment)],
        [normalizeTurkish('Projeksiyon Kar'), formatUSD(data.summary.projected.netProfit)],
        [normalizeTurkish('Net Sermaye Ihtiyaci'), formatUSD(capitalNeeds.netCapitalNeed)],
        [normalizeTurkish('TL Karsiliği'), formatTRY(capitalNeeds.netCapitalNeed * data.assumedExchangeRate)],
      ];

      autoTable(doc, {
        startY: yPos + 5,
        body: capitalSummaryData,
        theme: 'plain',
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (cellData) => {
          if (cellData.section === 'body' && cellData.row.index === 2) {
            const netNeed = capitalNeeds.netCapitalNeed;
            cellData.cell.styles.textColor = netNeed > 0 ? [239, 68, 68] : [34, 197, 94];
          }
          if (cellData.section === 'body' && cellData.row.index === 3) {
            cellData.cell.styles.fillColor = [243, 244, 246];
          }
        },
      });

      // Analysis text
      yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);

      const analysisText = capitalNeeds.netCapitalNeed > 0
        ? `2026 yilinda planlanan buyume ve yatirimlar icin ${formatUSD(capitalNeeds.netCapitalNeed)} (${formatTRY(capitalNeeds.netCapitalNeed * data.assumedExchangeRate)}) tutarinda ek sermaye ihtiyaci bulunmaktadir.`
        : `2026 yilinda projeksiyonlara gore ${formatUSD(Math.abs(capitalNeeds.netCapitalNeed))} tutarinda nakit fazlasi olusacaktir.`;

      const analysisLines = doc.splitTextToSize(normalizeTurkish(analysisText), pageWidth - margin * 2);
      doc.text(analysisLines, margin, yPos);

      addPageNumber();

      // ==========================================
      // PAGE 7: ASSUMPTIONS & NOTES
      // ==========================================
      doc.addPage();
      setProgress({ current: 7, total: 8, stage: 'Varsayimlar ve notlar ekleniyor...' });

      drawSectionHeader('VARSAYIMLAR VE NOTLAR', [107, 114, 128]);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(normalizeTurkish('Temel Varsayimlar'), margin, 40);

      const assumptions = [
        `Baz Yil: 2025 (Gerceklesen veriler)`,
        `Hedef Yil: 2026 (Projeksiyon)`,
        `Varsayilan Doviz Kuru: ${data.assumedExchangeRate.toFixed(2)} TL/USD`,
        `Tum tutarlar USD cinsinden gosterilmistir`,
        `Gelir projeksiyonlari kategorilere gore ayri ayri belirlenmistir`,
        `Gider projeksiyonlari kategori bazinda analiz edilmistir`,
      ];

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPos = 50;
      assumptions.forEach((assumption) => {
        doc.text(`• ${normalizeTurkish(assumption)}`, margin + 5, yPos);
        yPos += 8;
      });

      // User notes
      if (data.notes) {
        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizeTurkish('Ek Notlar'), margin, yPos);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const notesLines = doc.splitTextToSize(normalizeTurkish(data.notes), pageWidth - margin * 2);
        doc.text(notesLines, margin, yPos + 10);
      }

      // Disclaimer
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      const disclaimer = 'Bu rapor simülasyon amaclidir ve kesin tahmin niteliginde degildir. Gercek sonuclar projeksiyonlardan farklilik gosterebilir.';
      const disclaimerLines = doc.splitTextToSize(normalizeTurkish(disclaimer), pageWidth - margin * 2);
      doc.text(disclaimerLines, margin, pageHeight - 30);

      addPageNumber();

      // ==========================================
      // SAVE PDF
      // ==========================================
      setProgress({ current: 8, total: 8, stage: 'PDF kaydediliyor...' });

      const fileName = `simulasyon-${data.scenarioName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      return true;
    } catch (error) {
      console.error('PDF generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 8, stage: '' });
    }
  }, []);

  return { generatePdf, isGenerating, progress };
}
