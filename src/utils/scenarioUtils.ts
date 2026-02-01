/**
 * Scenario Utility Functions
 *
 * Centralized utilities for scenario loading and lookup operations.
 * Extracted from GrowthSimulation.tsx to eliminate code duplication (DRY principle).
 */

import type { SimulationScenario } from '@/types/simulation';

/**
 * Find a scenario by its ID
 */
export function findScenarioById(
  scenarios: SimulationScenario[],
  id: string
): SimulationScenario | undefined {
  return scenarios.find(s => s.id === id);
}

/**
 * Find the base scenario for a given target year
 * Base scenario is the positive scenario from the previous year
 */
export function findBaseScenario(
  scenarios: SimulationScenario[],
  targetYear: number
): SimulationScenario | undefined {
  const previousYear = targetYear - 1;
  return scenarios.find(
    s => s.targetYear === previousYear && s.scenarioType === 'positive'
  );
}

/**
 * Load a scenario and its corresponding base scenario
 * Combines the duplicate logic from GrowthSimulation.tsx lines 70-94 and 135-151
 *
 * @param scenarios - List of all available scenarios
 * @param scenarioId - ID of the scenario to load
 * @param loadScenario - Callback to load the main scenario
 * @param loadBaseScenario - Callback to load the base scenario (optional)
 * @returns The loaded scenario, or undefined if not found
 */
export function loadScenarioWithBase(
  scenarios: SimulationScenario[],
  scenarioId: string,
  loadScenario: (scenario: SimulationScenario) => void,
  loadBaseScenario?: (scenario: SimulationScenario | undefined) => void
): SimulationScenario | undefined {
  const scenario = findScenarioById(scenarios, scenarioId);

  if (scenario) {
    loadScenario(scenario);

    if (loadBaseScenario) {
      const baseScenario = findBaseScenario(scenarios, scenario.targetYear);
      loadBaseScenario(baseScenario);
    }
  }

  return scenario;
}

/**
 * Get scenarios filtered by year
 */
export function getScenariosByYear(
  scenarios: SimulationScenario[],
  year: number
): SimulationScenario[] {
  return scenarios.filter(s => s.targetYear === year);
}

/**
 * Get scenarios filtered by type
 */
export function getScenariosByType(
  scenarios: SimulationScenario[],
  type: 'positive' | 'negative'
): SimulationScenario[] {
  return scenarios.filter(s => s.scenarioType === type);
}

/**
 * Sort scenarios by updated date (most recent first)
 */
export function sortScenariosByDate(
  scenarios: SimulationScenario[]
): SimulationScenario[] {
  return [...scenarios].sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Get the most recent positive scenario for a given year
 */
export function getMostRecentPositiveScenario(
  scenarios: SimulationScenario[],
  year: number
): SimulationScenario | undefined {
  const yearScenarios = scenarios.filter(
    s => s.targetYear === year && s.scenarioType === 'positive'
  );

  if (yearScenarios.length === 0) return undefined;

  return sortScenariosByDate(yearScenarios)[0];
}
