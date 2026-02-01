import { useCallback, useMemo } from 'react';
import { QUARTERS, type Quarter } from '@/constants/simulation';

/**
 * Quarterly amounts interface
 */
export interface QuarterlyAmounts {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

/**
 * Optional quarterly input (from projections)
 */
export interface OptionalQuarterly {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
}

/**
 * Projection item with quarterly data
 */
export interface ProjectionItem {
  category: string;
  projectedAmount: number;
  projectedQuarterly?: OptionalQuarterly;
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  total?: number;
}

/**
 * Hook for quarterly calculation utilities
 * Centralizes all quarterly math operations to reduce code duplication
 */
export function useQuarterlyCalculations() {
  /**
   * Calculate quarterly values from a projection item
   * If quarterly values exist, use them; otherwise divide annual by 4
   */
  const calculateQuarterly = useCallback((item: ProjectionItem): QuarterlyAmounts => {
    const defaultQuarter = item.projectedAmount / 4;
    const q1 = item.projectedQuarterly?.q1 ?? item.q1 ?? defaultQuarter;
    const q2 = item.projectedQuarterly?.q2 ?? item.q2 ?? defaultQuarter;
    const q3 = item.projectedQuarterly?.q3 ?? item.q3 ?? defaultQuarter;
    const q4 = item.projectedQuarterly?.q4 ?? item.q4 ?? defaultQuarter;
    return { q1, q2, q3, q4, total: q1 + q2 + q3 + q4 };
  }, []);

  /**
   * Calculate quarterly values with growth multiplier
   */
  const calculateQuarterlyWithGrowth = useCallback((
    baseQuarterly: OptionalQuarterly | undefined,
    baseAmount: number,
    growthMultiplier: number
  ): QuarterlyAmounts => {
    const defaultQuarter = baseAmount / 4;
    const q1 = Math.round((baseQuarterly?.q1 ?? defaultQuarter) * growthMultiplier);
    const q2 = Math.round((baseQuarterly?.q2 ?? defaultQuarter) * growthMultiplier);
    const q3 = Math.round((baseQuarterly?.q3 ?? defaultQuarter) * growthMultiplier);
    const q4 = Math.round((baseQuarterly?.q4 ?? defaultQuarter) * growthMultiplier);
    return { q1, q2, q3, q4, total: q1 + q2 + q3 + q4 };
  }, []);

  /**
   * Sum multiple quarterly amounts
   */
  const sumQuarterly = useCallback((items: QuarterlyAmounts[]): QuarterlyAmounts => {
    return items.reduce((acc, item) => ({
      q1: acc.q1 + item.q1,
      q2: acc.q2 + item.q2,
      q3: acc.q3 + item.q3,
      q4: acc.q4 + item.q4,
      total: acc.total + item.total,
    }), { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 });
  }, []);

  /**
   * Calculate total from quarterly values
   */
  const getQuarterlyTotal = useCallback((item: OptionalQuarterly): number => {
    return (item.q1 ?? 0) + (item.q2 ?? 0) + (item.q3 ?? 0) + (item.q4 ?? 0);
  }, []);

  /**
   * Map projection items to quarterly comparison data
   */
  const mapToQuarterlyData = useCallback(<T extends ProjectionItem>(
    items: T[]
  ): QuarterlyAmounts[] => {
    return items.map(item => calculateQuarterly(item));
  }, [calculateQuarterly]);

  /**
   * Create quarterly object from array of values (index 0-3 = Q1-Q4)
   */
  const arrayToQuarterly = useCallback((values: number[]): QuarterlyAmounts => {
    const q1 = values[0] ?? 0;
    const q2 = values[1] ?? 0;
    const q3 = values[2] ?? 0;
    const q4 = values[3] ?? 0;
    return { q1, q2, q3, q4, total: q1 + q2 + q3 + q4 };
  }, []);

  /**
   * Extract quarterly values to array [Q1, Q2, Q3, Q4]
   */
  const quarterlyToArray = useCallback((quarterly: QuarterlyAmounts): number[] => {
    return [quarterly.q1, quarterly.q2, quarterly.q3, quarterly.q4];
  }, []);

  /**
   * Calculate quarter-over-quarter growth
   */
  const calculateQoQGrowth = useCallback((quarterly: QuarterlyAmounts): number[] => {
    const values = [quarterly.q1, quarterly.q2, quarterly.q3, quarterly.q4];
    return values.slice(1).map((val, idx) => {
      const prev = values[idx];
      return prev !== 0 ? ((val - prev) / prev) * 100 : 0;
    });
  }, []);

  /**
   * Round all quarterly values
   */
  const roundQuarterly = useCallback((quarterly: QuarterlyAmounts): QuarterlyAmounts => {
    return {
      q1: Math.round(quarterly.q1),
      q2: Math.round(quarterly.q2),
      q3: Math.round(quarterly.q3),
      q4: Math.round(quarterly.q4),
      total: Math.round(quarterly.total),
    };
  }, []);

  /**
   * Get quarters constant for iteration
   */
  const quarters = useMemo(() => QUARTERS, []);

  return {
    // Core calculations
    calculateQuarterly,
    calculateQuarterlyWithGrowth,
    sumQuarterly,
    getQuarterlyTotal,

    // Transformations
    mapToQuarterlyData,
    arrayToQuarterly,
    quarterlyToArray,
    roundQuarterly,

    // Analysis
    calculateQoQGrowth,

    // Constants
    quarters,
  };
}

/**
 * Standalone utility functions (for use outside React components)
 */
export const quarterlyUtils = {
  /**
   * Calculate total from quarterly values
   */
  getTotal: (q: OptionalQuarterly): number => {
    return (q.q1 ?? 0) + (q.q2 ?? 0) + (q.q3 ?? 0) + (q.q4 ?? 0);
  },

  /**
   * Create quarterly from annual amount (divided by 4)
   */
  fromAnnual: (annual: number): QuarterlyAmounts => {
    const quarter = annual / 4;
    return { q1: quarter, q2: quarter, q3: quarter, q4: quarter, total: annual };
  },

  /**
   * Create rounded quarterly from annual amount
   */
  fromAnnualRounded: (annual: number): QuarterlyAmounts => {
    const quarter = Math.round(annual / 4);
    return { q1: quarter, q2: quarter, q3: quarter, q4: quarter, total: quarter * 4 };
  },

  /**
   * Distribute annual amount fairly across quarters (no Q4 bias)
   * Remainder is distributed evenly starting from Q1
   * Example: 101 -> Q1: 26, Q2: 25, Q3: 25, Q4: 25
   */
  distributeQuarterlyFair: (total: number): QuarterlyAmounts => {
    const base = Math.floor(total / 4);
    const remainder = total - (base * 4);
    return {
      q1: base + (remainder > 0 ? 1 : 0),
      q2: base + (remainder > 1 ? 1 : 0),
      q3: base + (remainder > 2 ? 1 : 0),
      q4: base + (remainder > 3 ? 1 : 0),
      total,
    };
  },

  /**
   * Sum multiple quarterly amounts
   */
  sum: (items: QuarterlyAmounts[]): QuarterlyAmounts => {
    return items.reduce((acc, item) => ({
      q1: acc.q1 + item.q1,
      q2: acc.q2 + item.q2,
      q3: acc.q3 + item.q3,
      q4: acc.q4 + item.q4,
      total: acc.total + item.total,
    }), { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 });
  },
};
