/**
 * Universal compact currency formatter
 * Formats a number as compact with proper currency symbol (K for thousands, M for millions)
 * Examples: $73.1K, ₺2.9M, $500, ₺1.2M
 */
export function formatCompact(value: number, currencyCode: 'TRY' | 'USD' = 'TRY'): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const symbol = currencyCode === 'USD' ? '$' : '₺';
  
  if (absValue >= 1000000) {
    return `${sign}${symbol}${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}${symbol}${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}${symbol}${absValue.toFixed(0)}`;
}

/**
 * @deprecated Use formatCompact(value, 'USD') instead
 */
export function formatCompactUSD(value: number): string {
  return formatCompact(value, 'USD');
}

/**
 * Formats a number as full USD with thousand separators
 * Examples: $150,549, $2,188,068
 */
export function formatFullUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * @deprecated Use formatCompact(value, 'TRY') instead
 */
export function formatCompactTRY(value: number): string {
  return formatCompact(value, 'TRY');
}

/**
 * Formats a number as full TRY with thousand separators
 * Examples: ₺150.549, ₺2.188.068
 */
export function formatFullTRY(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
