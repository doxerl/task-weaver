// ============================================
// PDF FONT UTILITIES
// Türkçe karakter desteği için font yükleme
// ============================================

interface FontCache {
  regular: string | null;
  bold: string | null;
}

const fontCache: FontCache = {
  regular: null,
  bold: null,
};

let fontLoadPromise: Promise<FontCache> | null = null;

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
 * Minimum font size for valid Turkish character support (in base64 chars)
 * Roboto Regular with full Unicode should be at least 150KB
 */
const MIN_FONT_SIZE = 150000;

/**
 * Fetch a font file and convert to base64
 */
async function fetchFont(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font fetch failed: ${response.status} - ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  
  console.log('[PDF] Font loaded from:', url, 'size:', base64.length, 'bytes');
  
  // Boyut kontrolü - font eksikse hata fırlat
  if (base64.length < MIN_FONT_SIZE) {
    throw new Error(
      `Font file incomplete: ${url} (${base64.length} bytes, expected >${MIN_FONT_SIZE}). Turkish characters will not render correctly.`
    );
  }
  
  return base64;
}

/**
 * Clear font cache to force reload
 */
export function clearFontCache(): void {
  fontCache.regular = null;
  fontCache.bold = null;
  fontLoadPromise = null;
  console.log('[PDF] Font cache cleared');
}

/**
 * Load Roboto fonts (Regular and Bold) as base64 for jsPDF
 * Fonts are loaded from public/fonts/
 * Throws error if fonts are incomplete (missing Turkish character support)
 */
export async function loadRobotoFonts(): Promise<FontCache> {
  // Return cached fonts if available and valid
  if (fontCache.regular && fontCache.bold) {
    // Validate cached fonts
    if (fontCache.regular.length >= MIN_FONT_SIZE) {
      return fontCache;
    }
    // Cache is invalid, clear it
    clearFontCache();
  }

  // Return existing promise if loading
  if (fontLoadPromise) {
    return fontLoadPromise;
  }

  fontLoadPromise = (async () => {
    try {
      console.log('[PDF] Loading Roboto fonts from /fonts/...');
      
      // Load both fonts in parallel
      const [regular, bold] = await Promise.all([
        fetchFont('/fonts/Roboto-Regular.ttf'),
        fetchFont('/fonts/Roboto-Bold.ttf'),
      ]);

      // Validate font sizes
      if (regular.length < MIN_FONT_SIZE) {
        throw new Error(`Roboto Regular font is incomplete (${regular.length} bytes). Turkish characters will not work.`);
      }

      fontCache.regular = regular;
      fontCache.bold = bold;

      console.log('[PDF] ✓ Roboto fonts loaded successfully');
      console.log('[PDF]   Regular:', Math.round(regular.length / 1024), 'KB');
      console.log('[PDF]   Bold:', Math.round(bold.length / 1024), 'KB');
      
      return fontCache;
    } catch (error) {
      // Clear the promise so it can be retried
      fontLoadPromise = null;
      console.error('[PDF] ✗ Failed to load Roboto fonts:', error);
      throw error;
    }
  })();

  return fontLoadPromise;
}

/**
 * Add Roboto fonts to jsPDF instance
 * This enables proper Turkish character support (ğ, ü, ş, ö, ç, ı, İ, Ğ, Ü, Ş, Ö, Ç)
 */
export async function addRobotoToJsPDF(pdf: any): Promise<void> {
  try {
    const fonts = await loadRobotoFonts();
    
    if (!fonts.regular || !fonts.bold) {
      throw new Error('Fonts not loaded properly');
    }
    
    // Add Regular font
    pdf.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    
    // Add Bold font
    pdf.addFileToVFS('Roboto-Bold.ttf', fonts.bold);
    pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    
    // Set as default font
    pdf.setFont('Roboto', 'normal');
    
    console.log('[PDF] Roboto fonts added to jsPDF successfully');
  } catch (error) {
    console.warn('[PDF] Could not add Roboto fonts, falling back to Helvetica:', error);
    // Fallback to Helvetica (no Turkish support)
    pdf.setFont('helvetica', 'normal');
  }
}

/**
 * Preload Roboto fonts for faster PDF generation
 * Call this early in the app lifecycle
 */
export function preloadRobotoFont(): void {
  loadRobotoFonts().catch(() => {
    // Silently fail - fonts will be loaded on demand
  });
}
