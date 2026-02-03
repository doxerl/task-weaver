/**
 * Unified Valuation Service
 *
 * Single source of truth for valuation calculations across the application.
 * Ensures consistent valuations between GrowthROICard, exit planning, and investor analysis.
 *
 * Features:
 * - Dynamic sector-based multiples with Rule of 40 adjustment
 * - Valuation range (low-mid-high) instead of single number
 * - Full methodology transparency with assumptions list
 * - Integrates with existing valuation calculator functions
 */

import {
  calculateDynamicMultiple,
  calculateEBITDA,
  calculateFCF,
  calculateDCFValuation,
  calculateVCValuation,
  calculateWeightedValuation,
  getEBITDAMultiple,
  DEFAULT_VALUATION_CONFIG,
  DynamicMultipleResult,
} from './valuationCalculator';

import {
  ValuationBreakdown,
  ValuationConfiguration,
  SECTOR_MULTIPLES,
} from '@/types/simulation';

// =====================================================
// TYPES
// =====================================================

/**
 * Input for unified valuation calculation
 */
export interface UnifiedValuationInput {
  /** Annual revenue */
  revenue: number;
  /** Annual expenses */
  expenses: number;
  /** Revenue growth rate as decimal (0.50 = 50%) */
  growthRate: number;
  /** Company sector for multiple selection */
  sector: string;
  /** Optional custom valuation configuration */
  config?: ValuationConfiguration;
}

/**
 * Comprehensive result from unified valuation
 */
export interface UnifiedValuationResult {
  /** Primary weighted valuation */
  weightedValuation: number;

  /** Valuation range for uncertainty communication */
  valuationRange: {
    /** Conservative estimate (25% below mid) */
    low: number;
    /** Base case estimate */
    mid: number;
    /** Optimistic estimate (25% above mid) */
    high: number;
  };

  /** Individual valuation method results */
  breakdown: ValuationBreakdown;

  /** Dynamic multiple information */
  multipleInfo: DynamicMultipleResult;

  /** Calculated financial metrics */
  metrics: {
    ebitda: number;
    ebitdaMargin: number;
    freeCashFlow: number;
    profitMargin: number;
  };

  /** Human-readable methodology description */
  methodology: string;

  /** List of assumptions made in calculation */
  assumptions: string[];
}

/**
 * Simple valuation result for quick calculations
 */
export interface SimpleValuationResult {
  valuation: number;
  multiple: number;
  sector: string;
  ruleOf40Score: number;
}

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Calculate unified valuation with all methods and full transparency
 *
 * This is the primary function for consistent valuations across the app.
 * Use this instead of ad-hoc calculations in components.
 *
 * @param input - Revenue, expenses, growth rate, and sector
 * @returns Comprehensive valuation result with breakdown and methodology
 *
 * @example
 * const result = calculateUnifiedValuation({
 *   revenue: 500000,
 *   expenses: 400000,
 *   growthRate: 0.50,
 *   sector: 'SaaS'
 * });
 * console.log(result.valuationRange); // { low: 2.1M, mid: 2.8M, high: 3.5M }
 */
export const calculateUnifiedValuation = (
  input: UnifiedValuationInput
): UnifiedValuationResult => {
  const config = input.config || DEFAULT_VALUATION_CONFIG;

  // Calculate profit and margin
  const profit = input.revenue - input.expenses;
  const profitMargin = input.revenue > 0 ? profit / input.revenue : 0;

  // Get dynamic multiple with Rule of 40 adjustment
  const multipleResult = calculateDynamicMultiple(
    input.sector,
    input.growthRate,
    profitMargin
  );

  // Calculate EBITDA and related metrics
  const ebitda = calculateEBITDA(input.revenue, input.expenses);
  const ebitdaMargin = input.revenue > 0 ? (ebitda / input.revenue) * 100 : 0;
  const ebitdaMultiple = getEBITDAMultiple(input.sector);

  // Calculate individual valuations
  const revenueMultipleVal = input.revenue * multipleResult.adjustedMultiple;
  const ebitdaMultipleVal = ebitda * ebitdaMultiple;

  // Calculate FCF for current year (for DCF base)
  const fcf = calculateFCF(ebitda, input.revenue, config.capexRatio, config.taxRate);

  // Project 5 years of FCF for DCF calculation
  const fcfProjections: number[] = [];
  let projectedRevenue = input.revenue;
  let projectedExpenses = input.expenses;

  for (let i = 0; i < 5; i++) {
    // Apply growth with decay
    const yearGrowth = input.growthRate * Math.pow(0.85, i);
    projectedRevenue = projectedRevenue * (1 + yearGrowth);
    projectedExpenses = projectedExpenses * (1 + yearGrowth * 0.6);

    const projectedEbitda = calculateEBITDA(projectedRevenue, projectedExpenses);
    const projectedFcf = calculateFCF(
      projectedEbitda,
      projectedRevenue,
      config.capexRatio,
      config.taxRate
    );
    fcfProjections.push(projectedFcf);
  }

  // Calculate DCF valuation
  const dcfValue = calculateDCFValuation(
    fcfProjections,
    config.discountRate,
    config.terminalGrowthRate
  );

  // Calculate VC method valuation
  // Year 5 exit value based on projected revenue
  const year5Revenue = fcfProjections.length > 0
    ? projectedRevenue
    : input.revenue * Math.pow(1 + input.growthRate, 5);
  const year5ExitValue = year5Revenue * multipleResult.baseMultiple;
  const vcValue = calculateVCValuation(year5ExitValue, config.expectedROI);

  // Assemble breakdown
  const breakdown: ValuationBreakdown = {
    revenueMultiple: revenueMultipleVal,
    ebitdaMultiple: ebitdaMultipleVal,
    dcf: dcfValue,
    vcMethod: vcValue,
    weighted: 0,
  };

  // Calculate weighted valuation
  breakdown.weighted = calculateWeightedValuation(breakdown, config.weights);

  // Calculate valuation range (±25% spread)
  const rangeSpread = 0.25;
  const valuationRange = {
    low: breakdown.weighted * (1 - rangeSpread),
    mid: breakdown.weighted,
    high: breakdown.weighted * (1 + rangeSpread),
  };

  // Build methodology description
  const methodology = `Ağırlıklı ortalama (4 metod): Gelir Çarpanı (%${(config.weights.revenueMultiple * 100).toFixed(0)}), EBITDA Çarpanı (%${(config.weights.ebitdaMultiple * 100).toFixed(0)}), DCF (%${(config.weights.dcf * 100).toFixed(0)}), VC Metodu (%${(config.weights.vcMethod * 100).toFixed(0)})`;

  // Build assumptions list
  const assumptions = [
    `Sektör: ${input.sector} (baz çarpan: ${multipleResult.baseMultiple}x)`,
    `Büyüme oranı: %${(input.growthRate * 100).toFixed(1)}`,
    `Kâr marjı: %${(profitMargin * 100).toFixed(1)}`,
    `Rule of 40 skoru: ${multipleResult.ruleOf40Score.toFixed(0)} → ${multipleResult.adjustmentReason}`,
    `Ayarlı çarpan: ${multipleResult.adjustedMultiple.toFixed(2)}x`,
    `İskonto oranı: %${(config.discountRate * 100).toFixed(0)}`,
    `Terminal büyüme: %${(config.terminalGrowthRate * 100).toFixed(0)}`,
  ];

  return {
    weightedValuation: breakdown.weighted,
    valuationRange,
    breakdown,
    multipleInfo: multipleResult,
    metrics: {
      ebitda,
      ebitdaMargin,
      freeCashFlow: fcf,
      profitMargin: profitMargin * 100,
    },
    methodology,
    assumptions,
  };
};

/**
 * Quick valuation calculation for simple use cases
 *
 * @param revenue - Annual revenue
 * @param expenses - Annual expenses
 * @param sector - Company sector
 * @returns Simple valuation with multiple info
 */
export const calculateSimpleValuation = (
  revenue: number,
  expenses: number,
  sector: string
): SimpleValuationResult => {
  const profit = revenue - expenses;
  const profitMargin = revenue > 0 ? profit / revenue : 0;

  // Estimate growth rate from profit margin (simple heuristic)
  const estimatedGrowthRate = Math.max(0.1, Math.min(0.5, profitMargin + 0.2));

  const multipleResult = calculateDynamicMultiple(sector, estimatedGrowthRate, profitMargin);

  return {
    valuation: revenue * multipleResult.adjustedMultiple,
    multiple: multipleResult.adjustedMultiple,
    sector,
    ruleOf40Score: multipleResult.ruleOf40Score,
  };
};

/**
 * Calculate MOIC (Multiple on Invested Capital) using unified valuation
 *
 * @param investment - Total investment amount
 * @param revenue - Company revenue at exit
 * @param expenses - Company expenses at exit
 * @param sector - Company sector
 * @param growthRate - Revenue growth rate
 * @returns MOIC value
 */
export const calculateMOIC = (
  investment: number,
  revenue: number,
  expenses: number,
  sector: string,
  growthRate: number
): number => {
  if (investment <= 0) return 0;

  const result = calculateUnifiedValuation({
    revenue,
    expenses,
    growthRate,
    sector,
  });

  return result.weightedValuation / investment;
};

/**
 * Get available sectors for valuation
 */
export const getAvailableSectors = (): string[] => {
  return Object.keys(SECTOR_MULTIPLES);
};

/**
 * Get sector multiple information
 */
export const getSectorInfo = (sector: string): {
  sector: string;
  revenueMultiple: number;
  ebitdaMultiple: number;
} => {
  return {
    sector,
    revenueMultiple: SECTOR_MULTIPLES[sector] || SECTOR_MULTIPLES['Consulting'] || 3,
    ebitdaMultiple: getEBITDAMultiple(sector),
  };
};
