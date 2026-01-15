// ============================================
// PDF FONT UTILITIES
// Open Sans - Türkçe karakter desteği için
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
 * Open Sans with full Unicode should be at least 200KB
 */
const MIN_FONT_SIZE = 200000;

/**
 * Fetch a font file and convert to base64
 */
async function fetchFont(url: string): Promise<string> {
  console.log('[PDF] Fetching font from:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font fetch failed: ${response.status} - ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  
  console.log('[PDF] Font loaded:', url, '→', Math.round(base64.length / 1024), 'KB');
  
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
 * Load Open Sans fonts (Regular and Bold) as base64 for jsPDF
 * Fonts are loaded from public/fonts/
 */
async function loadOpenSansFonts(): Promise<FontCache> {
  // Return cached fonts if available
  if (fontCache.regular && fontCache.bold) {
    console.log('[PDF] Using cached fonts');
    return fontCache;
  }

  // Return existing promise if loading
  if (fontLoadPromise) {
    return fontLoadPromise;
  }

  fontLoadPromise = (async () => {
    try {
      console.log('[PDF] Loading Open Sans fonts from /fonts/...');
      
      // Load both fonts in parallel
      const [regular, bold] = await Promise.all([
        fetchFont('/fonts/OpenSans-Regular.ttf'),
        fetchFont('/fonts/OpenSans-Bold.ttf'),
      ]);

      // Validate font sizes
      if (regular.length < MIN_FONT_SIZE) {
        console.warn('[PDF] Open Sans Regular size:', regular.length, 'bytes (expected >', MIN_FONT_SIZE, ')');
      }

      fontCache.regular = regular;
      fontCache.bold = bold;

      console.log('[PDF] ✓ Open Sans fonts loaded successfully');
      console.log('[PDF]   Regular:', Math.round(regular.length / 1024), 'KB');
      console.log('[PDF]   Bold:', Math.round(bold.length / 1024), 'KB');
      
      return fontCache;
    } catch (error) {
      // Clear the promise so it can be retried
      fontLoadPromise = null;
      console.error('[PDF] ✗ Failed to load Open Sans fonts:', error);
      throw error;
    }
  })();

  return fontLoadPromise;
}

/**
 * Add Open Sans fonts to jsPDF instance
 * This enables proper Turkish character support (ğ, ü, ş, ö, ç, ı, İ, Ğ, Ü, Ş, Ö, Ç)
 */
export async function addOpenSansToJsPDF(pdf: any): Promise<void> {
  try {
    const fonts = await loadOpenSansFonts();
    
    if (!fonts.regular || !fonts.bold) {
      throw new Error('Fonts not loaded properly');
    }
    
    // Add Regular font
    pdf.addFileToVFS('OpenSans-Regular.ttf', fonts.regular);
    pdf.addFont('OpenSans-Regular.ttf', 'OpenSans', 'normal');
    
    // Add Bold font
    pdf.addFileToVFS('OpenSans-Bold.ttf', fonts.bold);
    pdf.addFont('OpenSans-Bold.ttf', 'OpenSans', 'bold');
    
    // Set as default font
    pdf.setFont('OpenSans', 'normal');
    
    console.log('[PDF] ✓ Open Sans fonts added to jsPDF');
  } catch (error) {
    console.error('[PDF] ✗ Font loading error, using helvetica fallback:', error);
    // Fallback to Helvetica (no Turkish support)
    pdf.setFont('helvetica', 'normal');
    throw error; // Re-throw to alert caller
  }
}

// Legacy export for backward compatibility
export const addRobotoToJsPDF = addOpenSansToJsPDF;

/**
 * Preload Open Sans fonts for faster PDF generation
 * Call this early in the app lifecycle
 */
export function preloadFonts(): void {
  loadOpenSansFonts().catch(() => {
    // Silently fail - fonts will be loaded on demand
  });
}

// Legacy alias
export const preloadRobotoFont = preloadFonts;
