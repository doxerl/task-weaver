// ============================================
// MERKEZI PDF HOOK - HTML TABANLI
// Tüm PDF oluşturma işlemlerini yöneten tek hook
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

// ============================================
// TİP TANIMLARI
// ============================================

export interface UsePdfEngineReturn {
  // Ana PDF oluşturma fonksiyonu
  generatePdfFromElement: (
    elementRef: RefObject<HTMLElement>,
    options: PdfGenerateOptions
  ) => Promise<boolean>;
  
  // Önceden yapılandırılmış PDF fonksiyonları
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
  
  // Dashboard ve grafik PDF'leri
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
  
  generateBalanceChartPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<void>;
  
  // Eski API uyumluluğu için alias
  captureChartToPdf: (
    elementRef: RefObject<HTMLElement>,
    options: {
      filename: string;
      orientation?: 'portrait' | 'landscape';
      fitToPage?: boolean;
    }
  ) => Promise<void>;
  
  // Finansman özeti
  generateFinancingSummaryPdf: (
    elementRef: RefObject<HTMLElement>,
    year: number,
    currency?: 'TRY' | 'USD'
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
    
    setIsGenerating(true);
    setProgress({ current: 1, total: 5, stage: 'Sayfa hazırlanıyor...' });
    onProgress?.('Sayfa hazırlanıyor...', 20);
    
    console.log('[PDF] Stage 1: Başlatılıyor...', { filename, orientation });
    
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
      
      if (fitToPage && imgHeight > contentAreaHeight) {
        // Tek sayfaya sığdırma modu
        const scaleRatio = contentAreaHeight / imgHeight;
        const scaledWidth = imgWidth * scaleRatio;
        const scaledHeight = contentAreaHeight;
        const xOffset = margin + (contentAreaWidth - scaledWidth) / 2;
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', xOffset, margin, scaledWidth, scaledHeight);
      } else if (imgHeight <= contentAreaHeight) {
        // İçerik tek sayfaya sığıyor
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
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
          
          const sliceData = sliceCanvas.toDataURL('image/png', 1.0);
          const sliceImgHeight = (sliceCanvas.height * imgWidth) / sliceCanvas.width;
          
          pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceImgHeight);
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

  return {
    generatePdfFromElement,
    generateReportPdf,
    generateChartPdf,
    generateSimulationPdf,
    generateScenarioComparisonPdf,
    generateBalanceSheetPdf,
    generateIncomeStatementPdf,
    generateVatReportPdf,
    generateFullReportPdf,
    generateDashboardChartPdf,
    generateDistributionChartPdf,
    generateBalanceChartPdf,
    captureChartToPdf,
    generateFinancingSummaryPdf,
    isGenerating,
    progress,
  };
}

// ============================================
// EXPORTS
// ============================================

export type { PdfProgress, PdfGenerateOptions };
