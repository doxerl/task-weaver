// ============================================
// PDF FONT UTILITIES
// Türkçe karakter desteği için font yükleme
// ============================================

let fontBase64Cache: string | null = null;
let fontLoadPromise: Promise<string> | null = null;

/**
 * Load Roboto font as base64 for jsPDF
 * Font is loaded from public/fonts/Roboto-Regular.ttf
 */
export async function loadRobotoFont(): Promise<string> {
  if (fontBase64Cache) {
    return fontBase64Cache;
  }

  if (fontLoadPromise) {
    return fontLoadPromise;
  }

  fontLoadPromise = (async () => {
    try {
      const response = await fetch('/fonts/Roboto-Regular.ttf');
      if (!response.ok) {
        throw new Error(`Font fetch failed: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      fontBase64Cache = base64;
      console.log('[PDF] Roboto font loaded successfully, size:', base64.length);
      return base64;
    } catch (error) {
      console.error('[PDF] Failed to load Roboto font:', error);
      throw error;
    }
  })();

  return fontLoadPromise;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Add Roboto font to jsPDF instance
 */
export async function addRobotoToJsPDF(pdf: any): Promise<void> {
  try {
    const fontBase64 = await loadRobotoFont();
    
    // Add font to jsPDF VFS
    pdf.addFileToVFS('Roboto-Regular.ttf', fontBase64);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    pdf.setFont('Roboto', 'normal');
    
    console.log('[PDF] Roboto font added to jsPDF');
  } catch (error) {
    console.warn('[PDF] Could not add Roboto font, falling back to Helvetica:', error);
    // Fallback to Helvetica
    pdf.setFont('helvetica', 'normal');
  }
}

/**
 * Preload Roboto font for faster PDF generation
 * Call this early in the app lifecycle
 */
export function preloadRobotoFont(): void {
  loadRobotoFont().catch(() => {
    // Silently fail - font will be loaded on demand
  });
}
