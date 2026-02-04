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

import { ValuationBreakdown, ValuationConfiguration, ValuationWeights, SECTOR_MULTIPLES } from '@/types/simulation';

// =====================================================
// DYNAMIC MULTIPLE CALCULATION (Rule of 40)
// =====================================================

/**
 * Result of dynamic multiple calculation with Rule of 40 adjustment
 */
export interface DynamicMultipleResult {
  /** Base sector multiple before adjustments */
  baseMultiple: number;
  /** Adjusted multiple after Rule of 40 consideration */
  adjustedMultiple: number;
  /** Human-readable explanation for the adjustment */
  adjustmentReason: string;
  /** Rule of 40 score (growth rate % + profit margin %) */
  ruleOf40Score: number;
  /** Adjustment percentage applied (-25% to +15%) */
  adjustmentPercentage: number;
}

/**
 * Calculate dynamic valuation multiple using Rule of 40 adjustment
 *
 * Rule of 40: Growth Rate + Profit Margin should >= 40% for healthy SaaS/tech companies
 * This function adjusts the base sector multiple based on the company's Rule of 40 score.
 *
 * @param sector - Company sector (e.g., 'SaaS', 'Fintech', 'E-commerce')
 * @param growthRate - Revenue growth rate as decimal (e.g., 0.50 for 50%)
 * @param profitMargin - Net profit margin as decimal (e.g., 0.15 for 15%)
 * @returns DynamicMultipleResult with base and adjusted multiples
 *
 * @example
 * // SaaS company with 50% growth and 10% margin (Rule of 40 = 60)
 * calculateDynamicMultiple('SaaS', 0.50, 0.10)
 * // Returns: { baseMultiple: 8, adjustedMultiple: 9.2, ruleOf40Score: 60, ... }
 */
export const calculateDynamicMultiple = (
  sector: string,
  growthRate: number,
  profitMargin: number
): DynamicMultipleResult => {
  // Get base multiple from sector, fallback to 'Consulting' (3x) as most conservative
  const baseMultiple = SECTOR_MULTIPLES[sector] || SECTOR_MULTIPLES['Consulting'] || 3;

  // Calculate Rule of 40 score
  // Clamp growth rate and profit margin to reasonable bounds
  const clampedGrowthRate = Math.max(-1, Math.min(2, growthRate)); // -100% to 200%
  const clampedProfitMargin = Math.max(-1, Math.min(1, profitMargin)); // -100% to 100%
  const ruleOf40Score = (clampedGrowthRate * 100) + (clampedProfitMargin * 100);

  // Determine adjustment based on Rule of 40 score
  let adjustmentPercentage: number;
  let adjustmentReason: string;

  if (ruleOf40Score >= 50) {
    adjustmentPercentage = 0.15;
    adjustmentReason = 'Premium: Güçlü Rule of 40 skoru (büyüme + marj >= 50%)';
  } else if (ruleOf40Score >= 40) {
    adjustmentPercentage = 0;
    adjustmentReason = 'Adil: Rule of 40 benchmark karşılandı';
  } else if (ruleOf40Score >= 30) {
    adjustmentPercentage = -0.10;
    adjustmentReason = 'İskonto: Rule of 40 altında (skor 30-40)';
  } else if (ruleOf40Score >= 20) {
    adjustmentPercentage = -0.20;
    adjustmentReason = 'Yüksek iskonto: Rule of 40 önemli ölçüde altında (skor 20-30)';
  } else {
    adjustmentPercentage = -0.25;
    adjustmentReason = 'Derin iskonto: Rule of 40 çok altında (skor < 20)';
  }

  const adjustedMultiple = baseMultiple * (1 + adjustmentPercentage);

  return {
    baseMultiple,
    adjustedMultiple,
    adjustmentReason,
    ruleOf40Score,
    adjustmentPercentage
  };
};

/**
 * Get sector multiple with optional Rule of 40 adjustment
 * Convenience function for simple sector multiple lookup
 */
export const getSectorMultiple = (
  sector: string,
  applyRuleOf40?: { growthRate: number; profitMargin: number }
): number => {
  if (applyRuleOf40) {
    return calculateDynamicMultiple(
      sector,
      applyRuleOf40.growthRate,
      applyRuleOf40.profitMargin
    ).adjustedMultiple;
  }
  return SECTOR_MULTIPLES[sector] || SECTOR_MULTIPLES['Consulting'] || 3;
};

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

// =====================================================
// STAGE-BASED VALUATION WEIGHTS
// =====================================================

/**
 * Company stage for valuation weight selection
 */
export type CompanyStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'growth';

/**
 * Stage-based valuation weight presets
 *
 * Rationale:
 * - Early stage (Pre-seed/Seed): Revenue multiple + VC method more relevant
 *   because EBITDA is usually negative and DCF has high uncertainty
 * - Growth stage (Series B+): EBITDA and DCF become more meaningful
 *   as company reaches profitability
 */
export const STAGE_BASED_WEIGHTS: Record<CompanyStage, ValuationWeights> = {
  'pre-seed': {
    revenueMultiple: 0.40,  // Revenue-based is most reliable at this stage
    ebitdaMultiple: 0.05,   // Usually negative, minimal weight
    dcf: 0.15,              // High uncertainty, lower weight
    vcMethod: 0.40,         // Comparable deals + target ROI approach
  },
  'seed': {
    revenueMultiple: 0.35,
    ebitdaMultiple: 0.10,
    dcf: 0.20,
    vcMethod: 0.35,
  },
  'series-a': {
    revenueMultiple: 0.30,
    ebitdaMultiple: 0.20,
    dcf: 0.30,
    vcMethod: 0.20,
  },
  'series-b': {
    revenueMultiple: 0.25,
    ebitdaMultiple: 0.30,   // EBITDA becoming meaningful
    dcf: 0.35,              // Cash flow projections more reliable
    vcMethod: 0.10,
  },
  'growth': {
    revenueMultiple: 0.20,
    ebitdaMultiple: 0.35,   // Profitability is key
    dcf: 0.40,              // Strong cash flow visibility
    vcMethod: 0.05,         // Less VC-focused at this stage
  },
};

/**
 * Get valuation weights based on company stage
 *
 * @param stage - Company funding stage
 * @returns Appropriate valuation weights for the stage
 */
export const getWeightsByStage = (stage: CompanyStage): ValuationWeights => {
  return STAGE_BASED_WEIGHTS[stage] || DEFAULT_VALUATION_CONFIG.weights;
};

/**
 * Get valuation configuration with stage-appropriate weights
 *
 * @param stage - Company funding stage (optional, defaults to 'seed')
 * @param overrides - Additional configuration overrides
 * @returns Complete valuation configuration
 */
export const getValuationConfigByStage = (
  stage: CompanyStage = 'seed',
  overrides?: Partial<ValuationConfiguration>
): ValuationConfiguration => {
  return {
    ...DEFAULT_VALUATION_CONFIG,
    weights: getWeightsByStage(stage),
    ...overrides,
  };
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
 *
 * CORRECTED FORMULA: EBITDA = Revenue - COGS - Opex
 * The previous approach of multiplying by 1.15 was conceptually incorrect.
 *
 * For startups, EBITDA is simply the operating profit before non-cash charges.
 * Since most startups don't have significant D&A, we use: EBITDA ≈ Operating Profit
 *
 * @param revenue - Total revenue
 * @param expenses - Total operating expenses (COGS + Opex)
 * @returns EBITDA value (can be negative for loss-making companies)
 */
export const calculateEBITDA = (
  revenue: number,
  expenses: number
): number => {
  // EBITDA = Revenue - Operating Expenses
  // This is the correct definition for startup valuation
  return revenue - expenses;
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
 *
 * CORRECTED FORMULA: FCF = EBITDA × (1 - effectiveTaxRate) - CapEx
 *
 * CRITICAL FIX: Tax rate should be 0 when EBITDA is negative.
 * Startups with losses don't pay taxes and accumulate NOLs.
 *
 * @param ebitda - EBITDA value (can be negative)
 * @param revenue - Total revenue for CapEx calculation
 * @param capexRatio - CapEx as percentage of revenue (default: 10%)
 * @param taxRate - Statutory tax rate (default: 22%)
 * @returns Free Cash Flow value
 */
export const calculateFCF = (
  ebitda: number,
  revenue: number,
  capexRatio: number = 0.10,
  taxRate: number = 0.22
): number => {
  const capex = revenue * capexRatio;

  // CRITICAL: If EBITDA is negative, effective tax rate is 0
  // Startups with losses don't pay taxes
  const effectiveTaxRate = ebitda > 0 ? taxRate : 0;

  return (ebitda * (1 - effectiveTaxRate)) - capex;
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
 *
 * ENHANCED: Automatically handles negative EBITDA by redistributing weights.
 * When EBITDA multiple valuation is negative or zero, its weight is
 * distributed proportionally to other methods.
 *
 * @param valuations - Individual valuation results from each method
 * @param weights - Weights for each valuation method
 * @returns Weighted average valuation
 */
export const calculateWeightedValuation = (
  valuations: Omit<ValuationBreakdown, 'weighted'>,
  weights: ValuationWeights
): number => {
  // Create mutable copy of weights
  const adjustedWeights = { ...weights };

  // CRITICAL FIX: If EBITDA multiple is negative or zero, disable it
  // and redistribute weight to other methods
  if (valuations.ebitdaMultiple <= 0) {
    const redistributeWeight = adjustedWeights.ebitdaMultiple;
    adjustedWeights.ebitdaMultiple = 0;

    // Redistribute to other positive methods proportionally
    const otherMethodsWeight =
      adjustedWeights.revenueMultiple +
      adjustedWeights.dcf +
      adjustedWeights.vcMethod;

    if (otherMethodsWeight > 0) {
      const redistributionRatio = redistributeWeight / otherMethodsWeight;
      adjustedWeights.revenueMultiple *= 1 + redistributionRatio;
      adjustedWeights.dcf *= 1 + redistributionRatio;
      adjustedWeights.vcMethod *= 1 + redistributionRatio;
    }
  }

  // Similarly handle negative DCF (rare but possible)
  if (valuations.dcf <= 0) {
    const redistributeWeight = adjustedWeights.dcf;
    adjustedWeights.dcf = 0;

    const otherMethodsWeight =
      adjustedWeights.revenueMultiple +
      adjustedWeights.ebitdaMultiple +
      adjustedWeights.vcMethod;

    if (otherMethodsWeight > 0) {
      const redistributionRatio = redistributeWeight / otherMethodsWeight;
      adjustedWeights.revenueMultiple *= 1 + redistributionRatio;
      adjustedWeights.ebitdaMultiple *= 1 + redistributionRatio;
      adjustedWeights.vcMethod *= 1 + redistributionRatio;
    }
  }

  // Ensure weights sum to 1
  const totalWeight =
    adjustedWeights.revenueMultiple +
    adjustedWeights.ebitdaMultiple +
    adjustedWeights.dcf +
    adjustedWeights.vcMethod;

  if (totalWeight === 0) return 0;

  const normalizedWeights = {
    revenueMultiple: adjustedWeights.revenueMultiple / totalWeight,
    ebitdaMultiple: adjustedWeights.ebitdaMultiple / totalWeight,
    dcf: adjustedWeights.dcf / totalWeight,
    vcMethod: adjustedWeights.vcMethod / totalWeight,
  };

  // Only include positive valuations in the calculation
  let weightedSum = 0;
  let usedWeight = 0;

  if (valuations.revenueMultiple > 0) {
    weightedSum += valuations.revenueMultiple * normalizedWeights.revenueMultiple;
    usedWeight += normalizedWeights.revenueMultiple;
  }
  if (valuations.ebitdaMultiple > 0) {
    weightedSum += valuations.ebitdaMultiple * normalizedWeights.ebitdaMultiple;
    usedWeight += normalizedWeights.ebitdaMultiple;
  }
  if (valuations.dcf > 0) {
    weightedSum += valuations.dcf * normalizedWeights.dcf;
    usedWeight += normalizedWeights.dcf;
  }
  if (valuations.vcMethod > 0) {
    weightedSum += valuations.vcMethod * normalizedWeights.vcMethod;
    usedWeight += normalizedWeights.vcMethod;
  }

  // Normalize to account for excluded methods
  return usedWeight > 0 ? weightedSum / usedWeight : 0;
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
