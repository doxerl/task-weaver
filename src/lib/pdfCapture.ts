// PDF oluşturma için yardımcı fonksiyonlar
// html2canvas'ı dinamik olarak yükleyerek TypeScript compiler sorunlarını önler

import jsPDF from 'jspdf';

export interface ScreenshotPdfOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  scale?: number;
  onProgress?: (stage: string) => void;
  waitTime?: number;
  fitToPage?: boolean; // İçeriği tek sayfaya sığdır
  cleanupBeforeCapture?: boolean; // Tooltip, hover vb. temizle
}

interface CapturedStyles {
  color: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: string;
}

/**
 * Orijinal elementten stilleri toplar (CSS değişkenleri çözümlenmiş halde)
 */
function collectStylesFromOriginal(element: HTMLElement): Map<string, CapturedStyles> {
  const styleMap = new Map<string, CapturedStyles>();
  
  // Tüm metin içeren elementlerin stillerini kaydet
  element.querySelectorAll('div, span, p, td, th, h1, h2, h3, h4, h5, h6, li, label').forEach((el, index) => {
    const htmlEl = el as HTMLElement;
    const computed = window.getComputedStyle(htmlEl);
    const key = `${el.tagName}-${index}`;
    styleMap.set(key, {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
    });
  });
  
  return styleMap;
}

/**
 * Clone edilen element üzerinde temizlik ve stil uygulama yapar
 */
function processClonedElement(clonedElement: HTMLElement, styleMap: Map<string, CapturedStyles>): void {
  // 1. Tooltip ve hover elementlerini kaldır
  clonedElement.querySelectorAll(
    '[role="tooltip"], .recharts-tooltip-wrapper, .recharts-active-shape, [data-radix-popper-content-wrapper]'
  ).forEach(el => el.remove());

  // 2. Responsive container'ları sabit boyutla
  clonedElement.querySelectorAll('.recharts-responsive-container').forEach(container => {
    const htmlEl = container as HTMLElement;
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      htmlEl.style.width = `${rect.width}px`;
      htmlEl.style.height = `${rect.height}px`;
      htmlEl.style.minWidth = `${rect.width}px`;
      htmlEl.style.minHeight = `${rect.height}px`;
    }
  });

  // 3. Önceden toplanan stilleri clone'a uygula
  clonedElement.querySelectorAll('div, span, p, td, th, h1, h2, h3, h4, h5, h6, li, label').forEach((el, index) => {
    const key = `${el.tagName}-${index}`;
    const styles = styleMap.get(key);
    if (styles) {
      const htmlEl = el as HTMLElement;
      // Stilleri inline olarak uygula
      htmlEl.style.color = styles.color;
      htmlEl.style.backgroundColor = styles.backgroundColor;
      htmlEl.style.fontFamily = styles.fontFamily;
      htmlEl.style.fontSize = styles.fontSize;
    }
  });
}

/**
 * HTML elementini ekran görüntüsü alarak PDF'e dönüştürür
 * Ekrandaki görünümü birebir yakalar - Türkçe karakterler sorunsuz
 */
export async function captureElementToPdf(
  element: HTMLElement,
  options: ScreenshotPdfOptions
): Promise<boolean> {
  const { 
    filename, 
    orientation = 'portrait', 
    margin = 10, 
    scale = 2,
    waitTime = 800,
    fitToPage = false,
    cleanupBeforeCapture = true
  } = options;
  
  try {
    options.onProgress?.('Sayfa hazırlanıyor...');
    
    // Render tamamlanmasını bekle
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    options.onProgress?.('Stiller toplanıyor...');
    
    // ÖNEMLİ: html2canvas'tan ÖNCE orijinal elementteki stilleri topla
    // Bu adım CSS değişkenlerinin (var(--xxx)) doğru çözülmesini sağlar
    const styleMap = cleanupBeforeCapture ? collectStylesFromOriginal(element) : new Map();
    
    options.onProgress?.('Ekran yakalanıyor...');
    
    // html2canvas'ı dinamik olarak import et
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    
    // html2canvas ile yakala - onclone callback ile temizlik ve stil uygula
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      
      // Clone üzerinde işlem yap
      onclone: cleanupBeforeCapture 
        ? (_clonedDoc: Document, clonedElement: HTMLElement) => {
            processClonedElement(clonedElement, styleMap);
          }
        : undefined,
    });
    
    options.onProgress?.('PDF oluşturuluyor...');
    
    // PDF boyutları (A4)
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
    
    if (fitToPage) {
      // Tek sayfaya sığdırma modu
      // İçerik sayfadan büyükse ölçekle
      if (imgHeight > contentAreaHeight) {
        const scaleRatio = contentAreaHeight / imgHeight;
        const scaledWidth = imgWidth * scaleRatio;
        const scaledHeight = contentAreaHeight;
        // Yatayda ortala
        const xOffset = margin + (contentAreaWidth - scaledWidth) / 2;
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', xOffset, margin, scaledWidth, scaledHeight);
      } else {
        // İçerik zaten sayfaya sığıyor
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      }
    } else {
      // Çok sayfalı mod - canvas'ı sayfalara böl
      const pageCanvasHeight = (contentAreaHeight * canvas.width) / imgWidth;
      const totalPages = Math.ceil(canvas.height / pageCanvasHeight);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        
        // Bu sayfa için canvas slice oluştur
        const sliceCanvas = document.createElement('canvas');
        const ctx = sliceCanvas.getContext('2d');
        
        if (!ctx) continue;
        
        sliceCanvas.width = canvas.width;
        const remainingHeight = canvas.height - (page * pageCanvasHeight);
        sliceCanvas.height = Math.min(pageCanvasHeight, remainingHeight);
        
        // Slice'ı çiz
        ctx.drawImage(
          canvas,
          0, page * pageCanvasHeight,           // Kaynak (x, y)
          canvas.width, sliceCanvas.height,     // Kaynak (width, height)
          0, 0,                                  // Hedef (x, y)
          sliceCanvas.width, sliceCanvas.height // Hedef (width, height)
        );
        
        const sliceData = sliceCanvas.toDataURL('image/png', 1.0);
        const sliceImgHeight = (sliceCanvas.height * imgWidth) / sliceCanvas.width;
        
        pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceImgHeight);
      }
    }
    
    options.onProgress?.('İndiriliyor...');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    return false;
  }
}
