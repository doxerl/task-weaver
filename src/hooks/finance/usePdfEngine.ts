// ============================================
// MERKEZI PDF HOOK - HİBRİT SİSTEM
// HTML tabanlı (grafikler) + Data-driven (tablolar)
// Türkçe karakterler korunur, grafikler düzgün yakalanır
// ============================================

import { useState, useCallback, RefObject } from 'react';
import jsPDF from 'jspdf';
import { PDF_CONFIG, type PdfProgress, type PdfGenerateOptions } from '@/lib/pdf/config/pdf';
import {
  collectStylesFromOriginal,
  applyCollectedStyles,
  prepareHTMLForPdf,
  enhanceContrastForPdf,
  prepareImagesForPdf,
  cleanupOriginalElement,
} from '@/lib/pdf/core/htmlPreparation';
import {
  waitForChartsToRender,
  captureChartDimensions,
  applyChartDimensions,
  optimizeSVGsForPdf,
} from '@/lib/pdf/core/chartProcessing';
import {
  fullCleanupForPdf,
} from '@/lib/pdf/core/htmlCleaner';
import {
  downloadPdf,
} from '@/lib/pdf/core/pdfBlobHandling';
import {
  forceLightModeForPdf,
} from '@/lib/pdf/core/pdfThemeUtils';
import {
  PdfDocumentBuilder,
  createPortraitBuilder,
  createLandscapeBuilder,
  type PdfBuilderConfig,
} from '@/lib/pdf/builders';
import type { BalanceSheet } from '@/types/finance';
import type { IncomeStatementData, DetailedIncomeStatementData } from '@/types/reports';
import type { FinancialDataHub } from './useFinancialDataHub';

// ============================================
// FULL REPORT PARAMETRELERİ
// ============================================

export interface FullReportPdfParams {
  hub: FinancialDataHub;
  incomeStatement: IncomeStatementData | null;
  detailedStatement: DetailedIncomeStatementData | null;
  balanceSheet: BalanceSheet | null;
  year: number;
  formatAmount: (value: number) => string;
  currency: 'TRY' | 'USD';
  monthlyChartElement?: HTMLElement | null;
}

// ============================================
// TİP TANIMLARI
// ============================================

// ============================================
// SENARYO KARŞILAŞTIRMA PDF DATA TİPLERİ
// ============================================

export interface ScenarioComparisonPdfData {
  scenarioAName: string;
  scenarioBName: string;
  metrics: Array<{
    label: string;
    scenarioA: number;
    scenarioB: number;
    format: 'currency' | 'percent' | 'number';
    diffPercent: number;
  }>;
  winner: {
    name: string;
    score: number;
    totalMetrics: number;
    advantages: string[];
  } | null;
  quarterlyData: Array<{
    quarter: string;
    scenarioANet: number;
    scenarioBNet: number;
  }>;
  insights: Array<{
    title: string;
    description: string;
    type: 'positive' | 'negative' | 'warning' | 'neutral';
    impact: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
    suitableFor: string;
  }>;
}

export interface UsePdfEngineReturn {
  // ============================================
  // DATA-DRIVEN PDF FONKSİYONLARI (ÖNERILEN)
  // jspdf-autotable kullanır - tablolar için ideal
  // ============================================
  
  generateFullReportPdfData: (params: FullReportPdfParams) => Promise<boolean>;
  
  generateBalanceSheetPdfData: (
    balanceSheet: BalanceSheet,
    year: number,
    formatAmount: (value: number) => string,
    options?: { currency?: 'TRY' | 'USD' }
  ) => Promise<boolean>;
  
  generateIncomeStatementPdfData: (
    data: IncomeStatementData,
    year: number,
    formatAmount: (value: number) => string,
    options?: { currency?: 'TRY' | 'USD' }
  ) => Promise<boolean>;
  
  generateDetailedIncomePdfData: (
    data: DetailedIncomeStatementData,
    year: number,
    formatAmount: (value: number) => string,
    options?: { currency?: 'TRY' | 'USD' }
  ) => Promise<boolean>;
  
  generateSimulationPdfData: (
    data: {
      scenarioName: string;
      baseYear: number;
      targetYear: number;
      summary: {
        baseRevenue: number;
        projectedRevenue: number;
        baseExpense: number;
        projectedExpense: number;
        baseProfit: number;
        projectedProfit: number;
        revenueGrowth: number;
        expenseGrowth: number;
        profitGrowth: number;
      };
      revenues: Array<{
        id: string;
        name: string;
        baseAmount: number;
        projectedAmount: number;
        changePercent: number;
      }>;
      expenses: Array<{
        id: string;
        name: string;
        baseAmount: number;
        projectedAmount: number;
        changePercent: number;
      }>;
      exchangeRate: number;
    }
  ) => Promise<boolean>;
  
  generateScenarioComparisonPdfData: (data: ScenarioComparisonPdfData) => Promise<boolean>;
  
  // Builder'a doğrudan erişim (gelişmiş kullanım)
  createPdfBuilder: (config?: Partial<PdfBuilderConfig>) => PdfDocumentBuilder;
  
  // ============================================
  // HTML TABANLI PDF FONKSİYONLARI
  // Grafikler ve eski sayfalar için
  // ============================================
  
  generatePdfFromElement: (
    elementRef: RefObject<HTMLElement>,
    options: PdfGenerateOptions
  ) => Promise<boolean>;
  
  generateReportPdf: (
    elementRef: RefObject<HTMLElement>,
    reportName: string,
    year: number,
    options?: { orientation?: 'portrait' | 'landscape' }
  ) => Promise<void>;
  
  generateChartPdf: (
    elementRef: RefObject<HTMLElement>,
    chartName: string,
    options?: { orientation?: 'portrait' | 'landscape' }
  ) => Promise<void>;
  
  generateSimulationPdf: (
    elementRef: RefObject<HTMLElement>,
    scenarioName: string,
    targetYear: number
  ) => Promise<void>;
  
  generateScenarioComparisonPdf: (
    elementRef: RefObject<HTMLElement>,
    scenarioAName: string,
    scenarioBName: string
  ) => Promise<void>;
  
  generateBalanceSheetPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency?: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateBalanceChartPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateIncomeStatementPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency?: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateVatReportPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number
  ) => Promise<void>;
  
  generateFullReportPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency?: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateDashboardChartPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateDistributionChartPdf: (
    elementRef: RefObject<HTMLElement>,
    type: 'income' | 'expense',
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<void>;
  
  generateFinancingSummaryPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency?: 'TRY' | 'USD'
  ) => Promise<void>;
  
  captureChartToPdf: (
    elementRef: RefObject<HTMLElement>,
    options: {
      filename: string;
      orientation?: 'portrait' | 'landscape';
      fitToPage?: boolean;
    }
  ) => Promise<void>;
  
  // Durum
  isGenerating: boolean;
  progress: PdfProgress;
}

// ============================================
// ANA HOOK
// ============================================

export function usePdfEngine(): UsePdfEngineReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PdfProgress>({ current: 0, total: 0, stage: '' });

  // ============================================
  // ANA PDF OLUŞTURMA FONKSİYONU
  // HTML → Canvas → PDF pipeline
  // ============================================
  
  const generatePdfFromElement = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    options: PdfGenerateOptions
  ): Promise<boolean> => {
    if (!elementRef.current) {
      console.error('[PDF] Oluşturma hatası: Element ref boş');
      return false;
    }
    
    const {
      filename,
      orientation = 'portrait',
      margin = 10,
      scale = PDF_CONFIG.rendering.scale,
      waitTime = PDF_CONFIG.rendering.chartWaitTime,
      fitToPage = false,
      onProgress,
    } = options;
    
    const element = elementRef.current;
    
    // Hidden element ise geçici olarak görünür yap
    const wasHidden = element.classList.contains('hidden') || 
                      element.classList.contains('pdf-hidden-container') ||
                      window.getComputedStyle(element).display === 'none';
    
    const originalStyles = {
      display: element.style.display,
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      width: element.style.width,
      visibility: element.style.visibility,
      opacity: element.style.opacity,
    };
    
    if (wasHidden) {
      console.log('[PDF] Hidden element tespit edildi, geçici olarak görünür yapılıyor...');
      element.classList.remove('hidden');
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '1200px'; // PDF için sabit genişlik
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      
      // DOM'un güncellenmesi için kısa bekle
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsGenerating(true);
    setProgress({ current: 1, total: 5, stage: 'Sayfa hazırlanıyor...' });
    onProgress?.('Sayfa hazırlanıyor...', 20);
    
    console.log('[PDF] Stage 1: Başlatılıyor...', { filename, orientation, wasHidden });
    
    try {
      // 1. Grafiklerin render edilmesini bekle
      console.log('[PDF] Stage 2: Grafikler bekleniyor...');
      setProgress({ current: 2, total: 5, stage: 'Grafikler yükleniyor...' });
      onProgress?.('Grafikler yükleniyor...', 40);
      await waitForChartsToRender(element, waitTime);
      
      // 2. CLONE'DAN ÖNCE grafik boyutlarını yakala (kritik!)
      console.log('[PDF] Stage 3: Boyutlar ve stiller toplanıyor...');
      setProgress({ current: 3, total: 5, stage: 'Stiller toplanıyor...' });
      onProgress?.('Stiller toplanıyor...', 50);
      
      const chartDimensions = captureChartDimensions(element);
      console.log('[PDF] Yakalanan grafik boyutları:', chartDimensions.size);
      
      // 3. Orijinal elementten stilleri topla (CSS değişkenleri çözümlenmiş)
      const styleMap = collectStylesFromOriginal(element);
      console.log('[PDF] Toplanan stil sayısı:', styleMap.size);
      
      // 4. html2canvas ile yakala
      console.log('[PDF] Stage 4: Canvas oluşturuluyor...');
      setProgress({ current: 4, total: 5, stage: 'Ekran yakalanıyor...' });
      onProgress?.('Ekran yakalanıyor...', 60);
      
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        
        // Clone üzerinde işlem yap
        onclone: (_clonedDoc: Document, clonedElement: HTMLElement) => {
          console.log('[PDF] onclone: Clone işleniyor...');
          
          // Stilleri uygula
          applyCollectedStyles(clonedElement, styleMap);
          
          // Light mode'u zorla
          forceLightModeForPdf(clonedElement);
          
          // HTML hazırla
          prepareHTMLForPdf(clonedElement);
          prepareImagesForPdf(clonedElement);
          enhanceContrastForPdf(clonedElement);
          
          // KAYITLI boyutları clone'a uygula (kritik!)
          applyChartDimensions(clonedElement, chartDimensions);
          
          // SVG'leri optimize et
          optimizeSVGsForPdf(clonedElement);
          
          // Gereksiz elementleri temizle
          fullCleanupForPdf(clonedElement);
          
          console.log('[PDF] onclone: Clone işleme tamamlandı');
        },
      });
      
      // Canvas kontrolü
      if (!canvas) {
        throw new Error('html2canvas içerik yakalayamadı');
      }
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas boş - element görünür olmayabilir');
      }
      
      console.log('[PDF] Canvas boyutları:', canvas.width, 'x', canvas.height);
      
      // 5. PDF oluştur
      console.log('[PDF] Stage 5: PDF oluşturuluyor...');
      setProgress({ current: 5, total: 5, stage: 'PDF oluşturuluyor...' });
      onProgress?.('PDF oluşturuluyor...', 80);
      
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentAreaWidth = pageWidth - (margin * 2);
      const contentAreaHeight = pageHeight - (margin * 2);
      
      // Canvas'ın PDF'teki boyutları
      const imgWidth = contentAreaWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // JPEG formatı kullan - PNG'ye göre ~10x daha küçük dosya boyutu
      const jpegQuality = 0.85;
      
      if (fitToPage && imgHeight > contentAreaHeight) {
        // Tek sayfaya sığdırma modu
        const scaleRatio = contentAreaHeight / imgHeight;
        const scaledWidth = imgWidth * scaleRatio;
        const scaledHeight = contentAreaHeight;
        const xOffset = margin + (contentAreaWidth - scaledWidth) / 2;
        const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
        pdf.addImage(imgData, 'JPEG', xOffset, margin, scaledWidth, scaledHeight);
      } else if (imgHeight <= contentAreaHeight) {
        // İçerik tek sayfaya sığıyor
        const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        // Çok sayfalı mod - canvas'ı sayfalara böl
        const pageCanvasHeight = (contentAreaHeight * canvas.width) / imgWidth;
        const totalPages = Math.ceil(canvas.height / pageCanvasHeight);
        
        console.log('[PDF] Çok sayfalı mod:', totalPages, 'sayfa');
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();
          
          const sliceCanvas = document.createElement('canvas');
          const ctx = sliceCanvas.getContext('2d');
          
          if (!ctx) continue;
          
          sliceCanvas.width = canvas.width;
          const remainingHeight = canvas.height - (page * pageCanvasHeight);
          sliceCanvas.height = Math.min(pageCanvasHeight, remainingHeight);
          
          ctx.drawImage(
            canvas,
            0, page * pageCanvasHeight,
            canvas.width, sliceCanvas.height,
            0, 0,
            sliceCanvas.width, sliceCanvas.height
          );
          
          const sliceData = sliceCanvas.toDataURL('image/jpeg', jpegQuality);
          const sliceImgHeight = (sliceCanvas.height * imgWidth) / sliceCanvas.width;
          
          pdf.addImage(sliceData, 'JPEG', margin, margin, imgWidth, sliceImgHeight);
        }
      }
      
      // 6. İndir
      onProgress?.('İndiriliyor...', 100);
      
      const blob = pdf.output('blob');
      
      // Blob boyut kontrolü
      if (blob.size < 100) {
        throw new Error('Oluşturulan PDF çok küçük - muhtemelen boş');
      }
      
      console.log('[PDF] Blob boyutu:', blob.size, 'bytes');
      
      downloadPdf(blob, filename);
      
      console.log('[PDF] İndirme tetiklendi:', filename);
      
      return true;
    } catch (error) {
      console.error('[PDF] Oluşturma hatası:', error);
      return false;
    } finally {
      // Hidden element ise eski haline getir
      if (wasHidden) {
        console.log('[PDF] Element eski haline getiriliyor...');
        element.classList.add('hidden');
        element.style.display = originalStyles.display;
        element.style.position = originalStyles.position;
        element.style.left = originalStyles.left;
        element.style.top = originalStyles.top;
        element.style.width = originalStyles.width;
        element.style.visibility = originalStyles.visibility;
        element.style.opacity = originalStyles.opacity;
      }
      
      // Orijinal elementteki data-pdf-id attribute'larını temizle
      cleanupOriginalElement(element);
      
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  // ============================================
  // ÖNCEDEN YAPILANDIRILMIŞ PDF FONKSİYONLARI
  // ============================================

  const generateReportPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    reportName: string,
    year: number,
    options?: { orientation?: 'portrait' | 'landscape' }
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `${reportName}_${year}.pdf`,
      orientation: options?.orientation || 'portrait',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateChartPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    chartName: string,
    options?: { orientation?: 'portrait' | 'landscape' }
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `${chartName}.pdf`,
      orientation: options?.orientation || 'landscape',
      fitToPage: true,
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateSimulationPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    scenarioName: string,
    targetYear: number
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Simulasyon_${scenarioName}_${targetYear}.pdf`,
      orientation: 'portrait',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateScenarioComparisonPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    scenarioAName: string,
    scenarioBName: string
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Senaryo_Karsilastirma_${scenarioAName}_vs_${scenarioBName}.pdf`,
      orientation: 'landscape',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateBalanceSheetPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD' = 'TRY'
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Bilanco_${year}_${currency}.pdf`,
      orientation: 'landscape',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateIncomeStatementPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD' = 'TRY'
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Gelir_Tablosu_${year}_${currency}.pdf`,
      orientation: 'portrait',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateVatReportPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    year: number
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `KDV_Raporu_${year}.pdf`,
      orientation: 'portrait',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateFullReportPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD' = 'TRY'
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Finansal_Rapor_${year}_${currency}.pdf`,
      orientation: 'portrait',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateDashboardChartPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Dashboard_${year}_${currency}.pdf`,
      orientation: 'landscape',
      fitToPage: false,
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateDistributionChartPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    type: 'income' | 'expense',
    year: number,
    currency: 'TRY' | 'USD'
  ) => {
    const typeName = type === 'income' ? 'Gelir_Dagilimi' : 'Gider_Dagilimi';
    await generatePdfFromElement(elementRef, {
      filename: `${typeName}_${year}_${currency}.pdf`,
      orientation: 'landscape',
      fitToPage: true,
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateBalanceChartPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Bilanco_Grafik_${year}_${currency}.pdf`,
      orientation: 'landscape',
      fitToPage: true,
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  // Eski API uyumluluğu
  const captureChartToPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    options: {
      filename: string;
      orientation?: 'portrait' | 'landscape';
      fitToPage?: boolean;
    }
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: options.filename,
      orientation: options.orientation || 'landscape',
      fitToPage: options.fitToPage ?? true,
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  const generateFinancingSummaryPdf = useCallback(async (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD' = 'TRY'
  ) => {
    await generatePdfFromElement(elementRef, {
      filename: `Finansman_Ozeti_${year}_${currency}.pdf`,
      orientation: 'portrait',
      onProgress: (stage) => setProgress({ current: 1, total: 1, stage }),
    });
  }, [generatePdfFromElement]);

  // ============================================
  // DATA-DRIVEN PDF FONKSİYONLARI
  // ============================================

  /**
   * Bilanço PDF - jspdf-autotable ile
   * Sayfa sonu kontrolü, başlık tekrarı, Türkçe metin desteği
   */
  const generateBalanceSheetPdfData = useCallback(async (
    balanceSheet: BalanceSheet,
    year: number,
    formatAmount: (value: number) => string,
    options?: { currency?: 'TRY' | 'USD' }
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'Bilanço hazırlanıyor...' });
    
    try {
      const builder = createLandscapeBuilder({ margin: 8 });
      
      // Kapak sayfası olmadan doğrudan bilanço tablosu
      builder.addBalanceSheet(balanceSheet, year, formatAmount);
      
      setProgress({ current: 2, total: 2, stage: 'PDF oluşturuluyor...' });
      
      const filename = `Bilanco_${year}_${options?.currency || 'TRY'}.pdf`;
      const result = await builder.build(filename);
      
      return result;
    } catch (error) {
      console.error('[PDF] Balance sheet generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  /**
   * Tam Finansal Rapor PDF - Data-Driven (AKILLI SAYFA BÖLME)
   * html2canvas yerine jspdf-autotable kullanır
   * Tablolar otomatik olarak sayfa başlarında bölünür
   */
  const generateFullReportPdfData = useCallback(async (
    params: FullReportPdfParams
  ): Promise<boolean> => {
    const { hub, incomeStatement, detailedStatement, balanceSheet, year, formatAmount, currency } = params;
    
    setIsGenerating(true);
    setProgress({ current: 1, total: 6, stage: 'Kapak sayfası hazırlanıyor...' });
    
    try {
      const builder = createPortraitBuilder({ margin: 10 });
      
      // 1. Kapak sayfası
      builder.addCover(
        `Finansal Rapor - ${year}`,
        `Para Birimi: ${currency}`,
        new Date().toLocaleDateString('tr-TR')
      );
      
      setProgress({ current: 2, total: 6, stage: 'Özet göstergeler...' });
      
      // 2. Özet Göstergeler Tablosu (KPI'lar)
      builder.addTable({
        title: 'Finansal Özet',
        headers: ['Gösterge', 'Değer'],
        rows: [
          ['Brüt Gelir (KDV Dahil)', formatAmount(hub.incomeSummary.gross)],
          ['Net Gelir (KDV Hariç)', formatAmount(hub.incomeSummary.net)],
          ['Brüt Gider (KDV Dahil)', formatAmount(hub.expenseSummary.gross)],
          ['Net Gider (KDV Hariç)', formatAmount(hub.expenseSummary.net)],
          ['Faaliyet Kârı', formatAmount(hub.operatingProfit)],
          ['Kâr Marjı', `${hub.profitMargin.toFixed(1)}%`],
        ],
        options: {
          columnStyles: {
            0: { cellWidth: 100 },
            1: { halign: 'right' },
          }
        }
      });
      
      builder.addSpacer(5);
      
      // 3. KDV Özeti Tablosu
      builder.addTable({
        title: 'KDV Özeti',
        headers: ['Kalem', 'Tutar'],
        rows: [
          ['Hesaplanan KDV (Satışlardan)', formatAmount(hub.vatSummary.calculated)],
          ['İndirilecek KDV (Alışlardan)', formatAmount(hub.vatSummary.deductible)],
          ['Net Ödenecek/Devreden KDV', formatAmount(hub.vatSummary.net)],
        ],
        options: {
          headerColor: [34, 197, 94], // Yeşil
          columnStyles: {
            0: { cellWidth: 100 },
            1: { halign: 'right' },
          }
        }
      });
      
      builder.addSpacer(5);
      
      // 4. Finansman Özeti (varsa)
      if (hub.financingSummary.creditIn > 0 || hub.financingSummary.creditOut > 0) {
        builder.addTable({
          title: 'Finansman Özeti',
          headers: ['Kalem', 'Tutar'],
          rows: [
            ['Kredi Girişi', formatAmount(hub.financingSummary.creditIn)],
            ['Kredi Ödemesi', formatAmount(hub.financingSummary.creditOut)],
            ['Leasing Ödemesi', formatAmount(hub.financingSummary.leasingOut)],
            ['Ödenen Faiz', formatAmount(hub.financingSummary.interestPaid)],
            ['Kalan Borç', formatAmount(hub.financingSummary.remainingDebt)],
          ],
          options: {
            headerColor: [239, 68, 68], // Kırmızı
            columnStyles: {
              0: { cellWidth: 100 },
              1: { halign: 'right' },
            }
          }
        });
      }
      
      // 5. Ortak Hesabı (varsa)
      if (hub.partnerSummary.deposits > 0 || hub.partnerSummary.withdrawals > 0) {
        builder.addTable({
          title: 'Ortak Hesabı',
          headers: ['Kalem', 'Tutar'],
          rows: [
            ['Ortak Sermaye Girişi', formatAmount(hub.partnerSummary.deposits)],
            ['Ortak Çekişi', formatAmount(hub.partnerSummary.withdrawals)],
            ['Net Bakiye', formatAmount(hub.partnerSummary.balance)],
          ],
          options: {
            headerColor: [168, 85, 247], // Mor
            columnStyles: {
              0: { cellWidth: 100 },
              1: { halign: 'right' },
            }
          }
        });
      }
      
      // 6. Aylık Gelir vs Gider Grafiği (varsa)
      if (params.monthlyChartElement) {
        builder.addPageBreak();
        setProgress({ current: 3, total: 7, stage: 'Aylık trend grafiği...' });
        builder.addChart({
          title: `Aylık Gelir vs Gider - ${year}`,
          element: params.monthlyChartElement,
          options: { 
            fitToPage: true, 
            maxHeight: 120 
          }
        });
      }
      
      // Sayfa sonu - Detaylı Gelir Tablosu için
      builder.addPageBreak();
      setProgress({ current: 4, total: 6, stage: 'Detaylı gelir tablosu...' });
      
      // 7. Detaylı Gelir Tablosu
      if (detailedStatement) {
        builder.addDetailedIncomeStatement(detailedStatement, formatAmount);
      }
      
      // 8. Bilanço (varsa)
      if (balanceSheet) {
        builder.addPageBreak();
        setProgress({ current: 5, total: 6, stage: 'Bilanço hazırlanıyor...' });
        builder.addBalanceSheet(balanceSheet, year, formatAmount);
      }
      
      setProgress({ current: 6, total: 6, stage: 'PDF oluşturuluyor...' });
      
      const filename = `Finansal_Rapor_${year}_${currency}.pdf`;
      const result = await builder.build(filename);
      
      return result;
    } catch (error) {
      console.error('[PDF] Full report generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  /**
   * Gelir Tablosu PDF - jspdf-autotable ile
   */
  const generateIncomeStatementPdfData = useCallback(async (
    data: IncomeStatementData,
    year: number,
    formatAmount: (value: number) => string,
    options?: { currency?: 'TRY' | 'USD' }
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'Gelir tablosu hazırlanıyor...' });
    
    try {
      const builder = createPortraitBuilder({ margin: 10 });
      
      builder
        .addCover(
          `Gelir Tablosu - ${year}`,
          'Tekdüzen Hesap Planına Uygun',
          new Date().toLocaleDateString('tr-TR')
        )
        .addIncomeStatement(data, year, formatAmount);
      
      setProgress({ current: 2, total: 2, stage: 'PDF oluşturuluyor...' });
      
      const filename = `Gelir_Tablosu_${year}_${options?.currency || 'TRY'}.pdf`;
      const result = await builder.build(filename);
      
      return result;
    } catch (error) {
      console.error('[PDF] Income statement generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  /**
   * Detaylı Gelir Tablosu PDF - jspdf-autotable ile
   */
  const generateDetailedIncomePdfData = useCallback(async (
    data: DetailedIncomeStatementData,
    year: number,
    formatAmount: (value: number) => string,
    options?: { currency?: 'TRY' | 'USD' }
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 2, stage: 'Detaylı gelir tablosu hazırlanıyor...' });
    
    try {
      const builder = createPortraitBuilder({ margin: 10 });
      
      builder.addDetailedIncomeStatement(data, formatAmount);
      
      setProgress({ current: 2, total: 2, stage: 'PDF oluşturuluyor...' });
      
      const filename = `Detayli_Gelir_Tablosu_${year}_${options?.currency || 'TRY'}.pdf`;
      const result = await builder.build(filename);
      
      return result;
    } catch (error) {
      console.error('[PDF] Detailed income statement generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  /**
   * Simülasyon PDF - jspdf-autotable ile (YENİ)
   * Gelir ve gider projeksiyonlarını tablolar halinde oluşturur
   */
  const generateSimulationPdfData = useCallback(async (
    data: {
      scenarioName: string;
      baseYear: number;
      targetYear: number;
      summary: {
        baseRevenue: number;
        projectedRevenue: number;
        baseExpense: number;
        projectedExpense: number;
        baseProfit: number;
        projectedProfit: number;
        revenueGrowth: number;
        expenseGrowth: number;
        profitGrowth: number;
      };
      revenues: Array<{
        id: string;
        name: string;
        baseAmount: number;
        projectedAmount: number;
        changePercent: number;
      }>;
      expenses: Array<{
        id: string;
        name: string;
        baseAmount: number;
        projectedAmount: number;
        changePercent: number;
      }>;
      exchangeRate: number;
    }
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 4, stage: 'Simülasyon hazırlanıyor...' });
    
    const formatUSD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
    
    try {
      const builder = createPortraitBuilder({ margin: 10 });
      
      // Kapak sayfası
      builder.addCover(
        `${data.targetYear} Büyüme Simülasyonu`,
        data.scenarioName,
        new Date().toLocaleDateString('tr-TR')
      );
      
      setProgress({ current: 2, total: 4, stage: 'Özet oluşturuluyor...' });
      
      // Özet tablosu
      builder.addTable({
        title: 'Özet',
        headers: ['Metrik', `${data.baseYear} Gerçek`, `${data.targetYear} Projeksiyon`, 'Değişim'],
        rows: [
          ['Toplam Gelir', formatUSD(data.summary.baseRevenue), formatUSD(data.summary.projectedRevenue), formatPercent(data.summary.revenueGrowth)],
          ['Toplam Gider', formatUSD(data.summary.baseExpense), formatUSD(data.summary.projectedExpense), formatPercent(data.summary.expenseGrowth)],
          ['Net Kar', formatUSD(data.summary.baseProfit), formatUSD(data.summary.projectedProfit), formatPercent(data.summary.profitGrowth)],
        ],
        options: {
          showHead: 'everyPage',
          headerColor: [59, 130, 246],
          fontSize: 10,
        }
      });
      
      builder.addSpacer(5);
      
      setProgress({ current: 3, total: 4, stage: 'Gelir tablosu oluşturuluyor...' });
      
      // Gelir projeksiyonları tablosu
      builder.addTable({
        title: 'Gelir Projeksiyonları',
        headers: ['Kalem', `${data.baseYear}`, `${data.targetYear}`, 'Değişim'],
        rows: data.revenues.map(r => [
          r.name,
          formatUSD(r.baseAmount),
          formatUSD(r.projectedAmount),
          formatPercent(r.changePercent)
        ]),
        options: {
          showHead: 'everyPage',
          headerColor: [34, 197, 94], // Yeşil
          fontSize: 9,
          columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
          }
        }
      });
      
      builder.addSpacer(5);
      
      // Gider projeksiyonları tablosu
      builder.addTable({
        title: 'Gider Projeksiyonları',
        headers: ['Kalem', `${data.baseYear}`, `${data.targetYear}`, 'Değişim'],
        rows: data.expenses.map(e => [
          e.name,
          formatUSD(e.baseAmount),
          formatUSD(e.projectedAmount),
          formatPercent(e.changePercent)
        ]),
        options: {
          showHead: 'everyPage',
          headerColor: [239, 68, 68], // Kırmızı
          fontSize: 9,
          columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
          }
        }
      });
      
      // Footer bilgisi
      builder.addSpacer(10);
      builder.addText(
        `Varsayılan Kur: ${data.exchangeRate.toFixed(2)} TL/USD`,
        'caption',
        'right'
      );
      
      setProgress({ current: 4, total: 4, stage: 'PDF oluşturuluyor...' });
      
      const filename = `Simulasyon_${data.scenarioName.replace(/\s+/g, '_')}_${data.targetYear}.pdf`;
      const result = await builder.build(filename);
      
      return result;
    } catch (error) {
      console.error('[PDF] Simulation generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  /**
   * Senaryo Karşılaştırma PDF - jspdf-autotable ile (DATA-DRIVEN)
   * Dikey A4 formatı, düzgün sayfa bölmeleri
   */
  const generateScenarioComparisonPdfData = useCallback(async (
    data: ScenarioComparisonPdfData
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 5, stage: 'Karşılaştırma hazırlanıyor...' });
    
    const formatUSD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    
    try {
      const builder = createPortraitBuilder({ margin: 15 }); // DİKEY FORMAT
      
      // 1. Kapak sayfası
      builder.addCover(
        'Senaryo Karşılaştırma Raporu',
        `${data.scenarioAName} vs ${data.scenarioBName}`,
        new Date().toLocaleDateString('tr-TR')
      );
      
      setProgress({ current: 2, total: 5, stage: 'Özet hazırlanıyor...' });
      
      // 2. Kazanan özeti (varsa)
      if (data.winner) {
        builder.addTable({
          title: 'Önerilen Senaryo',
          headers: ['Senaryo', 'Skor', 'Avantajlar'],
          rows: [[
            data.winner.name,
            `${data.winner.score}/${data.winner.totalMetrics}`,
            data.winner.advantages.slice(0, 3).join(', ')
          ]],
          options: { 
            headerColor: [251, 191, 36], // Amber
            fontSize: 10,
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 100 }
            }
          }
        });
        builder.addSpacer(5);
      }
      
      // 3. Metrik karşılaştırma tablosu
      builder.addTable({
        title: 'Metrik Karşılaştırması',
        headers: ['Metrik', data.scenarioAName, data.scenarioBName, 'Fark'],
        rows: data.metrics.map(m => [
          m.label,
          m.format === 'currency' ? formatUSD(m.scenarioA) : 
           m.format === 'percent' ? `%${m.scenarioA.toFixed(1)}` : m.scenarioA.toFixed(0),
          m.format === 'currency' ? formatUSD(m.scenarioB) : 
           m.format === 'percent' ? `%${m.scenarioB.toFixed(1)}` : m.scenarioB.toFixed(0),
          `${m.diffPercent >= 0 ? '+' : ''}${m.diffPercent.toFixed(1)}%`
        ]),
        options: {
          showHead: 'everyPage',
          headerColor: [59, 130, 246], // Mavi
          fontSize: 10,
          columnStyles: {
            0: { cellWidth: 50 },
            1: { halign: 'right', cellWidth: 45 },
            2: { halign: 'right', cellWidth: 45 },
            3: { halign: 'right', cellWidth: 35 }
          }
        }
      });
      
      setProgress({ current: 3, total: 5, stage: 'Trend tablosu hazırlanıyor...' });
      
      // 4. Sayfa sonu + Çeyreklik trend tablosu
      builder.addPageBreak();
      
      builder.addTable({
        title: 'Çeyreklik Net Kâr Karşılaştırması',
        headers: ['Çeyrek', data.scenarioAName, data.scenarioBName, 'Fark'],
        rows: data.quarterlyData.map(q => {
          const diff = q.scenarioBNet - q.scenarioANet;
          const diffPercent = q.scenarioANet !== 0 ? ((q.scenarioBNet - q.scenarioANet) / Math.abs(q.scenarioANet)) * 100 : 0;
          return [
            q.quarter,
            formatUSD(q.scenarioANet),
            formatUSD(q.scenarioBNet),
            `${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%`
          ];
        }),
        options: { 
          headerColor: [99, 102, 241], // Indigo
          fontSize: 10,
          columnStyles: {
            0: { cellWidth: 30, halign: 'center' },
            1: { halign: 'right', cellWidth: 50 },
            2: { halign: 'right', cellWidth: 50 },
            3: { halign: 'right', cellWidth: 40 }
          }
        }
      });
      
      setProgress({ current: 4, total: 5, stage: 'Çıkarımlar hazırlanıyor...' });
      
      builder.addSpacer(8);
      
      // 5. Çıkarımlar tablosu
      if (data.insights.length > 0) {
        const impactLabels = { high: 'Kritik', medium: 'Orta', low: 'Düşük' };
        const typeLabels = { positive: 'Olumlu', negative: 'Olumsuz', warning: 'Uyarı', neutral: 'Nötr' };
        
        builder.addTable({
          title: 'Analiz Çıkarımları',
          headers: ['Başlık', 'Açıklama', 'Durum', 'Etki'],
          rows: data.insights.map(i => [
            i.title,
            i.description.length > 80 ? i.description.substring(0, 77) + '...' : i.description,
            typeLabels[i.type],
            impactLabels[i.impact]
          ]),
          options: { 
            fontSize: 9,
            headerColor: [168, 85, 247], // Mor
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 90 },
              2: { cellWidth: 25, halign: 'center' },
              3: { cellWidth: 25, halign: 'center' }
            }
          }
        });
      }
      
      // 6. Sayfa sonu + Öneriler tablosu
      if (data.recommendations.length > 0) {
        builder.addPageBreak();
        
        const riskLabels = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };
        
        builder.addTable({
          title: 'Karar Önerileri',
          headers: ['Öneri', 'Açıklama', 'Risk', 'Uygun Profil'],
          rows: data.recommendations.map(r => [
            r.title,
            r.description.length > 60 ? r.description.substring(0, 57) + '...' : r.description,
            riskLabels[r.risk],
            r.suitableFor.length > 40 ? r.suitableFor.substring(0, 37) + '...' : r.suitableFor
          ]),
          options: { 
            fontSize: 9,
            headerColor: [34, 197, 94], // Yeşil
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 60 },
              2: { cellWidth: 25, halign: 'center' },
              3: { cellWidth: 55 }
            }
          }
        });
      }
      
      // Footer
      builder.addSpacer(10);
      builder.addText(
        'Bu rapor otomatik olarak oluşturulmuştur.',
        'caption',
        'center'
      );
      
      setProgress({ current: 5, total: 5, stage: 'PDF oluşturuluyor...' });
      
      const filename = `Senaryo_Karsilastirma_${data.scenarioAName.replace(/\s+/g, '_')}_vs_${data.scenarioBName.replace(/\s+/g, '_')}.pdf`;
      const result = await builder.build(filename);
      
      return result;
    } catch (error) {
      console.error('[PDF] Scenario comparison generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  /**
   * Builder'a doğrudan erişim (gelişmiş kullanım)
   */
  const createPdfBuilder = useCallback((config?: Partial<PdfBuilderConfig>) => {
    return new PdfDocumentBuilder(config);
  }, []);

  return {
    // Data-driven (önerilen - tablolar için)
    generateFullReportPdfData,
    generateBalanceSheetPdfData,
    generateIncomeStatementPdfData,
    generateDetailedIncomePdfData,
    generateSimulationPdfData,
    generateScenarioComparisonPdfData,
    createPdfBuilder,
    
    // HTML tabanlı (grafikler ve mevcut sayfalar için)
    generateSimulationPdf,
    generateScenarioComparisonPdf,
    generateChartPdf,
    generateBalanceSheetPdf,
    generateBalanceChartPdf,
    generateIncomeStatementPdf,
    generateVatReportPdf,
    generateFullReportPdf,
    generateDashboardChartPdf,
    generateDistributionChartPdf,
    generateFinancingSummaryPdf,
    captureChartToPdf,
    generateReportPdf,
    generatePdfFromElement,
    
    // Durum
    isGenerating,
    progress,
  };
}

// ============================================
// EXPORTS
// ============================================

export type { PdfProgress, PdfGenerateOptions };
