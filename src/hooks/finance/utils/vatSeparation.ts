// Centralized VAT Separation Utility
// Used by all financial hooks for consistent VAT calculation

export interface VatSeparationResult {
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
  vatRate: number;
}

export interface VatSeparableTransaction {
  amount?: number | null;
  total_amount?: number | null;
  net_amount?: number | null;
  vat_amount?: number | null;
  vat_rate?: number | null;
  is_commercial?: boolean | null;
}

/**
 * Separates VAT from a transaction or receipt amount
 * Priority:
 * 1. Use existing net_amount and vat_amount if available
 * 2. Check is_commercial flag - if false, no VAT
 * 3. Use vat_rate if available
 * 4. Default to 20% VAT for commercial transactions
 */
export function separateVat(transaction: VatSeparableTransaction): VatSeparationResult {
  const gross = Math.abs(transaction.amount ?? transaction.total_amount ?? 0);
  
  // Priority 1: Use existing calculated values
  if (transaction.net_amount != null && transaction.vat_amount != null) {
    return {
      grossAmount: gross,
      netAmount: Math.abs(transaction.net_amount),
      vatAmount: Math.abs(transaction.vat_amount),
      vatRate: transaction.vat_rate ?? 20
    };
  }
  
  // Priority 2: Non-commercial transactions have no VAT
  const isCommercial = transaction.is_commercial !== false;
  if (!isCommercial) {
    return { grossAmount: gross, netAmount: gross, vatAmount: 0, vatRate: 0 };
  }
  
  // Priority 3: Use vat_amount if available
  if (transaction.vat_amount != null && transaction.vat_amount > 0) {
    const vatAmount = Math.abs(transaction.vat_amount);
    return {
      grossAmount: gross,
      netAmount: gross - vatAmount,
      vatAmount,
      vatRate: transaction.vat_rate ?? 20
    };
  }
  
  // Priority 4: Calculate from vat_rate or default 20%
  const vatRate = transaction.vat_rate ?? 20;
  const netAmount = gross / (1 + vatRate / 100);
  const vatAmount = gross - netAmount;
  
  return { grossAmount: gross, netAmount, vatAmount, vatRate };
}

/**
 * Calculate VAT from gross amount at a given rate
 */
export function calculateVatFromGross(grossAmount: number, vatRate: number = 20): VatSeparationResult {
  const net = grossAmount / (1 + vatRate / 100);
  const vat = grossAmount - net;
  return {
    grossAmount,
    netAmount: net,
    vatAmount: vat,
    vatRate
  };
}

/**
 * Calculate VAT from net amount at a given rate
 */
export function calculateVatFromNet(netAmount: number, vatRate: number = 20): VatSeparationResult {
  const vat = netAmount * (vatRate / 100);
  const gross = netAmount + vat;
  return {
    grossAmount: gross,
    netAmount,
    vatAmount: vat,
    vatRate
  };
}
