/**
 * Year Calculation Utilities
 * Centralized year calculations based on internet time
 * 
 * Business Logic:
 * - Completed Year (Base): Current Year - 1 (e.g., Jan 2026 → 2025)
 * - Scenario Year (Target): Completed Year + 1 (e.g., 2026)
 * - Projection Years: From scenario year onwards
 * - MOIC Calculations: Year 3 and Year 5 from scenario year
 */

/**
 * Get the last completed fiscal year
 * In January 2026, this returns 2025
 */
export const getCompletedYear = (): number => {
  return new Date().getFullYear() - 1;
};

/**
 * Get the current scenario planning year
 * This is the year users are building scenarios for
 */
export const getScenarioYear = (): number => {
  return getCompletedYear() + 1;
};

/**
 * Get all projection years for multi-year forecasting
 * Returns actual year numbers for MOIC calculations
 */
export const getProjectionYears = () => {
  const completed = getCompletedYear();
  const scenario = getScenarioYear();
  
  return {
    baseYear: completed,           // 2025 - Last completed year (actual financials)
    year1: scenario,               // 2026 - Scenario year (positive/negative target)
    year2: scenario + 1,           // 2027 - First projection year
    year3: scenario + 3,           // 2029 - 3-year MOIC calculation point
    year5: scenario + 5,           // 2031 - 5-year MOIC calculation point
  };
};

/**
 * Get human-readable year labels for UI
 */
export const getYearLabels = () => {
  const years = getProjectionYears();
  return {
    baseYearLabel: `${years.baseYear} (Tamamlanan)`,
    scenarioYearLabel: `${years.year1} (Senaryo Yılı)`,
    year2Label: `${years.year2} (Projeksiyon)`,
    moic3YearLabel: `${years.year3} (3. Yıl)`,
    moic5YearLabel: `${years.year5} (5. Yıl)`,
  };
};

/**
 * Get scenario type based on net profit comparison
 * Positive scenario = higher net profit
 * Negative scenario = lower net profit (risk case)
 */
export const determineScenarioType = (
  netProfitA: number, 
  netProfitB: number
): { 
  positiveId: 'A' | 'B'; 
  negativeId: 'A' | 'B';
  isAPositive: boolean;
} => {
  const isAPositive = netProfitA >= netProfitB;
  return {
    positiveId: isAPositive ? 'A' : 'B',
    negativeId: isAPositive ? 'B' : 'A',
    isAPositive,
  };
};

/**
 * Calculate growth rate from base to projected values
 * Used for internal scenario growth calculation
 */
export const calculateInternalGrowthRate = (
  baseAmount: number, 
  projectedAmount: number,
  minRate: number = 0.10  // Minimum 10% growth
): number => {
  if (baseAmount <= 0) return 0.25; // Default 25% if no base
  
  const growthRate = (projectedAmount - baseAmount) / baseAmount;
  return Math.max(minRate, growthRate);
};

/**
 * Get year context for AI analysis
 * Returns structured year information for prompts
 */
export const getYearContextForAI = () => {
  const years = getProjectionYears();
  
  return {
    currentDate: new Date().toISOString().split('T')[0],
    baseYear: years.baseYear,
    scenarioYear: years.year1,
    projectionYears: {
      year2: years.year2,
      year3: years.year3,
      year5: years.year5,
    },
    moicYears: {
      threeYear: years.year3,
      fiveYear: years.year5,
    },
    labels: {
      baseYear: `${years.baseYear} (Gerçek Finansallar)`,
      scenarioYear: `${years.year1} (Hedef Senaryo)`,
      moic3: `${years.year3} (3 Yıllık MOIC)`,
      moic5: `${years.year5} (5 Yıllık MOIC)`,
    }
  };
};
