import { SimulationScenario } from '@/types/simulation';

/**
 * Generate a simple hash from scenario data for change detection
 * Compares relevant financial data to detect if analysis should be re-run
 */
export const generateScenarioHash = (scenario: SimulationScenario): string => {
  const relevantData = {
    revenues: scenario.revenues.map(r => ({
      category: r.category,
      projected: r.projectedAmount,
      quarterly: r.projectedQuarterly
    })),
    expenses: scenario.expenses.map(e => ({
      category: e.category,
      projected: e.projectedAmount,
      quarterly: e.projectedQuarterly
    })),
    investments: scenario.investments.map(i => ({
      name: i.name,
      amount: i.amount,
      quarterly: i.quarterly
    })),
    updatedAt: scenario.updatedAt
  };
  
  // Create a simple hash using btoa (base64 encoding)
  const jsonStr = JSON.stringify(relevantData);
  try {
    // Take first 32 chars of base64 encoded string as hash
    return btoa(encodeURIComponent(jsonStr)).slice(0, 32);
  } catch {
    // Fallback for any encoding issues
    return String(jsonStr.length) + '-' + Date.now();
  }
};

/**
 * Check if scenario data has changed since last analysis
 */
export const checkDataChanged = (currentHash: string, savedHash: string | null): boolean => {
  if (!savedHash) return false; // No saved hash means no comparison needed
  return currentHash !== savedHash;
};
