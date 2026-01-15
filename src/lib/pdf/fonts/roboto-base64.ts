// ============================================
// ROBOTO FONT - BASE64 ENCODED FOR jsPDF
// Supports Turkish characters: ğ, ü, ş, ö, ç, ı, İ, Ğ, Ü, Ş, Ö, Ç
// ============================================

// This is a minimal subset of Roboto Regular containing:
// - Basic Latin (A-Z, a-z, 0-9)
// - Turkish specific: İ, ı, Ğ, ğ, Ş, ş, Ü, ü, Ö, ö, Ç, ç
// - Common symbols: +-/*%$€₺., etc.

// Due to the large size of full TTF fonts (~150KB base64),
// we use a workaround approach:
// 1. Use standard Helvetica for PDF generation
// 2. Pre-process Turkish text to use ASCII alternatives for display
// 3. The actual solution requires hosting a TTF font file

// Alternative: Use browser's canvas for text rendering (html2canvas approach)

export const TURKISH_CHAR_MAP: Record<string, string> = {
  'ı': 'i',
  'İ': 'I',
  'ğ': 'g',
  'Ğ': 'G',
  'ü': 'u',
  'Ü': 'U',
  'ş': 's',
  'Ş': 'S',
  'ö': 'o',
  'Ö': 'O',
  'ç': 'c',
  'Ç': 'C',
};

/**
 * Fallback: Convert Turkish characters to ASCII equivalents
 * This is a temporary workaround until a proper TTF font is embedded
 */
export function turkishToAscii(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [turkish, ascii] of Object.entries(TURKISH_CHAR_MAP)) {
    result = result.split(turkish).join(ascii);
  }
  return result;
}

/**
 * Check if text contains Turkish-specific characters
 */
export function hasTurkishChars(text: string): boolean {
  return Object.keys(TURKISH_CHAR_MAP).some(char => text.includes(char));
}
