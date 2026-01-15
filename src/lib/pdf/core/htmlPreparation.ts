// ============================================
// HTML HAZIRLIK MODÜLÜ
// HTML içeriğini PDF için hazırlar
// ============================================

import { PDF_SELECTORS } from '../config/pdf';

interface CapturedStyles {
  color: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  borderColor?: string;
}

/**
 * Orijinal elementten stilleri toplar (CSS değişkenleri çözümlenmiş halde)
 * data-pdf-id attribute kullanarak index kaymasını önler
 */
export function collectStylesFromOriginal(element: HTMLElement): Map<string, CapturedStyles> {
  const styleMap = new Map<string, CapturedStyles>();
  
  // Tooltip selector'ları - bunların içindeki elementleri sayma dışında tut
  const tooltipSelectors = PDF_SELECTORS.remove.join(', ');
  
  let counter = 0;
  const selectors = 'div, span, p, td, th, h1, h2, h3, h4, h5, h6, li, label, a, strong, em, b, i';
  
  element.querySelectorAll(selectors).forEach((el) => {
    // Tooltip içindeki elementleri atla
    try {
      if (el.closest(tooltipSelectors)) return;
    } catch {
      // Invalid selector, devam et
    }
    
    const htmlEl = el as HTMLElement;
    const computed = window.getComputedStyle(htmlEl);
    
    // Unique ID ata - bu sayede clone'da da aynı ID ile eşleştirebiliriz
    const pdfId = `pdf-style-${counter++}`;
    htmlEl.setAttribute('data-pdf-id', pdfId);
    
    styleMap.set(pdfId, {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontFamily: computed.fontFamily,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      lineHeight: computed.lineHeight,
      borderColor: computed.borderColor,
    });
  });
  
  return styleMap;
}

/**
 * Toplanan stilleri clone edilen elemente uygular
 */
export function applyCollectedStyles(
  clonedElement: HTMLElement, 
  styleMap: Map<string, CapturedStyles>
): void {
  clonedElement.querySelectorAll('[data-pdf-id]').forEach((el) => {
    const pdfId = el.getAttribute('data-pdf-id');
    if (!pdfId) return;
    
    const styles = styleMap.get(pdfId);
    if (styles) {
      const htmlEl = el as HTMLElement;
      // !important ile stilleri zorla uygula - CSS specificity sorunlarını aşar
      htmlEl.style.setProperty('color', styles.color, 'important');
      htmlEl.style.setProperty('background-color', styles.backgroundColor);
      htmlEl.style.setProperty('font-family', styles.fontFamily);
      htmlEl.style.setProperty('font-size', styles.fontSize);
      htmlEl.style.setProperty('font-weight', styles.fontWeight);
      htmlEl.style.setProperty('line-height', styles.lineHeight);
      if (styles.borderColor) {
        htmlEl.style.setProperty('border-color', styles.borderColor);
      }
    }
  });
}

/**
 * HTML içeriğini PDF için hazırlar
 * Script taglarını temizler, image loading'i eager yapar
 */
export function prepareHTMLForPdf(element: HTMLElement): void {
  // Script taglarını kaldır
  element.querySelectorAll('script').forEach(script => script.remove());
  
  // Style taglarını koru ama inline script'leri kaldır
  element.querySelectorAll('[onload], [onerror], [onclick]').forEach(el => {
    el.removeAttribute('onload');
    el.removeAttribute('onerror');
    el.removeAttribute('onclick');
  });
  
  // Noscript içeriğini kaldır
  element.querySelectorAll('noscript').forEach(el => el.remove());
}

/**
 * Açık renkleri koyulaştırır - print için kontrastı artırır
 */
export function enhanceContrastForPdf(element: HTMLElement): void {
  const textElements = element.querySelectorAll('p, span, div, td, th, h1, h2, h3, h4, h5, h6, li, label');
  
  textElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    const computed = window.getComputedStyle(htmlEl);
    const color = computed.color;
    
    // Çok açık gri renkleri koyulaştır (rgba format kontrolü)
    if (color.includes('rgba')) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        // Çok açık renkler (grilik > 200)
        if (r > 200 && g > 200 && b > 200) {
          htmlEl.style.setProperty('color', 'rgb(60, 60, 60)', 'important');
        }
      }
    }
  });
}

/**
 * Tüm görsellerin eager loading kullanmasını sağlar
 */
export function prepareImagesForPdf(element: HTMLElement): void {
  element.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'eager');
    img.removeAttribute('data-src'); // Lazy load data attribute'larını kaldır
    
    // Crossorigin ayarla
    if (img.src.startsWith('http') && !img.src.includes(window.location.host)) {
      img.setAttribute('crossorigin', 'anonymous');
    }
  });
}

/**
 * CSS değişkenlerini çözümleyerek inline style'a dönüştürür
 */
export function resolveCSSVariables(element: HTMLElement): void {
  const computedStyle = window.getComputedStyle(element);
  const inlineStyles: string[] = [];
  
  // Önemli stilleri inline olarak ayarla
  const importantProps = ['color', 'background-color', 'border-color', 'fill', 'stroke'];
  
  importantProps.forEach(prop => {
    const value = computedStyle.getPropertyValue(prop);
    if (value && value !== 'none' && value !== 'transparent') {
      inlineStyles.push(`${prop}: ${value}`);
    }
  });
  
  if (inlineStyles.length > 0) {
    const existingStyle = element.getAttribute('style') || '';
    element.setAttribute('style', `${existingStyle}; ${inlineStyles.join('; ')}`);
  }
  
  // Çocuk elementler için recursive
  Array.from(element.children).forEach(child => {
    if (child instanceof HTMLElement) {
      resolveCSSVariables(child);
    }
  });
}
