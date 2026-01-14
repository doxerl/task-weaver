/**
 * Formats a number as compact USD (K for thousands, M for millions)
 * Examples: $150.5K, $2.2M, $500
 */
export function formatCompactUSD(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
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
 * Formats a number as compact TRY (K for thousands, M for millions)
 * Examples: ₺150.5K, ₺12.6M, ₺500
 */
export function formatCompactTRY(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}₺${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}₺${(absValue / 1000).toFixed(0)}K`;
  }
  return `${sign}₺${absValue.toFixed(0)}`;
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
