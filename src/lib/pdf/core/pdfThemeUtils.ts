// ============================================
// PDF TEMA MODÜLÜ
// Tema renklerini PDF için çıkarır ve uygular
// ============================================

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  card: string;
  cardForeground: string;
}

/**
 * CSS değişkenlerinden tema renklerini çıkarır
 */
export function extractThemeColors(): ThemeColors {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  
  const getColor = (varName: string): string => {
    const value = computed.getPropertyValue(varName).trim();
    if (!value) return '#000000';
    
    // HSL değerini RGB'ye çevir
    if (value.includes(' ')) {
      // HSL format: "210 40% 98%"
      const [h, s, l] = value.split(' ').map(v => parseFloat(v.replace('%', '')));
      return hslToHex(h, s, l);
    }
    
    return value;
  };
  
  return {
    background: getColor('--background'),
    foreground: getColor('--foreground'),
    primary: getColor('--primary'),
    primaryForeground: getColor('--primary-foreground'),
    secondary: getColor('--secondary'),
    secondaryForeground: getColor('--secondary-foreground'),
    muted: getColor('--muted'),
    mutedForeground: getColor('--muted-foreground'),
    accent: getColor('--accent'),
    accentForeground: getColor('--accent-foreground'),
    destructive: getColor('--destructive'),
    border: getColor('--border'),
    card: getColor('--card'),
    cardForeground: getColor('--card-foreground'),
  };
}

/**
 * HSL değerini Hex'e çevirir
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Hex'i RGB tuple'a çevirir
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

/**
 * Tema renklerini PDF elementlerine uygular
 */
export function applyThemeColorsToPdfElements(element: HTMLElement): void {
  const colors = extractThemeColors();
  
  // Background rengi uygula
  element.style.backgroundColor = colors.background;
  element.style.color = colors.foreground;
  
  // Card'lara stil uygula
  element.querySelectorAll('.card, [class*="Card"]').forEach(card => {
    const el = card as HTMLElement;
    el.style.backgroundColor = colors.card;
    el.style.color = colors.cardForeground;
    el.style.borderColor = colors.border;
  });
  
  // Primary butonlar (PDF'te görünmeyecek ama varsa)
  element.querySelectorAll('.bg-primary, [class*="primary"]').forEach(btn => {
    const el = btn as HTMLElement;
    el.style.backgroundColor = colors.primary;
    el.style.color = colors.primaryForeground;
  });
  
  // Muted elementler
  element.querySelectorAll('.text-muted-foreground, .muted').forEach(el => {
    (el as HTMLElement).style.color = colors.mutedForeground;
  });
}

/**
 * PDF için tema bazlı CSS string oluşturur
 */
export function createThemeStylesForPdf(): string {
  const colors = extractThemeColors();
  
  return `
    body, .pdf-content {
      background-color: ${colors.background};
      color: ${colors.foreground};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .card, [class*="Card"] {
      background-color: ${colors.card};
      color: ${colors.cardForeground};
      border: 1px solid ${colors.border};
    }
    
    h1, h2, h3, h4, h5, h6 {
      color: ${colors.foreground};
    }
    
    .text-muted-foreground {
      color: ${colors.mutedForeground};
    }
    
    table {
      border-color: ${colors.border};
    }
    
    th {
      background-color: ${colors.muted};
      color: ${colors.foreground};
    }
    
    td {
      border-color: ${colors.border};
    }
    
    /* Print-specific overrides */
    @media print {
      * {
        print-color-adjust: exact !important;
        -webkit-print-color-adjust: exact !important;
      }
    }
  `;
}

/**
 * Light/Dark mode'u algılar
 */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * PDF için light mode stillerini zorlar
 * Koyu arka planlar yazdırma için iyi değil
 */
export function forceLightModeForPdf(element: HTMLElement): void {
  // Dark mode class'larını kaldır
  element.classList.remove('dark');
  element.querySelectorAll('.dark').forEach(el => {
    el.classList.remove('dark');
  });
  
  // Koyu arka planları açık yap
  element.querySelectorAll('[class*="bg-gray-9"], [class*="bg-slate-9"], [class*="bg-zinc-9"]').forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.backgroundColor = '#ffffff';
    htmlEl.style.color = '#1f2937';
  });
  
  // Dark mode CSS değişkenlerini light mode'a çevir
  element.style.setProperty('--background', '0 0% 100%');
  element.style.setProperty('--foreground', '222.2 84% 4.9%');
}

/**
 * Kontrast oranını hesaplar (WCAG)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const luminance = (rgb: [number, number, number]) => {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}
