/**
 * Valuation Calculator - Comprehensive Valuation Engine
 * 
 * This module provides multiple valuation methodologies:
 * 1. Revenue Multiple - Market-based valuation
 * 2. EBITDA Multiple - Profitability-based valuation
 * 3. DCF (Discounted Cash Flow) - Future cash flow based valuation
 * 4. VC Method - Investor ROI based valuation
 * 
 * Final valuation is a weighted average of all methods.
 */

import { ValuationBreakdown, ValuationConfiguration, ValuationWeights } from '@/types/simulation';

// =====================================================
// DEFAULT CONFIGURATIONS
// =====================================================

export const DEFAULT_VALUATION_CONFIG: ValuationConfiguration = {
  discountRate: 0.30,           // %30 startup risk discount
  terminalGrowthRate: 0.03,     // %3 terminal growth rate
  expectedROI: 10,              // 10x VC expected return
  capexRatio: 0.10,             // %10 of revenue for CapEx
  taxRate: 0.22,                // %22 corporate tax rate
  weights: {
    revenueMultiple: 0.30,      // Revenue multiple weight
    ebitdaMultiple: 0.25,       // EBITDA multiple weight
    dcf: 0.30,                  // DCF weight
    vcMethod: 0.15              // VC method weight
  }
};

// Sector-specific EBITDA multiples
export const SECTOR_EBITDA_MULTIPLES: Record<string, number> = {
  'SaaS': 15,
  'Fintech': 12,
  'E-ticaret': 8,
  'Marketplace': 10,
  'B2B': 10,
  'B2C': 8,
  'default': 10
};

// =====================================================
// CORE CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization)
 * Uses a simplified approach: Operating Profit * 1.15 (assuming ~15% depreciation add-back)
 */
export const calculateEBITDA = (
  revenue: number, 
  expenses: number
): number => {
  const operatingProfit = revenue - expenses;
  // EBITDA ≈ Operating Profit + ~15% depreciation/amortization assumption
  return operatingProfit * 1.15;
};

/**
 * Calculate EBITDA Margin (%)
 */
export const calculateEBITDAMargin = (ebitda: number, revenue: number): number => {
  if (revenue <= 0) return 0;
  return (ebitda / revenue) * 100;
};

/**
 * Calculate Free Cash Flow (FCF)
 * FCF = EBITDA * (1 - Tax Rate) - CapEx
 */
export const calculateFCF = (
  ebitda: number,
  revenue: number,
  capexRatio: number = 0.10,
  taxRate: number = 0.22
): number => {
  const capex = revenue * capexRatio;
  return (ebitda * (1 - taxRate)) - capex;
};

/**
 * Calculate DCF Valuation (Discounted Cash Flow)
 * Uses 5-year FCF projections + Terminal Value (Gordon Growth Model)
 */
export const calculateDCFValuation = (
  fcfProjections: number[],
  discountRate: number,
  terminalGrowthRate: number
): number => {
  if (fcfProjections.length === 0) return 0;
  
  // 1. Calculate Present Value of FCF for each year
  let pvFCF = 0;
  fcfProjections.forEach((fcf, i) => {
    pvFCF += fcf / Math.pow(1 + discountRate, i + 1);
  });
  
  // 2. Calculate Terminal Value (Gordon Growth Model)
  const terminalFCF = fcfProjections[fcfProjections.length - 1];
  
  // Ensure discount rate is greater than terminal growth rate
  if (discountRate <= terminalGrowthRate) {
    // Fallback: use simple multiple approach
    return pvFCF + (terminalFCF * 5);
  }
  
  const terminalValue = (terminalFCF * (1 + terminalGrowthRate)) / 
                        (discountRate - terminalGrowthRate);
  
  // 3. Discount Terminal Value to present
  const pvTerminal = terminalValue / Math.pow(1 + discountRate, fcfProjections.length);
  
  return pvFCF + pvTerminal;
};

/**
 * Calculate VC Method Valuation
 * Pre-Money Valuation = Expected Exit Value / Required ROI
 */
export const calculateVCValuation = (
  projectedExitValue: number,
  expectedROI: number
): number => {
  if (expectedROI <= 0) return 0;
  return projectedExitValue / expectedROI;
};

/**
 * Calculate Weighted Valuation from all methods
 */
export const calculateWeightedValuation = (
  valuations: Omit<ValuationBreakdown, 'weighted'>,
  weights: ValuationWeights
): number => {
  // Ensure weights sum to 1
  const totalWeight = weights.revenueMultiple + weights.ebitdaMultiple + 
                      weights.dcf + weights.vcMethod;
  
  if (totalWeight === 0) return 0;
  
  const normalizedWeights = {
    revenueMultiple: weights.revenueMultiple / totalWeight,
    ebitdaMultiple: weights.ebitdaMultiple / totalWeight,
    dcf: weights.dcf / totalWeight,
    vcMethod: weights.vcMethod / totalWeight
  };
  
  return (
    valuations.revenueMultiple * normalizedWeights.revenueMultiple +
    valuations.ebitdaMultiple * normalizedWeights.ebitdaMultiple +
    valuations.dcf * normalizedWeights.dcf +
    valuations.vcMethod * normalizedWeights.vcMethod
  );
};

/**
 * Calculate all valuations for a single year projection
 */
export const calculateYearValuations = (
  revenue: number,
  expenses: number,
  sectorMultiple: number,
  ebitdaMultiple: number,
  config: ValuationConfiguration = DEFAULT_VALUATION_CONFIG
): { ebitda: number; ebitdaMargin: number; fcf: number; valuations: Omit<ValuationBreakdown, 'dcf' | 'vcMethod' | 'weighted'> } => {
  const ebitda = calculateEBITDA(revenue, expenses);
  const ebitdaMargin = calculateEBITDAMargin(ebitda, revenue);
  const fcf = calculateFCF(ebitda, revenue, config.capexRatio, config.taxRate);
  
  return {
    ebitda,
    ebitdaMargin,
    fcf,
    valuations: {
      revenueMultiple: revenue * sectorMultiple,
      ebitdaMultiple: ebitda * ebitdaMultiple
    }
  };
};

/**
 * Complete valuation calculation for 5-year projection
 * Returns full ValuationBreakdown including DCF and VC valuations
 */
export const calculateCompleteValuations = (
  yearlyData: Array<{ revenue: number; expenses: number }>,
  sectorMultiple: number,
  ebitdaMultiple: number,
  config: ValuationConfiguration = DEFAULT_VALUATION_CONFIG
): Array<{
  ebitda: number;
  ebitdaMargin: number;
  freeCashFlow: number;
  valuations: ValuationBreakdown;
}> => {
  // First pass: calculate EBITDA and FCF for all years
  const fcfProjections: number[] = [];
  const yearResults = yearlyData.map((year) => {
    const result = calculateYearValuations(
      year.revenue, 
      year.expenses, 
      sectorMultiple, 
      ebitdaMultiple, 
      config
    );
    fcfProjections.push(result.fcf);
    return result;
  });
  
  // Calculate DCF valuation once for all years
  const dcfValue = calculateDCFValuation(
    fcfProjections,
    config.discountRate,
    config.terminalGrowthRate
  );
  
  // Year 5 exit value for VC method
  const year5RevenueMultiple = yearResults[yearResults.length - 1]?.valuations.revenueMultiple || 0;
  const vcValue = calculateVCValuation(year5RevenueMultiple, config.expectedROI);
  
  // Second pass: distribute DCF/VC values and calculate weighted valuation
  return yearResults.map((result, i) => {
    // Distribute DCF and VC values proportionally across years
    const yearRatio = (i + 1) / yearlyData.length;
    
    const fullValuations: ValuationBreakdown = {
      revenueMultiple: result.valuations.revenueMultiple,
      ebitdaMultiple: result.valuations.ebitdaMultiple,
      dcf: dcfValue * yearRatio,
      vcMethod: vcValue * yearRatio,
      weighted: 0 // Will be calculated next
    };
    
    fullValuations.weighted = calculateWeightedValuation(
      fullValuations,
      config.weights
    );
    
    return {
      ebitda: result.ebitda,
      ebitdaMargin: result.ebitdaMargin,
      freeCashFlow: result.fcf,
      valuations: fullValuations
    };
  });
};

/**
 * Get EBITDA multiple for a given sector
 */
export const getEBITDAMultiple = (sector: string): number => {
  return SECTOR_EBITDA_MULTIPLES[sector] || SECTOR_EBITDA_MULTIPLES['default'];
};
