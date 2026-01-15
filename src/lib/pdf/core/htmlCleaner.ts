// ============================================
// HTML TEMİZLEME MODÜLÜ
// PDF için gereksiz elementleri temizler
// ============================================

import { PDF_SELECTORS } from '../config/pdf';

/**
 * PDF için gereksiz elementleri temizler
 * Butonlar, formlar, tooltip'ler, toast'lar vb.
 */
export function cleanHtmlForPdf(container: HTMLElement): void {
  // Kaldırılacak elementlerin selector'ları
  const removeSelectors = PDF_SELECTORS.remove.join(', ');
  
  try {
    container.querySelectorAll(removeSelectors).forEach(el => {
      el.remove();
    });
  } catch (e) {
    // Bazı selector'lar geçersiz olabilir, tek tek dene
    PDF_SELECTORS.remove.forEach(selector => {
      try {
        container.querySelectorAll(selector).forEach(el => el.remove());
      } catch {
        // Bu selector geçersiz, atla
      }
    });
  }
}

/**
 * Rapor için özel temizlik
 * Interactive elementleri, hover state'leri temizler
 */
export function prepareReportForPdf(container: HTMLElement): void {
  // Toast container'ları
  container.querySelectorAll('[data-sonner-toaster], .toaster, .toast-container').forEach(el => el.remove());
  
  // Radix UI portal'ları
  container.querySelectorAll('[data-radix-portal]').forEach(el => el.remove());
  
  // Dropdown ve popover'lar
  container.querySelectorAll('[role="menu"], [role="listbox"], [role="dialog"]:not(.pdf-include)').forEach(el => el.remove());
  
  // Loading spinner'lar
  container.querySelectorAll('.loading, .spinner, [role="progressbar"]').forEach(el => el.remove());
  
  // Skeleton loader'lar
  container.querySelectorAll('.skeleton, [class*="skeleton"]').forEach(el => el.remove());
  
  // Form elementleri (input, select, textarea) - readonly olmayan
  container.querySelectorAll('input:not([readonly]), select:not([disabled])').forEach(el => {
    // Input değerini span'a çevir
    const htmlEl = el as HTMLInputElement;
    if (htmlEl.value) {
      const span = document.createElement('span');
      span.textContent = htmlEl.value;
      span.className = htmlEl.className;
      htmlEl.replaceWith(span);
    } else {
      htmlEl.remove();
    }
  });
  
  // Hover ve focus state'leri temizle
  container.querySelectorAll('.hover\\:bg-*, .focus\\:ring-*, .group-hover\\:*').forEach(el => {
    const htmlEl = el as HTMLElement;
    // Bu sınıfları kaldırmak yerine stillerini sıfırla
    htmlEl.classList.forEach(cls => {
      if (cls.includes('hover:') || cls.includes('focus:')) {
        htmlEl.classList.remove(cls);
      }
    });
  });
}

/**
 * Ekran için özel elementleri gizler
 * PDF'te görünmemesi gereken UI elementleri
 */
export function hideScreenOnlyElements(container: HTMLElement): void {
  // Mobil navigasyon
  container.querySelectorAll('.mobile-nav, .bottom-nav, [class*="BottomTab"]').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  
  // Floating action button'lar
  container.querySelectorAll('.fab, .floating-action-button, [class*="floating"]').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  
  // Scroll indicator'lar
  container.querySelectorAll('.scroll-indicator, [class*="scroll-to"]').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
  
  // Breadcrumb (opsiyonel - bazı raporlarda istenebilir)
  // container.querySelectorAll('.breadcrumb').forEach(el => el.remove());
}

/**
 * Empty state ve placeholder içerikleri temizler
 */
export function removeEmptyStates(container: HTMLElement): void {
  container.querySelectorAll('.empty-state, .no-data, [class*="empty"]').forEach(el => {
    // İçinde gerçek veri varsa kaldırma
    const text = el.textContent?.trim() || '';
    if (text.includes('veri yok') || text.includes('boş') || text.includes('bulunamadı')) {
      el.remove();
    }
  });
}

/**
 * Debug ve development elementlerini kaldırır
 */
export function removeDebugElements(container: HTMLElement): void {
  // React DevTools
  container.querySelectorAll('[data-reactroot]').forEach(el => {
    el.removeAttribute('data-reactroot');
  });
  
  // Development-only classes
  container.querySelectorAll('.debug, .dev-only, [class*="__dev"]').forEach(el => {
    el.remove();
  });
  
  // Console log yazdıran elementler
  container.querySelectorAll('[data-debug]').forEach(el => {
    el.removeAttribute('data-debug');
  });
}

/**
 * Tüm temizlik işlemlerini tek seferde uygular
 */
export function fullCleanupForPdf(container: HTMLElement): void {
  cleanHtmlForPdf(container);
  prepareReportForPdf(container);
  hideScreenOnlyElements(container);
  removeEmptyStates(container);
  removeDebugElements(container);
}
