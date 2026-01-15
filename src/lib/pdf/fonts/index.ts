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
 * Fetch a font file and convert to base64
 */
async function fetchFont(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font fetch failed: ${response.status} - ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
}

/**
 * Load Roboto fonts (Regular and Bold) as base64 for jsPDF
 * Fonts are loaded from public/fonts/
 */
export async function loadRobotoFonts(): Promise<FontCache> {
  // Return cached fonts if available
  if (fontCache.regular && fontCache.bold) {
    return fontCache;
  }

  // Return existing promise if loading
  if (fontLoadPromise) {
    return fontLoadPromise;
  }

  fontLoadPromise = (async () => {
    try {
      console.log('[PDF] Loading Roboto fonts...');
      
      // Load both fonts in parallel
      const [regular, bold] = await Promise.all([
        fetchFont('/fonts/Roboto-Regular.ttf'),
        fetchFont('/fonts/Roboto-Bold.ttf'),
      ]);

      fontCache.regular = regular;
      fontCache.bold = bold;

      console.log('[PDF] Roboto fonts loaded - Regular:', regular.length, 'bytes, Bold:', bold.length, 'bytes');
      
      return fontCache;
    } catch (error) {
      console.error('[PDF] Failed to load Roboto fonts:', error);
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
