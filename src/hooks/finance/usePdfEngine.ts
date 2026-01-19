// ============================================
// MERKEZI PDF HOOK - HİBRİT SİSTEM
// HTML tabanlı (grafikler) + Data-driven (tablolar)
// Türkçe karakterler korunur, grafikler düzgün yakalanır
// ============================================

import { useState, useCallback, RefObject } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_CONFIG, type PdfProgress, type PdfGenerateOptions } from '@/lib/pdf/config/pdf';
import {
  collectStylesFromOriginal,
  applyCollectedStyles,
  prepareHTMLForPdf,
  enhanceContrastForPdf,
  prepareImagesForPdf,
  cleanupOriginalElement,
  fixTextSpacingForPdf,
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
import type { CashFlowStatement } from './useCashFlowStatement';

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

// ============================================
// PROFESYONEL SUNUM PDF TİPLERİ (YATAY A4)
// ============================================

export interface ScenarioPresentationPdfData {
  // Senaryo Bilgileri
  scenarioA: {
    id: string;
    name: string;
    targetYear: number;
    summary: { revenue: number; expense: number; profit: number; margin: number };
  };
  scenarioB: {
    id: string;
    name: string;
    targetYear: number;
    summary: { revenue: number; expense: number; profit: number; margin: number };
  };
  
  // Metrikler
  metrics: Array<{
    label: string;
    scenarioA: number;
    scenarioB: number;
    format: 'currency' | 'percent' | 'number';
    diffPercent: number;
    isPositive: boolean;
  }>;
  
  // Çeyreklik veriler
  quarterlyData: Array<{
    quarter: string;
    scenarioANet: number;
    scenarioBNet: number;
    scenarioACumulative: number;
    scenarioBCumulative: number;
  }>;
  
  // Yatırım analizi
  capitalAnalysis?: {
    scenarioANeed: number;
    scenarioASelfSustaining: boolean;
    scenarioBNeed: number;
    scenarioBSelfSustaining: boolean;
    burnRate: number;
    runway: number;
    criticalQuarter: string;
    opportunityCost: number;
  };
  
  // Deal konfigürasyonu
  dealConfig?: {
    investmentAmount: number;
    equityPercentage: number;
    sectorMultiple: number;
  };
  
  // Exit plan
  exitPlan?: {
    postMoneyValuation: number;
    exitValue: number;
    investorReturn: number;
    founderRetention: number;
  };
  
  // AI Analiz
  insights?: Array<{
    category: string;
    severity: string;
    title: string;
    description: string;
  }>;
  recommendations?: Array<{
    title: string;
    description: string;
    risk: string;
    priority: number;
  }>;
  
  // Pitch Deck (opsiyonel)
  pitchDeck?: {
    executiveSummary: string;
    slides: Array<{
      slideNumber: number;
      title: string;
      bullets: string[];
    }>;
  };
  
  // Grafik elementleri (capture için)
  chartElements?: {
    quarterlyChart: HTMLElement | null;
    cumulativeChart: HTMLElement | null;
  };
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
        quarterly?: {
          q1: number;
          q2: number;
          q3: number;
          q4: number;
        };
      }>;
      expenses: Array<{
        id: string;
        name: string;
        baseAmount: number;
        projectedAmount: number;
        changePercent: number;
        quarterly?: {
          q1: number;
          q2: number;
          q3: number;
          q4: number;
        };
      }>;
      exchangeRate: number;
      chartsElement?: HTMLElement | null;
    }
  ) => Promise<boolean>;
  
  generateScenarioComparisonPdfData: (data: ScenarioComparisonPdfData) => Promise<boolean>;
  
  generateScenarioPresentationPdf: (data: ScenarioPresentationPdfData) => Promise<boolean>;
  
  generateCashFlowPdfData: (
    cashFlowStatement: CashFlowStatement,
    year: number,
    formatAmount: (value: number) => string
  ) => Promise<boolean>;
  
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
  
  generateDashboardPdfSmart: (
    elements: {
      trendChart?: HTMLElement | null;
      revenueChart?: HTMLElement | null;
      expenseChart?: HTMLElement | null;
    },
    year: number,
    currency: 'TRY' | 'USD'
  ) => Promise<boolean>;
  
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
      
      // 2. PDF oluştur (Landscape A4: 297mm x 210mm)
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      console.log('[PDF] Sayfa boyutları:', pageWidth, 'x', pageHeight, 'mm');
      
      // 3. AKILLI SAYFA BÖLME: page-break-after sınıflı elementleri bul
      const pageBreakElements = element.querySelectorAll('.page-break-after');
      const allSections: HTMLElement[] = [];
      
      if (pageBreakElements.length > 0) {
        console.log('[PDF] page-break-after ile işaretlenmiş bölümler bulundu:', pageBreakElements.length);
        
        // page-break-after ile işaretlenmiş bölümleri topla
        pageBreakElements.forEach(section => {
          allSections.push(section as HTMLElement);
        });
        
        // Son section (page-break olmadan) - wrapper'ın son çocuğu
        const wrapper = element.querySelector(':scope > div');
        if (wrapper) {
          const lastChild = wrapper.lastElementChild;
          if (lastChild && !lastChild.classList.contains('page-break-after')) {
            allSections.push(lastChild as HTMLElement);
          }
        }
      } else {
        // Page break yoksa, tüm elementi tek section olarak al (eski davranış)
        allSections.push(element);
      }
      
      console.log('[PDF] Toplam sayfa sayısı:', allSections.length);
      
      // 4. Her section'ı ayrı sayfa olarak yakala
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        
        if (i > 0) {
          pdf.addPage();
        }
        
        const progressPercent = 30 + (i * 50 / allSections.length);
        setProgress({ current: 3, total: 5, stage: `Sayfa ${i + 1}/${allSections.length} yakalanıyor...` });
        onProgress?.(`Sayfa ${i + 1}/${allSections.length} yakalanıyor...`, progressPercent);
        
        // Section boyutlarını ve stillerini kaydet
        const chartDimensions = captureChartDimensions(section);
        const styleMap = collectStylesFromOriginal(section);
        
        console.log(`[PDF] Sayfa ${i + 1}: Grafik boyutları: ${chartDimensions.size}, Stiller: ${styleMap.size}`);
        
        // Section'ı canvas'a çevir
        const canvas = await html2canvas(section, {
          scale: scale,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: section.scrollWidth,
          height: section.scrollHeight,
          
          onclone: (_clonedDoc: Document, clonedSection: HTMLElement) => {
            // Stilleri uygula
            applyCollectedStyles(clonedSection, styleMap);
            
            // Light mode'u zorla
            forceLightModeForPdf(clonedSection);
            
            // Text spacing fix - kelime aralıklarını düzelt
            fixTextSpacingForPdf(clonedSection);
            
            // HTML hazırla
            prepareHTMLForPdf(clonedSection);
            prepareImagesForPdf(clonedSection);
            enhanceContrastForPdf(clonedSection);
            
            // KAYITLI boyutları clone'a uygula
            applyChartDimensions(clonedSection, chartDimensions);
            
            // SVG'leri optimize et
            optimizeSVGsForPdf(clonedSection);
            
            // Gereksiz elementleri temizle
            fullCleanupForPdf(clonedSection);
          },
        });
        
        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          console.warn(`[PDF] Sayfa ${i + 1} boş veya yakalanamadı, atlanıyor...`);
          continue;
        }
        
        console.log(`[PDF] Sayfa ${i + 1} canvas boyutları: ${canvas.width}x${canvas.height}`);
        
        // 5. Canvas'ı sayfaya sığdır (aspect ratio koruyarak)
        const aspectRatio = canvas.width / canvas.height;
        let imgWidth = contentWidth;
        let imgHeight = imgWidth / aspectRatio;
        
        // Yükseklik fazlaysa, yüksekliğe göre ölçekle
        if (imgHeight > contentHeight) {
          imgHeight = contentHeight;
          imgWidth = imgHeight * aspectRatio;
        }
        
        // fitToPage modunda bile aspect ratio koru
        if (fitToPage) {
          const scaleToFit = Math.min(contentWidth / (canvas.width / scale), contentHeight / (canvas.height / scale));
          imgWidth = (canvas.width / scale) * scaleToFit;
          imgHeight = (canvas.height / scale) * scaleToFit;
        }
        
        // Sayfada ortala
        const xOffset = margin + (contentWidth - imgWidth) / 2;
        const yOffset = margin + (contentHeight - imgHeight) / 2;
        
        // JPEG formatı kullan
        const jpegQuality = 0.92;
        const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
        
        console.log(`[PDF] Sayfa ${i + 1}: ${imgWidth.toFixed(0)}x${imgHeight.toFixed(0)}mm konumda (${xOffset.toFixed(0)}, ${yOffset.toFixed(0)})`);
      }
      
      // 6. İndir
      setProgress({ current: 5, total: 5, stage: 'PDF oluşturuluyor...' });
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
        quarterly?: {
          q1: number;
          q2: number;
          q3: number;
          q4: number;
        };
      }>;
      expenses: Array<{
        id: string;
        name: string;
        baseAmount: number;
        projectedAmount: number;
        changePercent: number;
        quarterly?: {
          q1: number;
          q2: number;
          q3: number;
          q4: number;
        };
      }>;
      exchangeRate: number;
      chartsElement?: HTMLElement | null;
    }
  ): Promise<boolean> => {
    setIsGenerating(true);
    const hasCharts = !!data.chartsElement;
    const totalSteps = hasCharts ? 6 : 5;
    setProgress({ current: 1, total: totalSteps, stage: 'Simülasyon hazırlanıyor...' });
    
    const formatUSD = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const formatK = (n: number) => {
      if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
      return n.toFixed(0);
    };
    const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
    
    // Çeyreklik veri olup olmadığını kontrol et
    const hasQuarterly = data.revenues.some(r => r.quarterly) || data.expenses.some(e => e.quarterly);
    
    try {
      // Çeyreklik veri varsa landscape, yoksa portrait
      const builder = hasQuarterly 
        ? createLandscapeBuilder({ margin: 10 })
        : createPortraitBuilder({ margin: 10 });
      
      // Kapak sayfası
      builder.addCover(
        `${data.targetYear} Büyüme Simülasyonu`,
        data.scenarioName,
        new Date().toLocaleDateString('tr-TR')
      );
      
      setProgress({ current: 2, total: totalSteps, stage: 'Özet oluşturuluyor...' });
      
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
      
      setProgress({ current: 3, total: totalSteps, stage: 'Gelir tablosu oluşturuluyor...' });
      
      // Gelir projeksiyonları tablosu (çeyreklik verilerle)
      if (hasQuarterly) {
        builder.addTable({
          title: 'Gelir Projeksiyonları (Çeyreklik)',
          headers: ['Kalem', `${data.baseYear}`, 'Q1', 'Q2', 'Q3', 'Q4', `${data.targetYear}`, 'Δ%'],
          rows: data.revenues.map(r => [
            r.name,
            formatK(r.baseAmount),
            r.quarterly ? formatK(r.quarterly.q1) : '-',
            r.quarterly ? formatK(r.quarterly.q2) : '-',
            r.quarterly ? formatK(r.quarterly.q3) : '-',
            r.quarterly ? formatK(r.quarterly.q4) : '-',
            formatK(r.projectedAmount),
            formatPercent(r.changePercent)
          ]),
          options: {
            showHead: 'everyPage',
            headerColor: [34, 197, 94], // Yeşil
            fontSize: 8,
            columnStyles: {
              0: { cellWidth: 60 },
              1: { halign: 'right', cellWidth: 28 },
              2: { halign: 'right', cellWidth: 28 },
              3: { halign: 'right', cellWidth: 28 },
              4: { halign: 'right', cellWidth: 28 },
              5: { halign: 'right', cellWidth: 28 },
              6: { halign: 'right', cellWidth: 30 },
              7: { halign: 'right', cellWidth: 25 },
            }
          }
        });
      } else {
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
            headerColor: [34, 197, 94],
            fontSize: 9,
            columnStyles: {
              0: { cellWidth: 80 },
              1: { halign: 'right' },
              2: { halign: 'right' },
              3: { halign: 'right' },
            }
          }
        });
      }
      
      builder.addSpacer(5);
      
      setProgress({ current: 4, total: totalSteps, stage: 'Gider tablosu oluşturuluyor...' });
      
      // Gider projeksiyonları tablosu (çeyreklik verilerle)
      if (hasQuarterly) {
        builder.addTable({
          title: 'Gider Projeksiyonları (Çeyreklik)',
          headers: ['Kalem', `${data.baseYear}`, 'Q1', 'Q2', 'Q3', 'Q4', `${data.targetYear}`, 'Δ%'],
          rows: data.expenses.map(e => [
            e.name,
            formatK(e.baseAmount),
            e.quarterly ? formatK(e.quarterly.q1) : '-',
            e.quarterly ? formatK(e.quarterly.q2) : '-',
            e.quarterly ? formatK(e.quarterly.q3) : '-',
            e.quarterly ? formatK(e.quarterly.q4) : '-',
            formatK(e.projectedAmount),
            formatPercent(e.changePercent)
          ]),
          options: {
            showHead: 'everyPage',
            headerColor: [239, 68, 68], // Kırmızı
            fontSize: 8,
            columnStyles: {
              0: { cellWidth: 60 },
              1: { halign: 'right', cellWidth: 28 },
              2: { halign: 'right', cellWidth: 28 },
              3: { halign: 'right', cellWidth: 28 },
              4: { halign: 'right', cellWidth: 28 },
              5: { halign: 'right', cellWidth: 28 },
              6: { halign: 'right', cellWidth: 30 },
              7: { halign: 'right', cellWidth: 25 },
            }
          }
        });
      } else {
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
            headerColor: [239, 68, 68],
            fontSize: 9,
            columnStyles: {
              0: { cellWidth: 80 },
              1: { halign: 'right' },
              2: { halign: 'right' },
              3: { halign: 'right' },
            }
          }
        });
      }
      
      // Grafik varsa ekle
      if (data.chartsElement) {
        setProgress({ current: 5, total: totalSteps, stage: 'Grafikler yakalanıyor...' });
        builder.addPageBreak();
        builder.addText('Projeksiyon Grafikleri', 'title', 'center');
        builder.addSpacer(5);
        builder.addChart({
          element: data.chartsElement,
          options: { fitToPage: true, maxHeight: 180 }
        });
      }
      
      // Footer bilgisi
      builder.addSpacer(10);
      builder.addText(
        `Varsayılan Kur: ${data.exchangeRate.toFixed(2)} TL/USD`,
        'caption',
        'right'
      );
      
      setProgress({ current: totalSteps, total: totalSteps, stage: 'PDF oluşturuluyor...' });
      
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
   * Senaryo Karşılaştırma SUNUM PDF - Yatay A4 PowerPoint Kalitesinde
   * Profesyonel slide tasarımı, grafik yakalama, akıllı sayfa bölme
   */
  const generateScenarioPresentationPdf = useCallback(async (
    data: ScenarioPresentationPdfData
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 10, stage: 'Sunum hazırlanıyor...' });
    
    const formatUSD = (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${n < 0 ? ' (-)' : ''}`;
    const formatPercent = (n: number) => `%${n.toFixed(1)}`;
    
    try {
      // YATAY FORMAT - Landscape A4
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      
      // html2canvas import
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      // Helper: Gelişmiş grafik yakalama - chartProcessing modülünü kullan
      const captureChart = async (
        element: HTMLElement | null
      ): Promise<{ imgData: string; aspectRatio: number } | null> => {
        if (!element) {
          console.warn('[captureChart] Element null');
          return null;
        }
        
        try {
          // 1. Element'in DOM'da olduğundan emin ol
          if (!document.body.contains(element)) {
            console.warn('[captureChart] Element not in DOM');
            return null;
          }
          
          // 2. Element'i geçici olarak görünür yap
          const originalStyles = {
            position: element.style.position,
            visibility: element.style.visibility,
            opacity: element.style.opacity,
            zIndex: element.style.zIndex,
          };
          
          element.style.visibility = 'visible';
          element.style.opacity = '1';
          
          // 3. chartProcessing fonksiyonlarını kullan - Recharts SVG render bekle
          await waitForChartsToRender(element, 800);
          
          // 4. Boyutları yakala
          const rect = element.getBoundingClientRect();
          console.log('[captureChart] Element rect:', rect.width, 'x', rect.height);
          
          if (rect.width <= 0 || rect.height <= 0) {
            console.warn('[captureChart] Element has zero dimensions');
            Object.assign(element.style, originalStyles);
            return null;
          }
          
          // 5. SVG'leri optimize et
          optimizeSVGsForPdf(element);
          
          // 6. SVG'lerin opacity'sini zorla ve boyutları sabitle
          const svgs = element.querySelectorAll('svg');
          svgs.forEach(svg => {
            svg.style.opacity = '1';
            svg.style.visibility = 'visible';
            // Boyutları sabitle
            if (rect.width > 0) {
              svg.setAttribute('width', String(rect.width));
              svg.setAttribute('height', String(rect.height));
            }
          });
          
          // 7. Recharts tooltip ve active shape temizle
          element.querySelectorAll('.recharts-tooltip-wrapper, .recharts-active-dot').forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
          
          // 8. html2canvas ile yakala
          const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            logging: true,  // Debug için açık
            backgroundColor: '#ffffff',
            allowTaint: true,
            foreignObjectRendering: false, // SVG için false daha stabil
            width: rect.width,
            height: rect.height,
            windowWidth: rect.width,
            windowHeight: rect.height,
            x: 0,
            y: 0,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            onclone: (clonedDoc, clonedElement) => {
              // Clone'da SVG'leri düzelt
              const clonedSvgs = clonedElement.querySelectorAll('svg');
              clonedSvgs.forEach(svg => {
                svg.style.opacity = '1';
                svg.style.visibility = 'visible';
              });
              // Tooltip'leri gizle
              clonedElement.querySelectorAll('.recharts-tooltip-wrapper').forEach(el => {
                (el as HTMLElement).style.display = 'none';
              });
            }
          });
          
          // 9. Orijinal stilleri geri yükle
          Object.assign(element.style, originalStyles);
          
          // 10. Canvas kontrolü
          if (canvas.width === 0 || canvas.height === 0) {
            console.error('[captureChart] Canvas is empty');
            return null;
          }
          
          console.log('[captureChart] Başarılı:', canvas.width, 'x', canvas.height);
          
          return {
            imgData: canvas.toDataURL('image/png'),
            aspectRatio: canvas.width / canvas.height
          };
        } catch (e) {
          console.error('[captureChart] Error:', e);
          return null;
        }
      };
      
      // ===== SAYFA 1: KAPAK (Zenginleştirilmiş) =====
      setProgress({ current: 2, total: 10, stage: 'Kapak sayfası...' });
      
      // Gradient arka plan efekti
      pdf.setFillColor(30, 58, 138); // Blue-900
      pdf.rect(0, 0, pageWidth, pageHeight * 0.6, 'F');
      
      // Dekoratif şekiller
      pdf.setFillColor(59, 130, 246); // Blue-500
      pdf.ellipse(pageWidth * 0.85, pageHeight * 0.25, 35, 35, 'F');
      pdf.setFillColor(37, 99, 235); // Blue-600
      pdf.ellipse(pageWidth * 0.12, pageHeight * 0.35, 20, 20, 'F');
      pdf.setFillColor(96, 165, 250); // Blue-400
      pdf.ellipse(pageWidth * 0.75, pageHeight * 0.45, 15, 15, 'F');
      
      // Alt kısım açık renk
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, pageHeight * 0.6, pageWidth, pageHeight * 0.4, 'F');
      
      // Dekoratif çizgi
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(2);
      pdf.line(margin, pageHeight * 0.6, pageWidth - margin, pageHeight * 0.6);
      
      // Ana başlık (daha büyük)
      pdf.setFontSize(36);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Senaryo Karşılaştırma', pageWidth / 2, pageHeight / 3.5, { align: 'center' });
      pdf.text('Raporu', pageWidth / 2, pageHeight / 3.5 + 14, { align: 'center' });
      
      // Senaryo isimleri badge
      const badgeWidth = 140;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect((pageWidth - badgeWidth) / 2, pageHeight / 2 - 5, badgeWidth, 22, 11, 11, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(30, 58, 138);
      pdf.text(`${data.scenarioA.name} vs ${data.scenarioB.name}`, pageWidth / 2, pageHeight / 2 + 7, { align: 'center' });
      
      // Alt kısımda özet metrikler (capsule görünümü)
      const capsuleY = pageHeight * 0.72;
      const capsuleW = 60;
      const capsuleH = 28;
      const startX = (pageWidth - (4 * capsuleW + 3 * 10)) / 2;
      
      data.metrics.slice(0, 4).forEach((m, i) => {
        const x = startX + (capsuleW + 10) * i;
        // Kapsül arka plan
        pdf.setFillColor(m.isPositive ? 220 : 254, m.isPositive ? 252 : 226, m.isPositive ? 231 : 226);
        pdf.roundedRect(x, capsuleY, capsuleW, capsuleH, 4, 4, 'F');
        // Label
        pdf.setFontSize(7);
        pdf.setTextColor(100, 116, 139);
        const shortLabel = m.label.length > 12 ? m.label.substring(0, 10) + '..' : m.label;
        pdf.text(shortLabel, x + capsuleW/2, capsuleY + 8, { align: 'center' });
        // Value
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        const mValue = m.format === 'currency' ? formatUSD(m.scenarioB) : 
                      m.format === 'percent' ? formatPercent(m.scenarioB) : m.scenarioB.toFixed(0);
        pdf.text(mValue, x + capsuleW/2, capsuleY + 20, { align: 'center' });
      });
      
      // Tarih ve footer
      pdf.setFontSize(11);
      pdf.setTextColor(100, 116, 139);
      pdf.text(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), pageWidth / 2, pageHeight - 28, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`AI Destekli Finansal Analiz Raporu • Hedef Yıl: ${data.scenarioB.targetYear}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
      
      // ===== SAYFA 2: ÖZET DASHBOARD =====
      pdf.addPage();
      setProgress({ current: 3, total: 10, stage: 'Özet dashboard...' });
      
      // Sayfa başlığı
      pdf.setFillColor(241, 245, 249); // Slate-100
      pdf.rect(0, 0, pageWidth, 18, 'F');
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Finansal Özet Karşılaştırması', margin, 12);
      
      // 4 Özet Kartı
      const cardWidth = (contentWidth - 15) / 4;
      const cardHeight = 45;
      const cardY = 28;
      
      data.metrics.forEach((metric, i) => {
        const cardX = margin + (cardWidth + 5) * i;
        
        // Kart arka planı
        const bgColor = metric.isPositive 
          ? [220, 252, 231] // Green-100
          : [254, 226, 226]; // Red-100
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');
        
        // Metrik adı
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(metric.label, cardX + cardWidth / 2, cardY + 10, { align: 'center' });
        
        // Senaryo A değeri (mavi)
        pdf.setFontSize(10);
        pdf.setTextColor(37, 99, 235);
        const aValue = metric.format === 'currency' ? formatUSD(metric.scenarioA) : 
                       metric.format === 'percent' ? formatPercent(metric.scenarioA) : metric.scenarioA.toFixed(0);
        pdf.text(aValue, cardX + 8, cardY + 22);
        pdf.setFontSize(7);
        pdf.text(data.scenarioA.name.substring(0, 12), cardX + 8, cardY + 27);
        
        // Ok
        pdf.setFontSize(10);
        pdf.setTextColor(148, 163, 184);
        pdf.text('→', cardX + cardWidth / 2, cardY + 22, { align: 'center' });
        
        // Senaryo B değeri (yeşil)
        pdf.setFontSize(11);
        pdf.setTextColor(22, 163, 74);
        const bValue = metric.format === 'currency' ? formatUSD(metric.scenarioB) : 
                       metric.format === 'percent' ? formatPercent(metric.scenarioB) : metric.scenarioB.toFixed(0);
        pdf.text(bValue, cardX + cardWidth - 8, cardY + 22, { align: 'right' });
        pdf.setFontSize(7);
        pdf.text(data.scenarioB.name.substring(0, 12), cardX + cardWidth - 8, cardY + 27, { align: 'right' });
        
        // Fark badge
        const diffColor = metric.isPositive ? [22, 163, 74] : [220, 38, 38];
        pdf.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
        pdf.setFontSize(10);
        const diffSign = metric.diffPercent >= 0 ? '+' : '';
        pdf.text(`${diffSign}${metric.diffPercent.toFixed(1)}%`, cardX + cardWidth / 2, cardY + 38, { align: 'center' });
      });
      
      // Çeyreklik Trend Tablosu
      let tableY = cardY + cardHeight + 15;
      
      pdf.setFontSize(11);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Çeyreklik Net Kâr Trendi', margin, tableY);
      tableY += 5;
      
      autoTable(pdf, {
        head: [['Çeyrek', data.scenarioA.name, data.scenarioB.name, 'Fark', 'Kümülatif A', 'Kümülatif B']],
        body: data.quarterlyData.map(q => {
          const diff = q.scenarioBNet - q.scenarioANet;
          const diffPercent = q.scenarioANet !== 0 ? ((diff / Math.abs(q.scenarioANet)) * 100) : 0;
          return [
            q.quarter,
            formatUSD(q.scenarioANet),
            formatUSD(q.scenarioBNet),
            `${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%`,
            formatUSD(q.scenarioACumulative),
            formatUSD(q.scenarioBCumulative)
          ];
        }),
        startY: tableY,
        showHead: 'everyPage',      // Her sayfada başlık tekrarla
        margin: { left: margin, right: margin },
        theme: 'grid',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',       // Satır ortasında kesmez
        styles: { fontSize: 9, cellPadding: 3, font: 'helvetica' },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });
      
      // ===== SAYFA 3: GRAFİKLER =====
      pdf.addPage();
      setProgress({ current: 4, total: 10, stage: 'Grafikler yakalanıyor...' });
      
      // Debug: Grafik elementlerini kontrol et
      console.log('[PDF] Grafik yakalama başlıyor...');
      console.log('[PDF] quarterlyChart element:', data.chartElements?.quarterlyChart);
      console.log('[PDF] cumulativeChart element:', data.chartElements?.cumulativeChart);
      
      if (data.chartElements?.quarterlyChart) {
        console.log('[PDF] quarterlyChart in DOM:', document.body.contains(data.chartElements.quarterlyChart));
        console.log('[PDF] quarterlyChart rect:', data.chartElements.quarterlyChart.getBoundingClientRect());
      }
      
      // Sayfa başlığı
      pdf.setFillColor(241, 245, 249);
      pdf.rect(0, 0, pageWidth, 18, 'F');
      pdf.setFontSize(14);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Görsel Analiz', margin, 12);
      
      let chartY = 25;
      const chartMaxHeight = 75;
      
      // Çeyreklik Bar Chart
      let chart1Success = false;
      if (data.chartElements?.quarterlyChart) {
        const chartData = await captureChart(data.chartElements.quarterlyChart);
        if (chartData && chartData.imgData) {
          chart1Success = true;
          pdf.setFontSize(10);
          pdf.setTextColor(71, 85, 105);
          pdf.text('Çeyreklik Net Kâr Karşılaştırması', margin, chartY);
          chartY += 3;
          
          let imgWidth = contentWidth * 0.48;
          let imgHeight = imgWidth / chartData.aspectRatio;
          if (imgHeight > chartMaxHeight) {
            imgHeight = chartMaxHeight;
            imgWidth = imgHeight * chartData.aspectRatio;
          }
          pdf.addImage(chartData.imgData, 'PNG', margin, chartY, imgWidth, imgHeight);
        }
      }
      
      // Grafik yakalanamadıysa fallback tablo göster
      if (!chart1Success) {
        console.warn('[PDF] Quarterly chart capture failed, using fallback table');
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text('Çeyreklik Net Kâr Karşılaştırması', margin, chartY);
        
        autoTable(pdf, {
          head: [['Çeyrek', data.scenarioA.name, data.scenarioB.name]],
          body: data.quarterlyData.slice(0, 4).map(q => [
            q.quarter,
            formatUSD(q.scenarioANet),
            formatUSD(q.scenarioBNet)
          ]),
          startY: chartY + 3,
          margin: { left: margin, right: pageWidth / 2 + 5 },
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246] }
        });
      }
      
      // Kümülatif Area Chart
      let chart2Success = false;
      if (data.chartElements?.cumulativeChart) {
        const chartData = await captureChart(data.chartElements.cumulativeChart);
        if (chartData && chartData.imgData) {
          chart2Success = true;
          pdf.setFontSize(10);
          pdf.setTextColor(71, 85, 105);
          pdf.text('Kümülatif Nakit Akışı', pageWidth / 2 + 5, chartY - 3);
          
          let imgWidth = contentWidth * 0.48;
          let imgHeight = imgWidth / chartData.aspectRatio;
          if (imgHeight > chartMaxHeight) {
            imgHeight = chartMaxHeight;
            imgWidth = imgHeight * chartData.aspectRatio;
          }
          pdf.addImage(chartData.imgData, 'PNG', pageWidth / 2 + 5, chartY, imgWidth, imgHeight);
        }
      }
      
      // Fallback tablo
      if (!chart2Success) {
        console.warn('[PDF] Cumulative chart capture failed, using fallback table');
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text('Kümülatif Nakit Akışı', pageWidth / 2 + 5, chartY - 3);
        
        autoTable(pdf, {
          head: [['Çeyrek', 'Küm. A', 'Küm. B']],
          body: data.quarterlyData.slice(0, 4).map(q => [
            q.quarter,
            formatUSD(q.scenarioACumulative),
            formatUSD(q.scenarioBCumulative)
          ]),
          startY: chartY,
          margin: { left: pageWidth / 2 + 5, right: margin },
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [34, 197, 94] }
        });
      }
      
      // Alt kısım: Özet metrikleri tekrar (referans için)
      const summaryY = 115;
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, summaryY, contentWidth, 35, 3, 3, 'F');
      
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Yıllık Özet', margin + 5, summaryY + 8);
      
      // 3 Kolonlu özet
      const colWidth = contentWidth / 3;
      
      // Senaryo A
      pdf.setFillColor(219, 234, 254);
      pdf.roundedRect(margin + 5, summaryY + 12, colWidth - 15, 18, 2, 2, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(37, 99, 235);
      pdf.text(data.scenarioA.name, margin + 10, summaryY + 19);
      pdf.setFontSize(11);
      pdf.text(`Net: ${formatUSD(data.scenarioA.summary.profit)}`, margin + 10, summaryY + 26);
      
      // Senaryo B
      pdf.setFillColor(220, 252, 231);
      pdf.roundedRect(margin + colWidth, summaryY + 12, colWidth - 15, 18, 2, 2, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(22, 163, 74);
      pdf.text(data.scenarioB.name, margin + colWidth + 5, summaryY + 19);
      pdf.setFontSize(11);
      pdf.text(`Net: ${formatUSD(data.scenarioB.summary.profit)}`, margin + colWidth + 5, summaryY + 26);
      
      // Fark
      const totalDiff = data.scenarioB.summary.profit - data.scenarioA.summary.profit;
      const isPosDiff = totalDiff >= 0;
      pdf.setFillColor(isPosDiff ? 220 : 254, isPosDiff ? 252 : 226, isPosDiff ? 231 : 226);
      pdf.roundedRect(margin + colWidth * 2, summaryY + 12, colWidth - 15, 18, 2, 2, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text('Fark', margin + colWidth * 2 + 5, summaryY + 19);
      pdf.setFontSize(11);
      pdf.setTextColor(isPosDiff ? 22 : 220, isPosDiff ? 163 : 38, isPosDiff ? 74 : 38);
      pdf.text(`${isPosDiff ? '+' : ''}${formatUSD(totalDiff)}`, margin + colWidth * 2 + 5, summaryY + 26);
      
      // ===== SAYFA 4: SERMAYE ANALİZİ =====
      if (data.capitalAnalysis || data.dealConfig) {
        pdf.addPage();
        setProgress({ current: 5, total: 10, stage: 'Sermaye analizi...' });
        
        // Sayfa başlığı
        pdf.setFillColor(241, 245, 249);
        pdf.rect(0, 0, pageWidth, 18, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(30, 41, 59);
        pdf.text('Sermaye İhtiyacı & Yatırım Analizi', margin, 12);
        
        let capY = 28;
        
        if (data.capitalAnalysis) {
          // Sol panel: Sermaye durumu
          pdf.setFillColor(254, 243, 199); // Amber-100
          pdf.roundedRect(margin, capY, contentWidth * 0.48, 60, 3, 3, 'F');
          
          pdf.setFontSize(11);
          pdf.setTextColor(146, 64, 14);
          pdf.text('Sermaye İhtiyacı', margin + 8, capY + 12);
          
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);
          let infoY = capY + 22;
          
          if (!data.capitalAnalysis.scenarioBSelfSustaining) {
            pdf.text(`• Sermaye İhtiyacı: ${formatUSD(data.capitalAnalysis.scenarioBNeed)}`, margin + 8, infoY);
            infoY += 7;
            pdf.text(`• Aylık Yakma Hızı: ${formatUSD(data.capitalAnalysis.burnRate)}`, margin + 8, infoY);
            infoY += 7;
            pdf.text(`• Runway: ${data.capitalAnalysis.runway.toFixed(1)} ay`, margin + 8, infoY);
            infoY += 7;
            pdf.text(`• Kritik Çeyrek: ${data.capitalAnalysis.criticalQuarter}`, margin + 8, infoY);
          } else {
            pdf.setTextColor(22, 163, 74);
            pdf.text('✓ Kendini finanse edebilir', margin + 8, infoY);
            infoY += 7;
            pdf.setTextColor(71, 85, 105);
            pdf.text(`• Fırsat Maliyeti: ${formatUSD(data.capitalAnalysis.opportunityCost)}`, margin + 8, infoY);
          }
        }
        
        if (data.dealConfig) {
          // Sağ panel: Deal yapısı
          const dealX = pageWidth / 2 + 5;
          pdf.setFillColor(237, 233, 254); // Violet-100
          pdf.roundedRect(dealX, capY, contentWidth * 0.48, 60, 3, 3, 'F');
          
          pdf.setFontSize(11);
          pdf.setTextColor(91, 33, 182);
          pdf.text('Yatırım Yapısı', dealX + 8, capY + 12);
          
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);
          let dealY = capY + 22;
          pdf.text(`• Yatırım Tutarı: ${formatUSD(data.dealConfig.investmentAmount)}`, dealX + 8, dealY);
          dealY += 7;
          pdf.text(`• Hisse Oranı: %${data.dealConfig.equityPercentage.toFixed(1)}`, dealX + 8, dealY);
          dealY += 7;
          pdf.text(`• Sektör Çarpanı: ${data.dealConfig.sectorMultiple.toFixed(1)}x`, dealX + 8, dealY);
          
          if (data.exitPlan) {
            dealY += 10;
            pdf.setTextColor(91, 33, 182);
            pdf.text('Exit Projeksiyon:', dealX + 8, dealY);
            dealY += 7;
            pdf.setTextColor(71, 85, 105);
            pdf.text(`• Post-Money: ${formatUSD(data.exitPlan.postMoneyValuation)}`, dealX + 8, dealY);
            dealY += 7;
            pdf.text(`• Exit Değeri: ${formatUSD(data.exitPlan.exitValue)}`, dealX + 8, dealY);
          }
        }
      }
      
      // ===== SAYFA 5-6: AI INSIGHTS (Kart Tabanlı Profesyonel Görünüm) =====
      if (data.insights && data.insights.length > 0) {
        pdf.addPage();
        setProgress({ current: 6, total: 10, stage: 'AI çıkarımları...' });
        
        // Severity renk haritası
        const getSeverityStyle = (severity: string): { bg: [number, number, number]; fg: [number, number, number]; label: string } => {
          const styles: Record<string, { bg: [number, number, number]; fg: [number, number, number]; label: string }> = {
            'critical': { bg: [254, 226, 226], fg: [220, 38, 38], label: 'Kritik' },
            'high': { bg: [255, 237, 213], fg: [234, 88, 12], label: 'Yüksek' },
            'medium': { bg: [254, 249, 195], fg: [161, 98, 7], label: 'Orta' },
            'low': { bg: [220, 252, 231], fg: [22, 163, 74], label: 'Düşük' },
            'info': { bg: [219, 234, 254], fg: [37, 99, 235], label: 'Bilgi' }
          };
          return styles[severity?.toLowerCase()] || styles['medium'];
        };
        
        // Başlık
        pdf.setFillColor(168, 85, 247); // Purple-500
        pdf.rect(0, 0, pageWidth, 20, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text('🔍 AI Analiz Çıkarımları', margin, 13);
        pdf.setFontSize(9);
        pdf.text(`Toplam ${data.insights.length} çıkarım`, pageWidth - margin, 13, { align: 'right' });
        
        const cardHeight = 30;
        const cardsPerPage = 5;
        let cardY = 28;
        
        data.insights.forEach((insight, idx) => {
          // Yeni sayfa kontrolü
          if (idx > 0 && idx % cardsPerPage === 0) {
            pdf.addPage();
            // Devam başlığı
            pdf.setFillColor(168, 85, 247);
            pdf.rect(0, 0, pageWidth, 20, 'F');
            pdf.setFontSize(12);
            pdf.setTextColor(255, 255, 255);
            pdf.text('AI Analiz Çıkarımları (devam)', margin, 13);
            pdf.setFontSize(9);
            pdf.text(`${idx + 1}-${Math.min(idx + cardsPerPage, data.insights.length)} / ${data.insights.length}`, pageWidth - margin, 13, { align: 'right' });
            cardY = 28;
          }
          
          const style = getSeverityStyle(insight.severity);
          
          // Kart arka planı
          pdf.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
          pdf.roundedRect(margin, cardY, contentWidth, cardHeight, 3, 3, 'F');
          
          // Sol: Severity göstergesi (dikey çubuk)
          pdf.setFillColor(style.fg[0], style.fg[1], style.fg[2]);
          pdf.roundedRect(margin, cardY, 4, cardHeight, 2, 2, 'F');
          
          // Kategori badge
          const catWidth = 45;
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(margin + 10, cardY + 4, catWidth, 10, 2, 2, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(style.fg[0], style.fg[1], style.fg[2]);
          const shortCat = (insight.category || 'Genel').substring(0, 12);
          pdf.text(shortCat, margin + 10 + catWidth/2, cardY + 10, { align: 'center' });
          
          // Severity badge (sağ üst)
          pdf.setFillColor(style.fg[0], style.fg[1], style.fg[2]);
          pdf.roundedRect(pageWidth - margin - 35, cardY + 4, 30, 10, 2, 2, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255);
          pdf.text(style.label, pageWidth - margin - 20, cardY + 10, { align: 'center' });
          
          // Başlık
          pdf.setFontSize(10);
          pdf.setTextColor(30, 41, 59);
          const titleMaxWidth = contentWidth - 110;
          const truncTitle = insight.title.length > 50 ? insight.title.substring(0, 47) + '...' : insight.title;
          pdf.text(truncTitle, margin + 60, cardY + 11);
          
          // Açıklama
          pdf.setFontSize(8);
          pdf.setTextColor(71, 85, 105);
          const descLines = pdf.splitTextToSize(insight.description, contentWidth - 20);
          pdf.text(descLines.slice(0, 2), margin + 10, cardY + 20);
          
          cardY += cardHeight + 5;
        });
      }
      
      // ===== SAYFA 7: RECOMMENDATIONS =====
      if (data.recommendations && data.recommendations.length > 0) {
        pdf.addPage();
        setProgress({ current: 7, total: 10, stage: 'Stratejik öneriler...' });
        
        // Sayfa başlığı
        pdf.setFillColor(241, 245, 249);
        pdf.rect(0, 0, pageWidth, 18, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(30, 41, 59);
        pdf.text('Stratejik Öneriler', margin, 12);
        
        const riskColors: Record<string, [number, number, number]> = {
          'low': [34, 197, 94],
          'medium': [234, 179, 8],
          'high': [220, 38, 38]
        };
        
        const recRows = data.recommendations.slice(0, 6).map(rec => [
          `#${rec.priority}`,
          rec.title,
          rec.description.length > 120 ? rec.description.substring(0, 117) + '...' : rec.description,
          rec.risk || 'medium'
        ]);
        
        autoTable(pdf, {
          head: [['Öncelik', 'Öneri', 'Açıklama', 'Risk']],
          body: recRows,
          startY: 25,
          showHead: 'everyPage',      // Her sayfada başlık tekrarla
          margin: { left: margin, right: margin },
          theme: 'striped',
          pageBreak: 'auto',
          rowPageBreak: 'avoid',       // Satır ortasında kesmez
          styles: { fontSize: 8, cellPadding: 4, font: 'helvetica', overflow: 'linebreak' },
          headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 50 },
            2: { cellWidth: 160 },
            3: { cellWidth: 25, halign: 'center' }
          },
          didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 3) {
              const risk = String(hookData.cell.raw).toLowerCase();
              const color = riskColors[risk] || [100, 100, 100];
              hookData.cell.styles.textColor = color;
              hookData.cell.styles.fontStyle = 'bold';
            }
          }
        });
      }
      
      // ===== SAYFA 8: PITCH DECK ÖZET =====
      if (data.pitchDeck) {
        pdf.addPage();
        setProgress({ current: 8, total: 10, stage: 'Pitch deck özeti...' });
        
        // Sayfa başlığı
        pdf.setFillColor(241, 245, 249);
        pdf.rect(0, 0, pageWidth, 18, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(30, 41, 59);
        pdf.text('Yatırımcı Pitch Deck Özeti', margin, 12);
        
        // Executive Summary
        pdf.setFillColor(254, 243, 199);
        pdf.roundedRect(margin, 25, contentWidth, 25, 3, 3, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(146, 64, 14);
        pdf.text('Executive Summary', margin + 5, 33);
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105);
        const summaryLines = pdf.splitTextToSize(data.pitchDeck.executiveSummary, contentWidth - 10);
        pdf.text(summaryLines.slice(0, 2), margin + 5, 40);
        
        // Slide'lar 2x3 grid (6 slide göster)
        let slideY = 58;
        const slideWidth = (contentWidth - 20) / 3;  // 3 kolon
        const slideHeight = 50;
        
        data.pitchDeck.slides.slice(0, 6).forEach((slide, i) => {
          const col = i % 3;  // 3 kolon
          const row = Math.floor(i / 3);  // 2 satır
          const x = margin + col * (slideWidth + 10);
          const y = slideY + row * (slideHeight + 8);
          
          // Slide kartı
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(226, 232, 240);
          pdf.roundedRect(x, y, slideWidth, slideHeight, 2, 2, 'FD');
          
          // Slide numarası badge
          pdf.setFillColor(59, 130, 246);
          pdf.roundedRect(x + 4, y + 4, 16, 10, 2, 2, 'F');
          pdf.setFontSize(8);
          pdf.setTextColor(255, 255, 255);
          pdf.text(String(slide.slideNumber), x + 12, y + 10, { align: 'center' });
          
          // Slide başlığı
          pdf.setFontSize(9);
          pdf.setTextColor(30, 41, 59);
          const titleMax = slideWidth - 30;
          const truncatedTitle = slide.title.length > 25 ? slide.title.substring(0, 22) + '...' : slide.title;
          pdf.text(truncatedTitle, x + 24, y + 10);
          
          // Bullet points (3 tane)
          pdf.setFontSize(6);
          pdf.setTextColor(71, 85, 105);
          slide.bullets.slice(0, 3).forEach((bullet, bi) => {
            const maxBulletLen = Math.floor((slideWidth - 10) / 2);
            const bulletText = bullet.length > maxBulletLen ? bullet.substring(0, maxBulletLen - 3) + '...' : bullet;
            pdf.text(`• ${bulletText}`, x + 6, y + 20 + bi * 9);
          });
        });
      }
      
      // ===== SON SAYFA: FOOTER =====
      pdf.addPage();
      setProgress({ current: 9, total: 10, stage: 'Sonuçlandırılıyor...' });
      
      // Dekoratif kapanış
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Merkez içerik
      pdf.setFontSize(18);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Rapor Sonu', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });
      
      // Özet bilgi
      pdf.setFontSize(11);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Karşılaştırılan Senaryolar: ${data.scenarioA.name} ↔ ${data.scenarioB.name}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
      pdf.text(`Hedef Yıl: ${data.scenarioB.targetYear}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });
      
      // AI disclaimer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Bu rapor AI destekli finansal analiz araçları kullanılarak otomatik olarak oluşturulmuştur.', pageWidth / 2, pageHeight - 30, { align: 'center' });
      pdf.text('Yatırım kararlarınız için profesyonel danışmanlık almanızı öneririz.', pageWidth / 2, pageHeight - 24, { align: 'center' });
      
      // Sayfa numaraları
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`${i} / ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
      }
      
      // İndir
      setProgress({ current: 10, total: 10, stage: 'PDF indiriliyor...' });
      const filename = `Senaryo_Sunum_${data.scenarioA.name.replace(/\s+/g, '_')}_vs_${data.scenarioB.name.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
      
      return true;
    } catch (error) {
      console.error('[PDF] Scenario presentation generation error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);


  const generateDashboardPdfSmart = useCallback(async (
    elements: {
      trendChart?: HTMLElement | null;
      revenueChart?: HTMLElement | null;
      expenseChart?: HTMLElement | null;
    },
    year: number,
    currency: 'TRY' | 'USD'
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 4, stage: 'Grafikler hazırlanıyor...' });
    
    try {
      // LANDSCAPE - tek sayfa için yatay mod
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      
      // html2canvas import
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      // Landscape A4 boyutları
      const pageWidth = 297; // mm
      const pageHeight = 210;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2; // 277mm
      const contentHeight = pageHeight - margin * 2; // 190mm
      
      // Başlık
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Finansal Dashboard - ${year} (${currency})`, pageWidth / 2, margin + 5, { align: 'center' });
      
      let currentY = margin + 12;
      
      // Helper: Chart'ı yakala ve belirli pozisyona ekle
      const captureChart = async (
        element: HTMLElement | null | undefined
      ): Promise<{ imgData: string; aspectRatio: number } | null> => {
        if (!element) return null;
        
        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });
          
          if (canvas.width === 0 || canvas.height === 0) {
            return null;
          }
          
          return {
            imgData: canvas.toDataURL('image/jpeg', 0.9),
            aspectRatio: canvas.width / canvas.height
          };
        } catch (error) {
          console.error('[PDF] Chart capture error:', error);
          return null;
        }
      };
      
      // 1. Trend Chart - tam genişlik, üst kısım (100mm yükseklik - büyütüldü)
      setProgress({ current: 2, total: 4, stage: 'Trend grafiği...' });
      const trendData = await captureChart(elements.trendChart);
      if (trendData) {
        const maxHeight = 100; // 55mm → 100mm büyütüldü
        let imgWidth = contentWidth;
        let imgHeight = imgWidth / trendData.aspectRatio;
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * trendData.aspectRatio;
        }
        const xPos = margin + (contentWidth - imgWidth) / 2;
        pdf.addImage(trendData.imgData, 'JPEG', xPos, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 8;
      }
      
      // 2. Revenue Chart (Pie) ve 3. Expense Chart (Bar) - yan yana, YARI BOYUTTA
      setProgress({ current: 3, total: 4, stage: 'Gelir ve gider grafikleri...' });
      const revenueData = await captureChart(elements.revenueChart);
      const expenseData = await captureChart(elements.expenseChart);
      
      // Kalan alan hesapla - alt chartlar optimize boyutta
      const remainingHeight = pageHeight - currentY - margin - 5;
      const chartWidth = (contentWidth - 5) / 3; // ~90mm genişlik (metinler için daha geniş)
      const maxChartHeight = remainingHeight * 0.7; // Yükseklik de küçültüldü
      
      // Sol: Revenue (Pie) Chart - küçültülmüş, sol çeyreğe hizalı
      if (revenueData) {
        let imgWidth = chartWidth;
        let imgHeight = imgWidth / revenueData.aspectRatio;
        if (imgHeight > maxChartHeight) {
          imgHeight = maxChartHeight;
          imgWidth = imgHeight * revenueData.aspectRatio;
        }
        // Sol çeyreğin ortasına hizala
        const xPos = margin + (contentWidth / 4) - (imgWidth / 2);
        pdf.addImage(revenueData.imgData, 'JPEG', xPos, currentY, imgWidth, imgHeight);
      }
      
      // Sağ: Expense (Bar) Chart - küçültülmüş, sağ çeyreğe hizalı
      if (expenseData) {
        let imgWidth = chartWidth;
        let imgHeight = imgWidth / expenseData.aspectRatio;
        if (imgHeight > maxChartHeight) {
          imgHeight = maxChartHeight;
          imgWidth = imgHeight * expenseData.aspectRatio;
        }
        // Sağ çeyreğin ortasına hizala
        const xPos = margin + (contentWidth * 3 / 4) - (imgWidth / 2);
        pdf.addImage(expenseData.imgData, 'JPEG', xPos, currentY, imgWidth, imgHeight);
      }
      
      setProgress({ current: 4, total: 4, stage: 'PDF oluşturuluyor...' });
      
      // PDF kaydet
      const filename = `Dashboard_${year}_${currency}.pdf`;
      pdf.save(filename);
      
      return true;
    } catch (error) {
      console.error('[PDF] Dashboard smart generation error:', error);
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

  /**
   * Nakit Akış Tablosu PDF - Data-driven (jspdf-autotable)
   * A4 dikey, tek sayfa, kapaksız
   */
  const generateCashFlowPdfData = useCallback(async (
    cashFlowStatement: CashFlowStatement,
    year: number,
    formatAmount: (value: number) => string
  ): Promise<boolean> => {
    setIsGenerating(true);
    setProgress({ current: 1, total: 3, stage: 'Nakit akış tablosu hazırlanıyor...' });
    
    try {
      const builder = createPortraitBuilder({ margin: 10 });
      
      // Başlık (Kapaksız - doğrudan tablo)
      builder.addText(`Nakit Akış Tablosu - ${year}`, 'title', 'center');
      builder.addText('Dolaylı Yöntem (Indirect Method)', 'subtitle', 'center');
      builder.addSpacer(5);
      
      setProgress({ current: 2, total: 3, stage: 'Tablolar oluşturuluyor...' });
      
      // A. İşletme Faaliyetleri
      builder.addTable({
        title: 'A. İŞLETME FAALİYETLERİNDEN NAKİT AKIŞLARI',
        headers: ['Kalem', 'Tutar'],
        rows: [
          ['Dönem Net Kârı', formatAmount(cashFlowStatement.operating.netProfit)],
          ['(+) Amortisman ve İtfa Payları', formatAmount(cashFlowStatement.operating.depreciation)],
          ['Ticari Alacaklardaki Değişim', formatAmount(cashFlowStatement.operating.receivablesChange)],
          ['Ticari Borçlardaki Değişim', formatAmount(cashFlowStatement.operating.payablesChange)],
          ['Personel Borçlarındaki Değişim', formatAmount(cashFlowStatement.operating.personnelChange)],
          ['Ödenecek Vergi Değişimi', formatAmount(cashFlowStatement.operating.taxPayablesChange)],
          ['Ödenecek SGK Değişimi', formatAmount(cashFlowStatement.operating.socialSecurityChange)],
          ['Stoklardaki Değişim', formatAmount(cashFlowStatement.operating.inventoryChange)],
          ['KDV Alacak/Borç Değişimi', formatAmount(cashFlowStatement.operating.vatChange)],
          ['İşletme Faaliyetlerinden Net Nakit', formatAmount(cashFlowStatement.operating.total)],
        ],
        options: {
          headerColor: [59, 130, 246],
          columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
        }
      });
      
      builder.addSpacer(3);
      
      // B. Yatırım Faaliyetleri
      const investingRows: [string, string][] = [];
      if (cashFlowStatement.investing.vehiclePurchases > 0) {
        investingRows.push(['(-) Taşıt Alımları', formatAmount(-cashFlowStatement.investing.vehiclePurchases)]);
      }
      if (cashFlowStatement.investing.equipmentPurchases > 0) {
        investingRows.push(['(-) Ekipman Alımları', formatAmount(-cashFlowStatement.investing.equipmentPurchases)]);
      }
      if (cashFlowStatement.investing.fixturePurchases > 0) {
        investingRows.push(['(-) Demirbaş Alımları', formatAmount(-cashFlowStatement.investing.fixturePurchases)]);
      }
      investingRows.push(['Yatırım Faaliyetlerinden Net Nakit', formatAmount(cashFlowStatement.investing.total)]);
      
      builder.addTable({
        title: 'B. YATIRIM FAALİYETLERİNDEN NAKİT AKIŞLARI',
        headers: ['Kalem', 'Tutar'],
        rows: investingRows,
        options: {
          headerColor: [34, 197, 94],
          columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
        }
      });
      
      builder.addSpacer(3);
      
      // C. Finansman Faaliyetleri
      const financingRows: [string, string][] = [];
      if (cashFlowStatement.financing.loanProceeds > 0) {
        financingRows.push(['(+) Kredi Kullanımı', formatAmount(cashFlowStatement.financing.loanProceeds)]);
      }
      if (cashFlowStatement.financing.loanRepayments > 0) {
        financingRows.push(['(-) Kredi Geri Ödemeleri', formatAmount(-cashFlowStatement.financing.loanRepayments)]);
      }
      if (cashFlowStatement.financing.leasingPayments > 0) {
        financingRows.push(['(-) Leasing Ödemeleri', formatAmount(-cashFlowStatement.financing.leasingPayments)]);
      }
      if (cashFlowStatement.financing.partnerDeposits > 0) {
        financingRows.push(['(+) Ortaktan Gelen', formatAmount(cashFlowStatement.financing.partnerDeposits)]);
      }
      if (cashFlowStatement.financing.partnerWithdrawals > 0) {
        financingRows.push(['(-) Ortağa Ödeme', formatAmount(-cashFlowStatement.financing.partnerWithdrawals)]);
      }
      if (cashFlowStatement.financing.capitalIncrease > 0) {
        financingRows.push(['(+) Sermaye Artırımı', formatAmount(cashFlowStatement.financing.capitalIncrease)]);
      }
      financingRows.push(['Finansman Faaliyetlerinden Net Nakit', formatAmount(cashFlowStatement.financing.total)]);
      
      builder.addTable({
        title: 'C. FİNANSMAN FAALİYETLERİNDEN NAKİT AKIŞLARI',
        headers: ['Kalem', 'Tutar'],
        rows: financingRows,
        options: {
          headerColor: [168, 85, 247],
          columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
        }
      });
      
      builder.addSpacer(5);
      
      // Özet Tablosu
      builder.addTable({
        title: 'NAKİT ÖZET',
        headers: ['', 'Tutar'],
        rows: [
          ['Nakitteki Net Değişim (A + B + C)', formatAmount(cashFlowStatement.netCashChange)],
          ['Dönem Başı Nakit', formatAmount(cashFlowStatement.openingCash)],
          ['DÖNEM SONU NAKİT', formatAmount(cashFlowStatement.closingCash)],
        ],
        options: {
          headerColor: [15, 23, 42],
          columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } }
        }
      });
      
      // Denklem kontrolü
      if (!cashFlowStatement.isBalanced) {
        builder.addSpacer(3);
        builder.addText(`⚠ Fark: ${formatAmount(cashFlowStatement.difference)}`, 'subtitle', 'center');
      }
      
      setProgress({ current: 3, total: 3, stage: 'PDF oluşturuluyor...' });
      
      const filename = `Nakit_Akis_Tablosu_${year}.pdf`;
      return await builder.build(filename);
    } catch (error) {
      console.error('[PDF] Cash flow statement error:', error);
      return false;
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, stage: '' });
    }
  }, []);

  return {
    // Data-driven (önerilen - tablolar için)
    generateFullReportPdfData,
    generateBalanceSheetPdfData,
    generateIncomeStatementPdfData,
    generateDetailedIncomePdfData,
    generateSimulationPdfData,
    generateScenarioComparisonPdfData,
    generateScenarioPresentationPdf,
    generateCashFlowPdfData,
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
    generateDashboardPdfSmart,
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
