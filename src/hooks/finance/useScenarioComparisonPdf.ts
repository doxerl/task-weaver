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
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Senaryo Karsilastirma Raporu'), margin, 20);
      
      // Subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${t(data.scenarioA.name)} vs ${t(data.scenarioB.name)}`, margin, 30);
      
      // Date
      doc.setFontSize(10);
      doc.text(`${t('Hazirlanma')}: ${new Date().toLocaleDateString('tr-TR')}`, margin, 38);
      
      yPos = 55;
      
      // Winner Card
      doc.setFillColor(220, 252, 231); // green-100
      doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');
      
      doc.setTextColor(22, 101, 52); // green-800
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Onerilen Senaryo'), margin + 5, yPos + 10);
      
      doc.setFontSize(16);
      doc.text(t(data.winner.scenarioName), margin + 5, yPos + 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const winText = t(`${data.winner.totalMetrics} metrikten ${Math.max(data.winner.scoreA, data.winner.scoreB)}'inde daha iyi performans`);
      doc.text(winText, margin + 5, yPos + 28);
      
      yPos += 45;
      
      // Advantages/Disadvantages
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Avantajlar:'), margin, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      data.winner.advantages.slice(0, 3).forEach((adv, i) => {
        doc.text(`+ ${t(adv)}`, margin + 5, yPos + 7 + (i * 5));
      });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(t('Dezavantajlar:'), pageWidth / 2, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      data.winner.disadvantages.slice(0, 3).forEach((dis, i) => {
        doc.text(`- ${t(dis)}`, pageWidth / 2 + 5, yPos + 7 + (i * 5));
      });
      
      yPos += 30;
      
      // Summary Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(t('Ozet Karsilastirma'), margin, yPos);
      yPos += 5;
      
      const diffRevenue = ((data.summaryA.totalRevenue - data.summaryB.totalRevenue) / data.summaryB.totalRevenue) * 100;
      const diffExpense = ((data.summaryA.totalExpense - data.summaryB.totalExpense) / data.summaryB.totalExpense) * 100;
      const diffProfit = data.summaryB.netProfit !== 0 
        ? ((data.summaryA.netProfit - data.summaryB.netProfit) / Math.abs(data.summaryB.netProfit)) * 100 
        : 0;
      const diffMargin = data.summaryA.profitMargin - data.summaryB.profitMargin;
      const diffCapital = data.summaryB.capitalNeed !== 0
        ? ((data.summaryA.capitalNeed - data.summaryB.capitalNeed) / data.summaryB.capitalNeed) * 100
        : 0;

      autoTable(doc, {
        startY: yPos,
        head: [[t('Metrik'), t(data.scenarioA.name), t(data.scenarioB.name), t('Fark')]],
        body: [
          [t('Toplam Gelir'), formatCurrency(data.summaryA.totalRevenue), formatCurrency(data.summaryB.totalRevenue), formatPercent(diffRevenue)],
          [t('Toplam Gider'), formatCurrency(data.summaryA.totalExpense), formatCurrency(data.summaryB.totalExpense), formatPercent(diffExpense)],
          [t('Net Kar'), formatCurrency(data.summaryA.netProfit), formatCurrency(data.summaryB.netProfit), formatPercent(diffProfit)],
          [t('Kar Marji'), `${data.summaryA.profitMargin.toFixed(1)}%`, `${data.summaryB.profitMargin.toFixed(1)}%`, `${diffMargin >= 0 ? '+' : ''}${diffMargin.toFixed(1)}pp`],
          [t('Sermaye Ihtiyaci'), formatCurrency(data.summaryA.capitalNeed), formatCurrency(data.summaryB.capitalNeed), formatPercent(diffCapital)],
        ],
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          3: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      // Quarterly Comparison Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Ceyreklik Karsilastirma'), margin, yPos);
      yPos += 5;
      
      autoTable(doc, {
        startY: yPos,
        head: [[t('Ceyrek'), `${t(data.scenarioA.name)} ${t('Gelir')}`, `${t(data.scenarioA.name)} ${t('Gider')}`, `${t(data.scenarioA.name)} Net`, `${t(data.scenarioB.name)} ${t('Gelir')}`, `${t(data.scenarioB.name)} ${t('Gider')}`, `${t(data.scenarioB.name)} Net`]],
        body: data.quarterlyComparison.map(q => [
          q.quarter,
          formatCurrency(q.scenarioARevenue),
          formatCurrency(q.scenarioAExpense),
          formatCurrency(q.scenarioANet),
          formatCurrency(q.scenarioBRevenue),
          formatCurrency(q.scenarioBExpense),
          formatCurrency(q.scenarioBNet),
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      });
      
      // ============== PAGE 2: INSIGHTS ==============
      doc.addPage();
      yPos = margin;
      
      // Page header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Kritik Cikarimlar'), margin, 17);
      
      yPos = 35;
      doc.setTextColor(30, 41, 59);
      
      data.insights.forEach((insight) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }
        
        // Insight card background
        const bgColor = insight.type === 'positive' ? [220, 252, 231] 
          : insight.type === 'warning' ? [254, 249, 195]
          : insight.type === 'negative' ? [254, 226, 226]
          : [241, 245, 249];
        
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 2, 2, 'F');
        
        // Icon based on type
        const icon = insight.type === 'positive' ? '[+]' 
          : insight.type === 'warning' ? '[!]'
          : insight.type === 'negative' ? '[-]'
          : '[i]';
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${icon} ${t(insight.title)}`, margin + 3, yPos + 8);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Word wrap description
        const descLines = doc.splitTextToSize(t(insight.description), pageWidth - 2 * margin - 10);
        doc.text(descLines.slice(0, 2), margin + 3, yPos + 15);
        
        yPos += 30;
      });
      
      // ============== PAGE 3: RECOMMENDATIONS ==============
      doc.addPage();
      yPos = margin;
      
      // Page header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t('Karar Onerileri'), margin, 17);
      
      yPos = 35;
      doc.setTextColor(30, 41, 59);
      
      data.recommendations.forEach((rec, index) => {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }
        
        // Recommendation card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 2, 2, 'F');
        
        // Risk badge
        const riskColor = rec.riskLevel === 'low' ? [34, 197, 94]
          : rec.riskLevel === 'medium' ? [234, 179, 8]
          : [239, 68, 68];
        
        doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.roundedRect(pageWidth - margin - 25, yPos + 3, 22, 7, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(rec.riskLevel === 'low' ? t('Dusuk Risk') : rec.riskLevel === 'medium' ? t('Orta Risk') : t('Yuksek Risk'), pageWidth - margin - 24, yPos + 8);
        
        // Title
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${t(rec.title)}`, margin + 3, yPos + 10);
        
        // Description
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const recDescLines = doc.splitTextToSize(t(rec.description), pageWidth - 2 * margin - 10);
        doc.text(recDescLines.slice(0, 2), margin + 3, yPos + 18);
        
        // Key actions
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(t('Temel Aksiyonlar:'), margin + 3, yPos + 30);
        doc.setFont('helvetica', 'normal');
        rec.keyActions.slice(0, 2).forEach((action, i) => {
          doc.text(`- ${t(action)}`, margin + 5, yPos + 36 + (i * 4));
        });
        
        // Expected outcome
        doc.setFont('helvetica', 'bold');
        doc.text(t('Beklenen Sonuc:'), pageWidth / 2, yPos + 30);
        doc.setFont('helvetica', 'normal');
        const outcomeLines = doc.splitTextToSize(t(rec.expectedOutcome), pageWidth / 2 - margin - 5);
        doc.text(outcomeLines.slice(0, 2), pageWidth / 2, yPos + 36);
        
        yPos += 55;
      });
      
      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${t('Sayfa')} ${i} / ${totalPages}`, pageWidth - margin - 15, pageHeight - 10);
        doc.text(t('PlannerDeck Senaryo Karsilastirma'), margin, pageHeight - 10);
      }
      
      // Save
      const fileName = `senaryo-karsilastirma-${t(data.scenarioA.name)}-vs-${t(data.scenarioB.name)}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
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
