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
  
  // Durum
  isGenerating: boolean;
  progress: PdfProgress;
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
    // Durum
    isGenerating,
    progress,
  };
}

// Re-export types
export type { PdfEngineConfig, BalanceSheetData, VatReportData, SimulationData };
