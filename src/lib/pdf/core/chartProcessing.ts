// ============================================
// GRAFİK İŞLEME MODÜLÜ
// Recharts ve diğer grafikleri PDF için işler
// ============================================

import { PDF_CONFIG, PDF_SELECTORS } from '../config/pdf';

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
 * Responsive container'ları sabit boyutlandırır
 * Bu, clone sırasında boyut kaybını önler
 */
export function fixResponsiveContainers(element: HTMLElement): void {
  element.querySelectorAll('.recharts-responsive-container').forEach(container => {
    const htmlEl = container as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    if (rect.width > 0 && rect.height > 0) {
      htmlEl.style.width = `${rect.width}px`;
      htmlEl.style.height = `${rect.height}px`;
      htmlEl.style.minWidth = `${rect.width}px`;
      htmlEl.style.minHeight = `${rect.height}px`;
      htmlEl.style.maxWidth = `${rect.width}px`;
      htmlEl.style.maxHeight = `${rect.height}px`;
    }
  });
  
  // Recharts wrapper'ları da sabitle
  element.querySelectorAll('.recharts-wrapper').forEach(wrapper => {
    const htmlEl = wrapper as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    
    if (rect.width > 0 && rect.height > 0) {
      htmlEl.style.width = `${rect.width}px`;
      htmlEl.style.height = `${rect.height}px`;
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
        console.warn('Grafik dönüştürme hatası:', error);
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
