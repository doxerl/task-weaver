// ============================================
// MERKEZI PDF HOOK
// Tüm PDF oluşturma işlemlerini yöneten tek hook
// ============================================

import { useState, useCallback, RefObject } from 'react';
import { 
  PdfEngine, 
  createPdfDocument,
} from '@/lib/pdf/pdfEngine';
import type {
  PdfEngineConfig,
  BalanceSheetData,
  VatReportData,
  SimulationData,
} from '@/lib/pdf/pdfTypes';
import type { IncomeStatementData, IncomeStatementLine } from '@/types/reports';
import { captureElementToPdf } from '@/lib/pdfCapture';

export interface PdfProgress {
  current: number;
  total: number;
  stage: string;
}

export interface UsePdfEngineReturn {
  // Tablo PDF fonksiyonları
  generateBalanceSheetPdf: (
    data: BalanceSheetData,
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      layout?: 'single' | 'detailed';
      yearlyAverageRate?: number;
      companyName?: string;
    }
  ) => Promise<void>;
  
  generateIncomeStatementPdf: (
    data: IncomeStatementData,
    lines: IncomeStatementLine[],
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      detailed?: boolean;
      yearlyAverageRate?: number;
      companyName?: string;
    }
  ) => Promise<void>;
  
  generateVatReportPdf: (
    data: VatReportData,
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      yearlyAverageRate?: number;
      formatAmount?: (n: number) => string;
    }
  ) => Promise<void>;
  
  generateSimulationPdf: (
    data: SimulationData,
    options?: {
      companyName?: string;
    }
  ) => Promise<void>;
  
  generateFullReportPdf: (
    data: {
      balanceSheet?: BalanceSheetData;
      incomeStatement?: { data: IncomeStatementData; lines: IncomeStatementLine[] };
      vatReport?: VatReportData;
    },
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      yearlyAverageRate?: number;
      companyName?: string;
    }
  ) => Promise<void>;
  
  // Grafik PDF fonksiyonları
  captureChartToPdf: (
    elementRef: RefObject<HTMLElement>,
    options: {
      filename: string;
      orientation?: 'portrait' | 'landscape';
      fitToPage?: boolean;
    }
  ) => Promise<void>;
  
  generateBalanceChartPdf: (
    chartRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateDashboardChartPdf: (
    dashboardRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateDistributionChartPdf: (
    chartRef: RefObject<HTMLElement>,
    type: 'income' | 'expense',
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<void>;
  
  // Finansman Özeti PDF
  generateFinancingSummaryPdf: (
    data: FinancingSummaryData,
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      companyName?: string;
    }
  ) => Promise<void>;
  
  // Senaryo Karşılaştırma PDF
  generateScenarioComparisonPdf: (
    data: ScenarioComparisonData,
    options?: {
      currency?: 'TRY' | 'USD';
      companyName?: string;
    }
  ) => Promise<void>;
  
  // Durum
  isGenerating: boolean;
  progress: PdfProgress;
}

// Finansman Özeti Verisi
export interface FinancingSummaryData {
  partnerDeposits: number;
  partnerWithdrawals: number;
  partnerBalance: number;
  creditIn: number;
  creditOut: number;
  leasingOut: number;
  remainingDebt: number;
}

// Senaryo Karşılaştırma Verisi
export interface ScenarioComparisonData {
  scenarioA: { name: string; summary: ScenarioSummaryData };
  scenarioB: { name: string; summary: ScenarioSummaryData };
  metrics: Array<{
    label: string;
    scenarioA: number;
    scenarioB: number;
    format: 'currency' | 'percent' | 'number';
    higherIsBetter: boolean;
  }>;
  winner?: {
    winner: 'A' | 'B' | 'TIE';
    winnerName: string;
    scoreA: number;
    scoreB: number;
    totalMetrics: number;
  };
  // Çıkarımlar (icon hariç - PDF için)
  insights?: Array<{
    type: 'positive' | 'negative' | 'neutral' | 'warning';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
  // Öneriler (icon hariç - PDF için)
  recommendations?: Array<{
    title: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
    suitableFor: string;
  }>;
  // Çeyreklik karşılaştırma
  quarterlyComparison?: Array<{
    quarter: string;
    scenarioANet: number;
    scenarioBNet: number;
  }>;
}

export interface ScenarioSummaryData {
  totalRevenue: number;
  totalExpense: number;
  totalInvestment: number;
  netProfit: number;
  profitMargin: number;
  capitalNeed: number;
}

export function usePdfEngine(): UsePdfEngineReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PdfProgress>({ current: 0, total: 0, stage: '' });

  // Bilanço PDF
  const generateBalanceSheetPdf = useCallback(async (
    data: BalanceSheetData,
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      layout?: 'single' | 'detailed';
      yearlyAverageRate?: number;
      companyName?: string;
    }
  ) => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'Bilanço hazırlanıyor...' });
    
    try {
      const layout = options?.layout || 'single';
      const engine = createPdfDocument({
        orientation: layout === 'single' ? 'landscape' : 'portrait',
        format: 'a4',
        currency: options?.currency || 'TRY',
        yearlyAverageRate: options?.yearlyAverageRate,
        companyName: options?.companyName,
        year,
      });
      
      if (layout === 'detailed') {
        // Detaylı modda kapak sayfası ekle
        engine.renderCover(
          `${year} YILI BİLANÇOSU`,
          '31 Aralık Tarihi İtibariyle',
          ['Aktif (Varlıklar)', 'Pasif (Kaynaklar)', 'Özkaynaklar']
        );
        engine.addPage();
      }
      
      setProgress({ current: 2, total: 2, stage: 'PDF oluşturuluyor...' });
      
      engine.renderBalanceSheet(data, year, layout);
      
      const filename = layout === 'single' 
        ? `Bilanco_${year}_${options?.currency || 'TRY'}.pdf`
        : `Bilanco_Detayli_${year}_${options?.currency || 'TRY'}.pdf`;
      
      engine.save(filename);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // Gelir Tablosu PDF
  const generateIncomeStatementPdf = useCallback(async (
    data: IncomeStatementData,
    lines: IncomeStatementLine[],
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      detailed?: boolean;
      yearlyAverageRate?: number;
      companyName?: string;
    }
  ) => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'Gelir tablosu hazırlanıyor...' });
    
    try {
      const engine = createPdfDocument({
        orientation: 'portrait',
        format: 'a4',
        currency: options?.currency || 'TRY',
        yearlyAverageRate: options?.yearlyAverageRate,
        companyName: options?.companyName,
        year,
      });
      
      // Kapak sayfası
      engine.renderCover(
        `${year} YILI GELİR TABLOSU`,
        '01 Ocak - 31 Aralık Dönemi',
        options?.detailed 
          ? ['Gelir Özeti', 'Gider Özeti', 'Karlılık Analizi', 'Detaylı Kalemler']
          : ['Gelir Özeti', 'Gider Özeti', 'Karlılık Analizi']
      );
      
      setProgress({ current: 2, total: 2, stage: 'PDF oluşturuluyor...' });
      
      engine.addPage();
      engine.renderIncomeStatement(data, lines, year, options?.detailed || false);
      
      const filename = options?.detailed
        ? `Gelir_Tablosu_Detayli_${year}_${options?.currency || 'TRY'}.pdf`
        : `Gelir_Tablosu_${year}_${options?.currency || 'TRY'}.pdf`;
      
      engine.save(filename);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // KDV Raporu PDF
  const generateVatReportPdf = useCallback(async (
    data: VatReportData,
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      yearlyAverageRate?: number;
      formatAmount?: (n: number) => string;
    }
  ) => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'KDV raporu hazırlanıyor...' });
    
    try {
      const engine = createPdfDocument({
        orientation: 'portrait',
        format: 'a4',
        currency: options?.currency || 'TRY',
        yearlyAverageRate: options?.yearlyAverageRate,
        year,
      });
      
      // Kapak sayfası
      engine.renderCover(
        `${year} YILI KDV RAPORU`,
        'Yıllık KDV Özeti',
        ['Hesaplanan KDV', 'İndirilecek KDV', 'Net KDV Durumu', 'Aylık Detay']
      );
      
      setProgress({ current: 2, total: 2, stage: 'PDF oluşturuluyor...' });
      
      engine.addPage();
      engine.renderVatReport(data, year, options?.formatAmount);
      
      engine.save(`KDV_Raporu_${year}_${options?.currency || 'TRY'}.pdf`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // Simülasyon PDF
  const generateSimulationPdf = useCallback(async (
    data: SimulationData,
    options?: {
      companyName?: string;
    }
  ) => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 3, stage: 'Simülasyon hazırlanıyor...' });
    
    try {
      const engine = createPdfDocument({
        orientation: 'portrait',
        format: 'a4',
        currency: 'USD',
        companyName: options?.companyName,
        year: data.targetYear,
      });
      
      setProgress({ current: 2, total: 3, stage: 'Grafikler çiziliyor...' });
      
      engine.renderSimulation(data, options?.companyName);
      
      setProgress({ current: 3, total: 3, stage: 'PDF oluşturuluyor...' });
      
      engine.save(`Simulasyon_${data.scenarioName || 'Varsayilan'}_${data.targetYear}.pdf`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // Tam Rapor PDF (Bilanço + Gelir Tablosu + KDV)
  const generateFullReportPdf = useCallback(async (
    data: {
      balanceSheet?: BalanceSheetData;
      incomeStatement?: { data: IncomeStatementData; lines: IncomeStatementLine[] };
      vatReport?: VatReportData;
    },
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      yearlyAverageRate?: number;
      companyName?: string;
    }
  ) => {
    setIsGenerating(true);
    const sections = [data.balanceSheet, data.incomeStatement, data.vatReport].filter(Boolean);
    const total = sections.length + 1; // +1 for cover
    
    try {
      setProgress({ current: 1, total, stage: 'Kapak hazırlanıyor...' });
      
      const engine = createPdfDocument({
        orientation: 'portrait',
        format: 'a4',
        currency: options?.currency || 'TRY',
        yearlyAverageRate: options?.yearlyAverageRate,
        companyName: options?.companyName,
        year,
      });
      
      const toc: string[] = [];
      if (data.balanceSheet) toc.push('Bilanço');
      if (data.incomeStatement) toc.push('Gelir Tablosu');
      if (data.vatReport) toc.push('KDV Raporu');
      
      engine.renderCover(
        `${year} YILI FİNANSAL RAPOR`,
        '01 Ocak - 31 Aralık Dönemi',
        toc
      );
      
      let step = 2;
      
      if (data.balanceSheet) {
        setProgress({ current: step++, total, stage: 'Bilanço oluşturuluyor...' });
        engine.addPage('landscape');
        engine.renderBalanceSheet(data.balanceSheet, year, 'single');
      }
      
      if (data.incomeStatement) {
        setProgress({ current: step++, total, stage: 'Gelir tablosu oluşturuluyor...' });
        engine.addPage('portrait');
        engine.renderIncomeStatement(data.incomeStatement.data, data.incomeStatement.lines, year, false);
      }
      
      if (data.vatReport) {
        setProgress({ current: step++, total, stage: 'KDV raporu oluşturuluyor...' });
        engine.addPage('portrait');
        engine.renderVatReport(data.vatReport, year);
      }
      
      engine.save(`Finansal_Rapor_${year}_${options?.currency || 'TRY'}.pdf`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // ============================================
  // GRAFİK PDF FONKSİYONLARI
  // HTML elementlerini ekran görüntüsü alarak PDF'e çevirir
  // ============================================

  // Genel grafik yakalama
  const captureChartToPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    options: {
      filename: string;
      orientation?: 'portrait' | 'landscape';
      fitToPage?: boolean;
    }
  ) => {
    if (!elementRef.current) {
      throw new Error('Element ref boş');
    }
    
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'Grafik yakalanıyor...' });
    
    try {
      const success = await captureElementToPdf(elementRef.current, {
        filename: options.filename,
        orientation: options.orientation || 'landscape',
        fitToPage: options.fitToPage ?? true,
        scale: 2,
        onProgress: (stage) => setProgress({ current: 1, total: 2, stage }),
      });
      
      if (!success) {
        throw new Error('PDF oluşturulamadı');
      }
      
      setProgress({ current: 2, total: 2, stage: 'Tamamlandı' });
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // Bilanço grafik PDF
  const generateBalanceChartPdf = useCallback(async (
    chartRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => {
    await captureChartToPdf(chartRef, {
      filename: `Bilanco_Grafik_${year}_${currency}.pdf`,
      orientation: 'landscape',
      fitToPage: true,
    });
  }, [captureChartToPdf]);

  // Dashboard grafik PDF
  const generateDashboardChartPdf = useCallback(async (
    dashboardRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => {
    await captureChartToPdf(dashboardRef, {
      filename: `Dashboard_${year}_${currency}.pdf`,
      orientation: 'landscape',
      fitToPage: false, // Çok sayfalı
    });
  }, [captureChartToPdf]);

  // Gelir/Gider dağılım grafik PDF
  const generateDistributionChartPdf = useCallback(async (
    chartRef: RefObject<HTMLElement>,
    type: 'income' | 'expense',
    year: number,
    currency: 'TRY' | 'USD'
  ) => {
    const typeName = type === 'income' ? 'Gelir_Dagilimi' : 'Gider_Dagilimi';
    await captureChartToPdf(chartRef, {
      filename: `${typeName}_${year}_${currency}.pdf`,
      orientation: 'landscape',
      fitToPage: true,
    });
  }, [captureChartToPdf]);

  // ============================================
  // FİNANSMAN ÖZETİ PDF
  // ============================================

  const generateFinancingSummaryPdf = useCallback(async (
    data: FinancingSummaryData,
    year: number,
    options?: {
      currency?: 'TRY' | 'USD';
      companyName?: string;
    }
  ) => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'Finansman özeti hazırlanıyor...' });
    
    try {
      const engine = createPdfDocument({
        orientation: 'portrait',
        format: 'a4',
        currency: options?.currency || 'TRY',
        companyName: options?.companyName,
        year,
      });
      
      // Kapak sayfası
      engine.renderCover(
        `${year} YILI FİNANSMAN ÖZETİ`,
        'Ortak Cari ve Kredi Takibi',
        ['Ortak Cari Hesap', 'Kredi ve Finansman', 'Borç Durumu']
      );
      
      engine.addPage();
      
      setProgress({ current: 2, total: 2, stage: 'PDF oluşturuluyor...' });
      
      // renderFinancingSummary fonksiyonunu kullan
      const doc = engine.getDoc();
      const { renderFinancingSummary } = await import('@/lib/pdf/sections/common');
      
      const formatFn = (n: number) => {
        const curr = options?.currency || 'TRY';
        return new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: curr,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(n);
      };
      
      renderFinancingSummary(doc, data, formatFn);
      
      engine.save(`Finansman_Ozeti_${year}_${options?.currency || 'TRY'}.pdf`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // ============================================
  // SENARYO KARŞILAŞTIRMA PDF
  // ============================================

  const generateScenarioComparisonPdf = useCallback(async (
    data: ScenarioComparisonData,
    options?: {
      currency?: 'TRY' | 'USD';
      companyName?: string;
    }
  ) => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 4, stage: 'Karsilastirma hazirlaniyor...' });
    
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      
      const formatCurrency = (n: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(n);
      };
      
      // ============================================
      // SAYFA 1: Metrikler ve Ozet
      // ============================================
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SENARYO KARSILASTIRMA', 148, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.scenarioA.name} vs ${data.scenarioB.name}`, 148, 22, { align: 'center' });
      
      setProgress({ current: 2, total: 4, stage: 'Metrikler ekleniyor...' });
      
      // Karsilastirma tablosu
      const tableData = data.metrics.map(m => {
        const formatVal = (v: number) => {
          if (m.format === 'currency') return formatCurrency(v);
          if (m.format === 'percent') return `%${v.toFixed(1)}`;
          return v.toLocaleString('tr-TR');
        };
        
        const diff = m.scenarioB - m.scenarioA;
        const diffStr = m.format === 'currency' 
          ? formatCurrency(diff)
          : m.format === 'percent' 
            ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`
            : `${diff >= 0 ? '+' : ''}${diff.toLocaleString('tr-TR')}`;
        
        return [m.label, formatVal(m.scenarioA), formatVal(m.scenarioB), diffStr];
      });
      
      autoTable(doc, {
        startY: 30,
        head: [['Metrik', data.scenarioA.name, data.scenarioB.name, 'Fark']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 55, halign: 'right' },
          2: { cellWidth: 55, halign: 'right' },
          3: { cellWidth: 45, halign: 'right' },
        },
      });
      
      // Kazanan ozeti
      if (data.winner && data.winner.winner !== 'TIE') {
        const yPos = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text(`Onerilen: ${data.winner.winnerName} (${data.winner.scoreA > data.winner.scoreB ? data.winner.scoreA : data.winner.scoreB}/${data.winner.totalMetrics} metrik)`, 15, yPos);
        doc.setTextColor(0, 0, 0);
      }
      
      // Ozet tablosu
      const summaryY = (doc as any).lastAutoTable.finalY + 30;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Senaryo Ozetleri', 15, summaryY);
      
      const summaryData = [
        ['Toplam Gelir', formatCurrency(data.scenarioA.summary.totalRevenue), formatCurrency(data.scenarioB.summary.totalRevenue)],
        ['Toplam Gider', formatCurrency(data.scenarioA.summary.totalExpense), formatCurrency(data.scenarioB.summary.totalExpense)],
        ['Net Kar', formatCurrency(data.scenarioA.summary.netProfit), formatCurrency(data.scenarioB.summary.netProfit)],
        ['Kar Marji', `%${data.scenarioA.summary.profitMargin.toFixed(1)}`, `%${data.scenarioB.summary.profitMargin.toFixed(1)}`],
        ['Sermaye Ihtiyaci', formatCurrency(data.scenarioA.summary.capitalNeed), formatCurrency(data.scenarioB.summary.capitalNeed)],
      ];
      
      autoTable(doc, {
        startY: summaryY + 5,
        head: [['', data.scenarioA.name, data.scenarioB.name]],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
        margin: { left: 15, right: 15 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 50, halign: 'right' },
        },
      });
      
      // ============================================
      // SAYFA 2: Ceyreklik Trend
      // ============================================
      if (data.quarterlyComparison && data.quarterlyComparison.length > 0) {
        doc.addPage('landscape');
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('CEYREKLIK NET KAR KARSILASTIRMASI', 148, 15, { align: 'center' });
        
        const quarterlyData = data.quarterlyComparison.map(q => {
          const diff = q.scenarioBNet - q.scenarioANet;
          return [
            q.quarter,
            formatCurrency(q.scenarioANet),
            formatCurrency(q.scenarioBNet),
            formatCurrency(diff),
            diff > 0 ? 'B' : diff < 0 ? 'A' : '-',
          ];
        });
        
        // Yillik toplamlar
        const totalA = data.quarterlyComparison.reduce((sum, q) => sum + q.scenarioANet, 0);
        const totalB = data.quarterlyComparison.reduce((sum, q) => sum + q.scenarioBNet, 0);
        const totalDiff = totalB - totalA;
        
        quarterlyData.push([
          'TOPLAM',
          formatCurrency(totalA),
          formatCurrency(totalB),
          formatCurrency(totalDiff),
          totalDiff > 0 ? 'B' : totalDiff < 0 ? 'A' : '-',
        ]);
        
        autoTable(doc, {
          startY: 25,
          head: [['Ceyrek', data.scenarioA.name, data.scenarioB.name, 'Fark', 'Kazanan']],
          body: quarterlyData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
          margin: { left: 30, right: 30 },
          columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 50, halign: 'right' },
            2: { cellWidth: 50, halign: 'right' },
            3: { cellWidth: 45, halign: 'right' },
            4: { cellWidth: 35, halign: 'center' },
          },
          didParseCell: (data) => {
            // Son satir (TOPLAM) kalin yap
            if (data.row.index === quarterlyData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [240, 240, 240];
            }
          },
        });
      }
      
      setProgress({ current: 3, total: 4, stage: 'Cikarimlar ekleniyor...' });
      
      // ============================================
      // SAYFA 3: Cikarimlar (Insights)
      // ============================================
      if (data.insights && data.insights.length > 0) {
        doc.addPage('landscape');
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('ANALIZ VE CIKARIMLAR', 148, 15, { align: 'center' });
        
        const impactLabels = { high: 'Kritik', medium: 'Orta', low: 'Dusuk' };
        const typeLabels = { 
          positive: 'Olumlu', 
          negative: 'Olumsuz', 
          warning: 'Uyari', 
          neutral: 'Notr' 
        };
        
        const insightsData = data.insights.map(insight => [
          typeLabels[insight.type],
          insight.title,
          impactLabels[insight.impact],
          insight.description,
          insight.recommendation || '-',
        ]);
        
        autoTable(doc, {
          startY: 25,
          head: [['Tip', 'Baslik', 'Etki', 'Aciklama', 'Oneri']],
          body: insightsData,
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
          margin: { left: 10, right: 10 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 40 },
            2: { cellWidth: 20 },
            3: { cellWidth: 90 },
            4: { cellWidth: 85 },
          },
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const type = data.cell.raw as string;
              if (type === 'Olumlu') {
                data.cell.styles.textColor = [34, 197, 94];
              } else if (type === 'Olumsuz') {
                data.cell.styles.textColor = [239, 68, 68];
              } else if (type === 'Uyari') {
                data.cell.styles.textColor = [245, 158, 11];
              }
            }
          },
        });
      }
      
      // ============================================
      // SAYFA 4: Oneriler (Recommendations)
      // ============================================
      if (data.recommendations && data.recommendations.length > 0) {
        doc.addPage('landscape');
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('KARAR ONERILERI', 148, 15, { align: 'center' });
        
        const riskLabels = { low: 'Dusuk', medium: 'Orta', high: 'Yuksek' };
        
        const recommendationsData = data.recommendations.map(rec => [
          rec.title,
          riskLabels[rec.risk],
          rec.description,
          rec.suitableFor,
        ]);
        
        autoTable(doc, {
          startY: 25,
          head: [['Strateji', 'Risk', 'Aciklama', 'Uygun Profil']],
          body: recommendationsData,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
          margin: { left: 15, right: 15 },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 100 },
            3: { cellWidth: 85 },
          },
          styles: {
            fontSize: 9,
            cellPadding: 4,
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
              const risk = data.cell.raw as string;
              if (risk === 'Dusuk') {
                data.cell.styles.textColor = [34, 197, 94];
              } else if (risk === 'Orta') {
                data.cell.styles.textColor = [245, 158, 11];
              } else if (risk === 'Yuksek') {
                data.cell.styles.textColor = [239, 68, 68];
              }
            }
          },
        });
      }
      
      setProgress({ current: 4, total: 4, stage: 'PDF kaydediliyor...' });
      
      doc.save(`Senaryo_Karsilastirma_${data.scenarioA.name}_vs_${data.scenarioB.name}.pdf`);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  return {
    // Tablo PDF'leri
    generateBalanceSheetPdf,
    generateIncomeStatementPdf,
    generateVatReportPdf,
    generateSimulationPdf,
    generateFullReportPdf,
    // Grafik PDF'leri
    captureChartToPdf,
    generateBalanceChartPdf,
    generateDashboardChartPdf,
    generateDistributionChartPdf,
    // Finansman ve Karşılaştırma PDF'leri
    generateFinancingSummaryPdf,
    generateScenarioComparisonPdf,
    // Durum
    isGenerating,
    progress,
  };
}

// Re-export types
export type { PdfEngineConfig, BalanceSheetData, VatReportData, SimulationData };
