/**
 * Sensitivity Engine
 * Tornado analysis, scenario matrix, and Monte Carlo simulation
 * 
 * @module sensitivityEngine
 */

import type {
  SensitivityConfigV2,
  TornadoResult,
  ScenarioMatrixV2,
  ScenarioOutcomeV2,
  SimulationScenario,
} from '@/types/simulation';

// =====================================================
// TORNADO ANALYSIS
// =====================================================

interface TornadoDriverConfig {
  name: string;
  baseValue: number;
  affectsRevenue: boolean;
  affectsExpenses: boolean;
  revenueMultiplier?: number;   // How much 1% change affects revenue
  expenseMultiplier?: number;   // How much 1% change affects expenses
}

/**
 * Generate tornado analysis for sensitivity visualization
 * Shows which drivers have the most impact on valuation/runway
 */
export const generateTornadoAnalysis = (
  scenario: SimulationScenario,
  config: SensitivityConfigV2,
  currentCash: number,
  sectorMultiple: number = 8
): TornadoResult[] => {
  const results: TornadoResult[] = [];
  
  // Calculate base case metrics
  const baseRevenue = scenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const baseExpenses = scenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  const baseProfit = baseRevenue - baseExpenses;
  const baseValuation = baseRevenue * sectorMultiple;
  const baseBurn = baseExpenses - baseRevenue;
  const baseRunway = baseBurn > 0 ? Math.floor(currentCash / (baseBurn / 12)) : 999;
  
  // Define driver configurations
  const driverConfigs: Record<string, TornadoDriverConfig> = {
    'growth_rate': {
      name: 'Revenue Growth',
      baseValue: calculateRevenueGrowth(scenario),
      affectsRevenue: true,
      affectsExpenses: false,
      revenueMultiplier: 1.0,
    },
    'gross_margin': {
      name: 'Gross Margin',
      baseValue: 0.70, // Default assumption
      affectsRevenue: false,
      affectsExpenses: true,
      expenseMultiplier: -0.5, // Higher margin = lower COGS
    },
    'churn': {
      name: 'Customer Churn',
      baseValue: 0.05, // 5% monthly
      affectsRevenue: true,
      affectsExpenses: false,
      revenueMultiplier: -1.5, // Churn has 1.5x impact on revenue
    },
    'cac': {
      name: 'Customer Acquisition Cost',
      baseValue: 1000,
      affectsRevenue: false,
      affectsExpenses: true,
      expenseMultiplier: 0.2, // CAC is ~20% of S&M expenses
    },
    'headcount': {
      name: 'Headcount',
      baseValue: 10,
      affectsRevenue: false,
      affectsExpenses: true,
      expenseMultiplier: 0.6, // Headcount is ~60% of expenses
    },
    'price': {
      name: 'Average Price',
      baseValue: 100,
      affectsRevenue: true,
      affectsExpenses: false,
      revenueMultiplier: 0.8, // Price affects 80% of revenue (some fixed)
    },
  };
  
  // Run sensitivity for each configured driver
  for (const driverKey of config.drivers) {
    const driverConfig = driverConfigs[driverKey];
    if (!driverConfig) continue;
    
    const shockPct = config.shock_range;
    
    // Low scenario (driver at -shock%)
    const lowMultiplier = 1 - shockPct;
    let lowRevenue = baseRevenue;
    let lowExpenses = baseExpenses;
    
    if (driverConfig.affectsRevenue && driverConfig.revenueMultiplier) {
      const revenueImpact = baseRevenue * shockPct * driverConfig.revenueMultiplier;
      lowRevenue = driverConfig.revenueMultiplier > 0 
        ? baseRevenue - revenueImpact 
        : baseRevenue + revenueImpact;
    }
    if (driverConfig.affectsExpenses && driverConfig.expenseMultiplier) {
      const expenseImpact = baseExpenses * shockPct * driverConfig.expenseMultiplier;
      lowExpenses = driverConfig.expenseMultiplier > 0
        ? baseExpenses + expenseImpact
        : baseExpenses - expenseImpact;
    }
    
    // High scenario (driver at +shock%)
    const highMultiplier = 1 + shockPct;
    let highRevenue = baseRevenue;
    let highExpenses = baseExpenses;
    
    if (driverConfig.affectsRevenue && driverConfig.revenueMultiplier) {
      const revenueImpact = baseRevenue * shockPct * driverConfig.revenueMultiplier;
      highRevenue = driverConfig.revenueMultiplier > 0
        ? baseRevenue + revenueImpact
        : baseRevenue - revenueImpact;
    }
    if (driverConfig.affectsExpenses && driverConfig.expenseMultiplier) {
      const expenseImpact = baseExpenses * shockPct * driverConfig.expenseMultiplier;
      highExpenses = driverConfig.expenseMultiplier > 0
        ? baseExpenses - expenseImpact
        : baseExpenses + expenseImpact;
    }
    
    // Calculate valuations
    const lowValuation = lowRevenue * sectorMultiple;
    const highValuation = highRevenue * sectorMultiple;
    
    // Calculate runways
    const lowBurn = lowExpenses - lowRevenue;
    const highBurn = highExpenses - highRevenue;
    const lowRunway = lowBurn > 0 ? Math.floor(currentCash / (lowBurn / 12)) : 999;
    const highRunway = highBurn > 0 ? Math.floor(currentCash / (highBurn / 12)) : 999;
    
    results.push({
      driver: driverConfig.name,
      base_value: driverConfig.baseValue,
      low_value: driverConfig.baseValue * lowMultiplier,
      high_value: driverConfig.baseValue * highMultiplier,
      valuation_at_low: lowValuation,
      valuation_at_high: highValuation,
      valuation_swing: Math.abs(highValuation - lowValuation),
      runway_at_low: lowRunway,
      runway_at_high: highRunway,
    });
  }
  
  // Sort by impact (valuation swing)
  return results.sort((a, b) => b.valuation_swing - a.valuation_swing);
};

// =====================================================
// SCENARIO MATRIX (BASE / BULL / BEAR)
// =====================================================

interface ScenarioMatrixConfig {
  bullRevenueMultiplier: number;    // e.g., 1.3 = 30% above base
  bullExpenseMultiplier: number;    // e.g., 1.1 = 10% above base
  bearRevenueMultiplier: number;    // e.g., 0.7 = 30% below base
  bearExpenseMultiplier: number;    // e.g., 1.2 = 20% above base (harder to cut)
  bullProbability?: number;         // e.g., 0.25
  baseProbability?: number;         // e.g., 0.50
  bearProbability?: number;         // e.g., 0.25
}

const DEFAULT_SCENARIO_CONFIG: ScenarioMatrixConfig = {
  bullRevenueMultiplier: 1.30,
  bullExpenseMultiplier: 1.10,
  bearRevenueMultiplier: 0.70,
  bearExpenseMultiplier: 1.15,
  bullProbability: 0.25,
  baseProbability: 0.50,
  bearProbability: 0.25,
};

/**
 * Generate scenario matrix with base, bull, and bear cases
 */
export const generateScenarioMatrix = (
  baseScenario: SimulationScenario,
  currentCash: number,
  investmentAmount: number,
  equityPercentage: number,
  sectorMultiple: number = 8,
  config: ScenarioMatrixConfig = DEFAULT_SCENARIO_CONFIG
): ScenarioMatrixV2 => {
  const baseRevenue = baseScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const baseExpenses = baseScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  
  // Base case
  const baseOutcome = calculateScenarioOutcome(
    'Base Case',
    baseRevenue,
    baseExpenses,
    currentCash,
    investmentAmount,
    equityPercentage,
    sectorMultiple,
    config.baseProbability
  );
  
  // Bull case
  const bullRevenue = baseRevenue * config.bullRevenueMultiplier;
  const bullExpenses = baseExpenses * config.bullExpenseMultiplier;
  const bullOutcome = calculateScenarioOutcome(
    'Bull Case',
    bullRevenue,
    bullExpenses,
    currentCash,
    investmentAmount,
    equityPercentage,
    sectorMultiple,
    config.bullProbability
  );
  
  // Bear case
  const bearRevenue = baseRevenue * config.bearRevenueMultiplier;
  const bearExpenses = baseExpenses * config.bearExpenseMultiplier;
  const bearOutcome = calculateScenarioOutcome(
    'Bear Case',
    bearRevenue,
    bearExpenses,
    currentCash,
    investmentAmount,
    equityPercentage,
    sectorMultiple,
    config.bearProbability
  );
  
  return {
    base: baseOutcome,
    bull: bullOutcome,
    bear: bearOutcome,
  };
};

/**
 * Calculate outcome metrics for a single scenario
 */
const calculateScenarioOutcome = (
  name: string,
  revenue: number,
  expenses: number,
  currentCash: number,
  investmentAmount: number,
  equityPercentage: number,
  sectorMultiple: number,
  probability?: number
): ScenarioOutcomeV2 => {
  const netProfit = revenue - expenses;
  const valuation = revenue * sectorMultiple;
  
  // Runway calculation
  const monthlyBurn = (expenses - revenue) / 12;
  const totalCash = currentCash + investmentAmount;
  const runwayMonths = monthlyBurn > 0 
    ? Math.floor(totalCash / monthlyBurn) 
    : 999;
  
  // MOIC calculation (5-year exit assumption)
  const year5Revenue = revenue * Math.pow(1.25, 4); // 25% growth for 4 more years
  const year5Valuation = year5Revenue * sectorMultiple;
  const investorShare = year5Valuation * (equityPercentage / 100);
  const moic = investmentAmount > 0 ? investorShare / investmentAmount : 0;
  
  // IRR calculation (simplified)
  const irr = investmentAmount > 0 
    ? Math.pow(investorShare / investmentAmount, 1/5) - 1 
    : 0;
  
  return {
    name,
    revenue,
    expenses,
    net_profit: netProfit,
    valuation,
    runway_months: runwayMonths,
    moic,
    irr,
    probability,
  };
};

/**
 * Calculate expected value from scenario matrix
 */
export const calculateExpectedValue = (matrix: ScenarioMatrixV2): {
  expectedRevenue: number;
  expectedProfit: number;
  expectedValuation: number;
  expectedMOIC: number;
} => {
  const bullProb = matrix.bull.probability ?? 0.25;
  const baseProb = matrix.base.probability ?? 0.50;
  const bearProb = matrix.bear.probability ?? 0.25;
  
  return {
    expectedRevenue: 
      matrix.bull.revenue * bullProb +
      matrix.base.revenue * baseProb +
      matrix.bear.revenue * bearProb,
    expectedProfit:
      matrix.bull.net_profit * bullProb +
      matrix.base.net_profit * baseProb +
      matrix.bear.net_profit * bearProb,
    expectedValuation:
      matrix.bull.valuation * bullProb +
      matrix.base.valuation * baseProb +
      matrix.bear.valuation * bearProb,
    expectedMOIC:
      matrix.bull.moic * bullProb +
      matrix.base.moic * baseProb +
      matrix.bear.moic * bearProb,
  };
};

// =====================================================
// MONTE CARLO SIMULATION (Optional - P3)
// =====================================================

interface MonteCarloConfig {
  iterations: number;
  revenueStdDev: number;
  expenseStdDev: number;
}

/**
 * Run Monte Carlo simulation for survival probability
 * Returns distribution of outcomes
 */
export const runMonteCarloSimulation = (
  baseRevenue: number,
  baseExpenses: number,
  currentCash: number,
  investmentAmount: number,
  config: MonteCarloConfig = { iterations: 1000, revenueStdDev: 0.2, expenseStdDev: 0.1 }
): {
  survivalProbability: number;
  p10Outcome: number;
  p50Outcome: number;
  p90Outcome: number;
  distribution: number[];
} => {
  const outcomes: number[] = [];
  let survivals = 0;
  
  for (let i = 0; i < config.iterations; i++) {
    // Random revenue (normal distribution)
    const revenueMultiplier = 1 + randomNormal() * config.revenueStdDev;
    const revenue = baseRevenue * Math.max(0.5, revenueMultiplier);
    
    // Random expenses (normal distribution, less volatile)
    const expenseMultiplier = 1 + randomNormal() * config.expenseStdDev;
    const expenses = baseExpenses * Math.max(0.8, expenseMultiplier);
    
    // Calculate ending cash
    const netCashFlow = revenue - expenses;
    const endingCash = currentCash + investmentAmount + netCashFlow;
    
    outcomes.push(endingCash);
    if (endingCash > 0) survivals++;
  }
  
  // Sort for percentiles
  outcomes.sort((a, b) => a - b);
  
  const p10Index = Math.floor(config.iterations * 0.10);
  const p50Index = Math.floor(config.iterations * 0.50);
  const p90Index = Math.floor(config.iterations * 0.90);
  
  return {
    survivalProbability: survivals / config.iterations,
    p10Outcome: outcomes[p10Index],
    p50Outcome: outcomes[p50Index],
    p90Outcome: outcomes[p90Index],
    distribution: outcomes,
  };
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate revenue growth rate from scenario
 */
const calculateRevenueGrowth = (scenario: SimulationScenario): number => {
  const baseRevenue = scenario.revenues.reduce((sum, r) => sum + r.baseAmount, 0);
  const projectedRevenue = scenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  
  if (baseRevenue <= 0) return 0;
  return (projectedRevenue - baseRevenue) / baseRevenue;
};

/**
 * Generate random number from standard normal distribution
 * Using Box-Muller transform
 */
const randomNormal = (): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

/**
 * Create default sensitivity config
 */
export const createDefaultSensitivityConfig = (): SensitivityConfigV2 => ({
  mode: 'tornado',
  shock_range: 0.10, // ±10%
  drivers: ['growth_rate', 'gross_margin', 'churn', 'cac'],
});

/**
 * Generate calculation trace for sensitivity analysis
 */
export const generateSensitivityCalcTrace = (
  analysis: 'tornado' | 'scenario_matrix' | 'monte_carlo',
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>
): string => {
  switch (analysis) {
    case 'tornado':
      return `Tornado: ${inputs.drivers} @ ±${(inputs.shockRange as number * 100).toFixed(0)}% | Top impact: ${outputs.topDriver} ($${outputs.maxSwing} swing)`;
    
    case 'scenario_matrix':
      return `Scenarios: Bull $${outputs.bullValuation} (${(outputs.bullProb as number * 100).toFixed(0)}%) | Base $${outputs.baseValuation} | Bear $${outputs.bearValuation} (${(outputs.bearProb as number * 100).toFixed(0)}%)`;
    
    case 'monte_carlo':
      return `Monte Carlo (${inputs.iterations} runs): ${((outputs.survivalProb as number) * 100).toFixed(0)}% survival | P50: $${outputs.p50}`;
    
    default:
      return 'Sensitivity Analysis';
  }
};
