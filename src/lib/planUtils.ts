import { PlanItem, ActualEntry, DayMetrics } from '@/types/plan';

// Tolerance in minutes for deviation (±30 minutes)
export const DEVIATION_TOLERANCE = 30;

/**
 * Check if a plan is frozen (past midnight of its date)
 */
export function isPlanFrozen(plan: PlanItem): boolean {
  // If frozen_at is set, it's frozen
  if (plan.frozen_at) {
    return true;
  }
  
  // Plans are auto-frozen after midnight of their date
  const planDate = new Date(plan.start_at);
  planDate.setHours(0, 0, 0, 0);
  
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If plan date is before today, it's frozen
  return planDate < today;
}

/**
 * Calculate deviation in minutes between actual and planned times
 * Returns positive if actual started later, negative if earlier
 */
export function calculateDeviation(actual: ActualEntry, plan: PlanItem): number {
  const actualStart = new Date(actual.start_at).getTime();
  const plannedStart = new Date(plan.start_at).getTime();
  
  return Math.round((actualStart - plannedStart) / 60000);
}

/**
 * Check if deviation is within tolerance
 */
export function isWithinTolerance(deviationMinutes: number): boolean {
  return Math.abs(deviationMinutes) <= DEVIATION_TOLERANCE;
}

/**
 * Get deviation status label
 */
export function getDeviationStatus(deviationMinutes: number): 'early' | 'on-time' | 'late' {
  if (deviationMinutes < -DEVIATION_TOLERANCE) {
    return 'early';
  } else if (deviationMinutes > DEVIATION_TOLERANCE) {
    return 'late';
  }
  return 'on-time';
}

/**
 * Format deviation for display
 */
export function formatDeviation(deviationMinutes: number): string {
  const abs = Math.abs(deviationMinutes);
  if (abs < 60) {
    return `${abs} dk`;
  }
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} sa`;
}

/**
 * Calculate day metrics from plan items and actual entries
 */
export function calculateDayMetrics(
  planItems: PlanItem[],
  actualEntries: ActualEntry[],
  date: string
): Omit<DayMetrics, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  const plannedCount = planItems.length;
  const completedCount = planItems.filter(p => p.status === 'done').length;
  const skippedCount = planItems.filter(p => p.status === 'skipped').length;
  const actualCount = actualEntries.length;
  const unplannedCount = actualEntries.filter(a => !a.linked_plan_item_id).length;
  
  // Calculate planned minutes
  const plannedMinutes = planItems.reduce((acc, item) => {
    const diff = new Date(item.end_at).getTime() - new Date(item.start_at).getTime();
    return acc + Math.round(diff / 60000);
  }, 0);
  
  // Calculate actual minutes
  const actualMinutes = actualEntries.reduce((acc, entry) => {
    const diff = new Date(entry.end_at).getTime() - new Date(entry.start_at).getTime();
    return acc + Math.round(diff / 60000);
  }, 0);
  
  // Calculate deviations for linked entries
  const linkedEntries = actualEntries.filter(a => a.linked_plan_item_id);
  const deviations: number[] = [];
  let withinToleranceCount = 0;
  
  linkedEntries.forEach(entry => {
    const plan = planItems.find(p => p.id === entry.linked_plan_item_id);
    if (plan) {
      const deviation = entry.deviation_minutes ?? calculateDeviation(entry, plan);
      deviations.push(deviation);
      if (isWithinTolerance(deviation)) {
        withinToleranceCount++;
      }
    }
  });
  
  const avgDeviationMinutes = deviations.length > 0
    ? Math.round(deviations.reduce((a, b) => a + Math.abs(b), 0) / deviations.length)
    : null;
  
  // Calculate completion rate
  const completionRate = plannedCount > 0
    ? Math.round((completedCount / plannedCount) * 100)
    : null;
  
  // Calculate focus score (weighted combination of metrics)
  // 40% completion, 30% within tolerance, 20% unplanned ratio, 10% time accuracy
  let focusScore: number | null = null;
  if (plannedCount > 0) {
    const completionScore = (completedCount / plannedCount) * 40;
    const toleranceScore = linkedEntries.length > 0
      ? (withinToleranceCount / linkedEntries.length) * 30
      : 30; // If no linked entries, give full score
    const unplannedRatio = actualCount > 0
      ? (1 - unplannedCount / actualCount) * 20
      : 20;
    const timeAccuracy = plannedMinutes > 0
      ? Math.max(0, 10 - Math.abs(actualMinutes - plannedMinutes) / plannedMinutes * 10)
      : 10;
    
    focusScore = Math.round(completionScore + toleranceScore + unplannedRatio + timeAccuracy);
  }
  
  return {
    date,
    planned_count: plannedCount,
    completed_count: completedCount,
    skipped_count: skippedCount,
    actual_count: actualCount,
    unplanned_count: unplannedCount,
    planned_minutes: plannedMinutes,
    actual_minutes: actualMinutes,
    avg_deviation_minutes: avgDeviationMinutes,
    within_tolerance_count: withinToleranceCount,
    completion_rate: completionRate,
    focus_score: focusScore,
  };
}
