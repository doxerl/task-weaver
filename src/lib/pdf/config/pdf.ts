// ============================================
// MERKEZI PDF KONFİGÜRASYONU
// Tüm PDF ayarları tek noktadan yönetilir
// ============================================

export const PDF_CONFIG = {
  page: {
    width: 210,      // A4 mm
    height: 297,     // A4 mm
    margins: { 
      top: 15, 
      bottom: 10, 
      left: 10, 
      right: 10 
    }
  },
  typography: {
    baseFontSize: 10,
    lineHeight: 1.4,
    headingScales: { 
      h1: 2.5, 
      h2: 2, 
      h3: 1.5 
    }
  },
  rendering: {
    chartWaitTime: 1500,
    imageWaitTime: 500,
    scale: 1.5,  // 2 yerine 1.5 - daha küçük dosya boyutu
  },
  // JPEG sıkıştırma ayarları (PNG yerine)
  compression: {
    format: 'JPEG' as const,
    quality: 0.85,  // 85% kalite - görsel fark yok, boyut %80 düşer
  },
  breaks: {
    tolerance: 20,
    selectors: ['.page-break', '.pdf-section']
  },
  performance: {
    batchSize: 5,
    chunkSize: 1024 * 1024, // 1MB
  },
  debug: {
    enabled: false,
    logLevel: 'warn' as 'info' | 'warn' | 'error'
  }
};

export const PDF_SELECTORS = {
  // Kaldırılacak elementler
  remove: [
    'button:not(.pdf-include)',
    '.toast',
    '[role="tooltip"]',
    '.recharts-tooltip-wrapper',
    '.recharts-active-shape',
    '[data-radix-popper-content-wrapper]',
    'script',
    '.screen-only',
    '[data-no-print]',
    '.toaster',
    '[data-sonner-toaster]',
    'input',
    'textarea',
    '.mobile-only',
    '.hover-card',
    '.dropdown-menu',
    '.popover-content',
  ],
  // Korunacak elementler
  preserve: [
    '.recharts-responsive-container',
    '.recharts-wrapper',
    'svg',
    'table',
    '.pdf-include',
    'canvas',
    'img',
  ],
  // Sayfa kırılma noktaları
  pageBreak: [
    '.page-break-before',
    '.page-break-after',
    '.pdf-page-break',
  ]
};

export const PDF_COLORS = {
  primary: [59, 130, 246] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  info: [14, 165, 233] as [number, number, number],
  gray: [100, 100, 100] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

export const MEMORY_OPTIMIZATION = {
  maxHtmlSize: 5 * 1024 * 1024, // 5MB
  chunkSize: 1024 * 1024,       // 1MB
  gcInterval: 10,               // 10 operasyonda bir GC
};

export type PdfOrientation = 'portrait' | 'landscape';
export type PdfFormat = 'a4' | 'letter';

export interface PdfGenerateOptions {
  filename: string;
  orientation?: PdfOrientation;
  format?: PdfFormat;
  margin?: number;
  scale?: number;
  waitTime?: number;
  fitToPage?: boolean;
  onProgress?: (stage: string, percent?: number) => void;
}

export interface PdfProgress {
  current: number;
  total: number;
  stage: string;
}
