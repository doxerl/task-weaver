// ============================================
// GRAFİK İŞLEME MODÜLÜ
// Recharts ve diğer grafikleri PDF için işler
// ============================================

import { PDF_CONFIG } from '../config/pdf';

// Grafik boyut tiplemesi
export interface ChartDimension {
  width: number;
  height: number;
  pdfId: string;
}

/**
 * Grafiklerin render edilmesini bekler
 * Recharts SVG'lerinin tamamen çizildiğinden emin olur
 */
export async function waitForChartsToRender(
  element: HTMLElement,
  waitTime?: number
): Promise<void> {
  const delay = waitTime ?? PDF_CONFIG.rendering.chartWaitTime;
  
  // Önce DOM'un sakinleşmesini bekle
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Recharts container'larını bul
  const chartContainers = element.querySelectorAll('.recharts-responsive-container, .recharts-wrapper');
  
  if (chartContainers.length > 0) {
    console.log('[PDF Charts] Bulunan grafik sayısı:', chartContainers.length);
    
    // Her grafik için SVG render bekle
    const promises = Array.from(chartContainers).map(async (container) => {
      // SVG'nin oluşmasını bekle
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        const svg = container.querySelector('svg');
        if (svg && svg.children.length > 0) {
          // Animation'ların bitmesini bekle
          await new Promise(resolve => setTimeout(resolve, 100));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
    });
    
    await Promise.all(promises);
  }
  
  // Son bir bekleme - tüm animasyonların bitmesi için
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Clone'dan ÖNCE grafik boyutlarını yakalar
 * Bu boyutlar daha sonra clone'a uygulanır
 */
export function captureChartDimensions(element: HTMLElement): Map<string, ChartDimension> {
  const dimensions = new Map<string, ChartDimension>();
  let counter = 0;
  
  // Tüm recharts container'larını bul
  element.querySelectorAll('.recharts-responsive-container').forEach(container => {
    const htmlEl = container as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    
    if (rect.width > 0 && rect.height > 0) {
      const pdfId = `chart-dim-${counter++}`;
      htmlEl.setAttribute('data-chart-id', pdfId);
      
      dimensions.set(pdfId, {
        width: rect.width,
        height: rect.height,
        pdfId,
      });
      
      console.log('[PDF Charts] Boyut yakalandı:', pdfId, rect.width, 'x', rect.height);
    }
  });
  
  // Recharts wrapper'ları da
  element.querySelectorAll('.recharts-wrapper').forEach(wrapper => {
    const htmlEl = wrapper as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    
    if (rect.width > 0 && rect.height > 0) {
      const pdfId = `chart-wrapper-${counter++}`;
      htmlEl.setAttribute('data-chart-id', pdfId);
      
      dimensions.set(pdfId, {
        width: rect.width,
        height: rect.height,
        pdfId,
      });
    }
  });
  
  return dimensions;
}

/**
 * Yakalanan boyutları clone'a uygular
 * Clone DOM'da olmadığı için getBoundingClientRect çalışmaz,
 * bu yüzden önceden yakalanan boyutları kullanırız
 */
export function applyChartDimensions(
  clonedElement: HTMLElement,
  dimensions: Map<string, ChartDimension>
): void {
  clonedElement.querySelectorAll('[data-chart-id]').forEach(container => {
    const chartId = container.getAttribute('data-chart-id');
    if (!chartId) return;
    
    const dim = dimensions.get(chartId);
    if (dim) {
      const htmlEl = container as HTMLElement;
      htmlEl.style.width = `${dim.width}px`;
      htmlEl.style.height = `${dim.height}px`;
      htmlEl.style.minWidth = `${dim.width}px`;
      htmlEl.style.minHeight = `${dim.height}px`;
      htmlEl.style.maxWidth = `${dim.width}px`;
      htmlEl.style.maxHeight = `${dim.height}px`;
      
      console.log('[PDF Charts] Boyut uygulandı:', chartId, dim.width, 'x', dim.height);
    }
  });
}

/**
 * SVG elementlerini optimize eder
 * Gereksiz elementleri kaldırır ve stilleri inline yapar
 */
export function optimizeSVGsForPdf(element: HTMLElement): void {
  element.querySelectorAll('svg').forEach(svg => {
    // Tooltip'leri kaldır
    svg.querySelectorAll('.recharts-tooltip-wrapper, .recharts-active-shape').forEach(el => el.remove());
    
    // Animation attribute'larını kaldır
    svg.querySelectorAll('[class*="animate"]').forEach(el => {
      el.classList.forEach(cls => {
        if (cls.includes('animate')) {
          el.classList.remove(cls);
        }
      });
    });
    
    // Cursor pointer'ları kaldır
    svg.querySelectorAll('[style*="cursor"]').forEach(el => {
      (el as HTMLElement).style.cursor = 'default';
    });
    
    // Fill ve stroke değerlerini koruyalım
    svg.querySelectorAll('path, rect, circle, line, polygon, polyline').forEach(el => {
      const htmlEl = el as SVGElement;
      const computed = window.getComputedStyle(htmlEl);
      
      const fill = computed.fill;
      const stroke = computed.stroke;
      
      if (fill && fill !== 'none') {
        htmlEl.setAttribute('fill', fill);
      }
      if (stroke && stroke !== 'none') {
        htmlEl.setAttribute('stroke', stroke);
      }
    });
  });
}

/**
 * Grafikleri PNG'ye dönüştürür (opsiyonel)
 * Büyük/karmaşık grafikler için kullanılabilir
 */
export async function convertChartsToImages(
  element: HTMLElement
): Promise<void> {
  // html2canvas'ı dinamik import et
  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default;
  
  const chartContainers = element.querySelectorAll('.recharts-responsive-container');
  
  for (const container of Array.from(chartContainers)) {
    const htmlEl = container as HTMLElement;
    const rect = htmlEl.getBoundingClientRect();
    
    if (rect.width > 0 && rect.height > 0) {
      try {
        const canvas = await html2canvas(htmlEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null,
        });
        
        // Canvas'ı img elementine çevir
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.width = `${rect.width}px`;
        img.style.height = `${rect.height}px`;
        
        // Container'ın içeriğini img ile değiştir
        htmlEl.innerHTML = '';
        htmlEl.appendChild(img);
      } catch (error) {
        console.warn('[PDF Charts] Grafik dönüştürme hatası:', error);
        // Hata durumunda orijinal SVG'yi koru
      }
    }
  }
}

/**
 * Canvas elementlerini korur ve boyutlarını sabitler
 */
export function preserveCanvasElements(element: HTMLElement): void {
  element.querySelectorAll('canvas').forEach(canvas => {
    const width = canvas.width;
    const height = canvas.height;
    
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  });
}

/**
 * Orijinal elementteki chart ID'lerini temizler
 */
export function cleanupChartIds(element: HTMLElement): void {
  element.querySelectorAll('[data-chart-id]').forEach(el => {
    el.removeAttribute('data-chart-id');
  });
}
