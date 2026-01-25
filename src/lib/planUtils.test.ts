import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  DEVIATION_TOLERANCE,
  isPlanFrozen,
  calculateDeviation,
  isWithinTolerance,
  getDeviationStatus,
  formatDeviation,
  calculateDayMetrics,
} from "./planUtils";
import type { PlanItem, ActualEntry } from "@/types/plan";

// Helper function to create a minimal PlanItem for testing
function createPlanItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: "plan-1",
    user_id: "user-1",
    title: "Test Plan",
    start_at: "2024-06-15T09:00:00Z",
    end_at: "2024-06-15T10:00:00Z",
    type: "task",
    priority: "med",
    tags: [],
    notes: null,
    location: null,
    status: "planned",
    source: "manual",
    linked_github: null,
    frozen_at: null,
    created_at: "2024-06-14T00:00:00Z",
    updated_at: "2024-06-14T00:00:00Z",
    ...overrides,
  };
}

// Helper function to create a minimal ActualEntry for testing
function createActualEntry(overrides: Partial<ActualEntry> = {}): ActualEntry {
  return {
    id: "actual-1",
    user_id: "user-1",
    title: "Test Actual",
    start_at: "2024-06-15T09:00:00Z",
    end_at: "2024-06-15T10:00:00Z",
    tags: [],
    notes: null,
    source: "review",
    linked_plan_item_id: null,
    linked_github: null,
    confidence: null,
    deviation_minutes: null,
    match_method: null,
    created_at: "2024-06-15T00:00:00Z",
    updated_at: "2024-06-15T00:00:00Z",
    ...overrides,
  };
}

describe("planUtils", () => {
  describe("DEVIATION_TOLERANCE", () => {
    it("should be 30 minutes", () => {
      expect(DEVIATION_TOLERANCE).toBe(30);
    });
  });

  describe("isPlanFrozen", () => {
    beforeEach(() => {
      // Mock the current date to June 15, 2024 at 10:00
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return true if frozen_at is set", () => {
      const plan = createPlanItem({
        frozen_at: "2024-06-14T23:59:59Z",
        start_at: "2024-06-15T09:00:00Z", // Today
      });

      expect(isPlanFrozen(plan)).toBe(true);
    });

    it("should return false for today's plan without frozen_at", () => {
      const plan = createPlanItem({
        frozen_at: null,
        start_at: "2024-06-15T09:00:00Z", // Today
      });

      expect(isPlanFrozen(plan)).toBe(false);
    });

    it("should return true for yesterday's plan (auto-frozen)", () => {
      const plan = createPlanItem({
        frozen_at: null,
        start_at: "2024-06-14T09:00:00Z", // Yesterday
      });

      expect(isPlanFrozen(plan)).toBe(true);
    });

    it("should return false for future plan", () => {
      const plan = createPlanItem({
        frozen_at: null,
        start_at: "2024-06-16T09:00:00Z", // Tomorrow
      });

      expect(isPlanFrozen(plan)).toBe(false);
    });

    it("should return true for plan from last week", () => {
      const plan = createPlanItem({
        frozen_at: null,
        start_at: "2024-06-08T09:00:00Z", // A week ago
      });

      expect(isPlanFrozen(plan)).toBe(true);
    });
  });

  describe("calculateDeviation", () => {
    it("should return 0 for exact match", () => {
      const plan = createPlanItem({ start_at: "2024-06-15T09:00:00Z" });
      const actual = createActualEntry({ start_at: "2024-06-15T09:00:00Z" });

      expect(calculateDeviation(actual, plan)).toBe(0);
    });

    it("should return positive value when actual started later", () => {
      const plan = createPlanItem({ start_at: "2024-06-15T09:00:00Z" });
      const actual = createActualEntry({ start_at: "2024-06-15T09:30:00Z" }); // 30 min late

      expect(calculateDeviation(actual, plan)).toBe(30);
    });

    it("should return negative value when actual started earlier", () => {
      const plan = createPlanItem({ start_at: "2024-06-15T09:00:00Z" });
      const actual = createActualEntry({ start_at: "2024-06-15T08:45:00Z" }); // 15 min early

      expect(calculateDeviation(actual, plan)).toBe(-15);
    });

    it("should handle large deviations (hours)", () => {
      const plan = createPlanItem({ start_at: "2024-06-15T09:00:00Z" });
      const actual = createActualEntry({ start_at: "2024-06-15T12:00:00Z" }); // 3 hours late

      expect(calculateDeviation(actual, plan)).toBe(180);
    });

    it("should round to nearest minute", () => {
      const plan = createPlanItem({ start_at: "2024-06-15T09:00:00Z" });
      const actual = createActualEntry({ start_at: "2024-06-15T09:00:45Z" }); // 45 seconds late

      expect(calculateDeviation(actual, plan)).toBe(1);
    });
  });

  describe("isWithinTolerance", () => {
    it("should return true for 0 deviation", () => {
      expect(isWithinTolerance(0)).toBe(true);
    });

    it("should return true for exactly DEVIATION_TOLERANCE", () => {
      expect(isWithinTolerance(DEVIATION_TOLERANCE)).toBe(true);
      expect(isWithinTolerance(-DEVIATION_TOLERANCE)).toBe(true);
    });

    it("should return false for deviation > DEVIATION_TOLERANCE", () => {
      expect(isWithinTolerance(31)).toBe(false);
      expect(isWithinTolerance(-31)).toBe(false);
    });

    it("should return true for deviation within tolerance", () => {
      expect(isWithinTolerance(15)).toBe(true);
      expect(isWithinTolerance(-15)).toBe(true);
      expect(isWithinTolerance(29)).toBe(true);
    });
  });

  describe("getDeviationStatus", () => {
    it("should return 'on-time' for 0 deviation", () => {
      expect(getDeviationStatus(0)).toBe("on-time");
    });

    it("should return 'on-time' for deviation within tolerance", () => {
      expect(getDeviationStatus(15)).toBe("on-time");
      expect(getDeviationStatus(-15)).toBe("on-time");
      expect(getDeviationStatus(30)).toBe("on-time");
      expect(getDeviationStatus(-30)).toBe("on-time");
    });

    it("should return 'late' for positive deviation > tolerance", () => {
      expect(getDeviationStatus(31)).toBe("late");
      expect(getDeviationStatus(60)).toBe("late");
      expect(getDeviationStatus(120)).toBe("late");
    });

    it("should return 'early' for negative deviation > tolerance", () => {
      expect(getDeviationStatus(-31)).toBe("early");
      expect(getDeviationStatus(-60)).toBe("early");
      expect(getDeviationStatus(-120)).toBe("early");
    });
  });

  describe("formatDeviation", () => {
    it("should format minutes under 60 as 'X dk'", () => {
      expect(formatDeviation(0)).toBe("0 dk");
      expect(formatDeviation(15)).toBe("15 dk");
      expect(formatDeviation(59)).toBe("59 dk");
      expect(formatDeviation(-30)).toBe("30 dk"); // Uses absolute value
    });

    it("should format 60+ minutes as hours and minutes", () => {
      expect(formatDeviation(60)).toBe("1 sa");
      expect(formatDeviation(90)).toBe("1 sa 30 dk");
      expect(formatDeviation(120)).toBe("2 sa");
      expect(formatDeviation(135)).toBe("2 sa 15 dk");
    });

    it("should handle large values", () => {
      expect(formatDeviation(180)).toBe("3 sa");
      expect(formatDeviation(195)).toBe("3 sa 15 dk");
      expect(formatDeviation(300)).toBe("5 sa");
    });

    it("should use absolute value for negative deviations", () => {
      expect(formatDeviation(-45)).toBe("45 dk");
      expect(formatDeviation(-90)).toBe("1 sa 30 dk");
    });
  });

  describe("calculateDayMetrics", () => {
    const baseDate = "2024-06-15";

    describe("basic counts", () => {
      it("should count plan items correctly", () => {
        const planItems = [
          createPlanItem({ id: "p1", status: "done" }),
          createPlanItem({ id: "p2", status: "done" }),
          createPlanItem({ id: "p3", status: "skipped" }),
          createPlanItem({ id: "p4", status: "planned" }),
        ];

        const metrics = calculateDayMetrics(planItems, [], baseDate);

        expect(metrics.planned_count).toBe(4);
        expect(metrics.completed_count).toBe(2);
        expect(metrics.skipped_count).toBe(1);
      });

      it("should count actual entries correctly", () => {
        const actualEntries = [
          createActualEntry({ id: "a1", linked_plan_item_id: "p1" }),
          createActualEntry({ id: "a2", linked_plan_item_id: "p2" }),
          createActualEntry({ id: "a3", linked_plan_item_id: null }), // Unplanned
        ];

        const metrics = calculateDayMetrics([], actualEntries, baseDate);

        expect(metrics.actual_count).toBe(3);
        expect(metrics.unplanned_count).toBe(1);
      });
    });

    describe("time calculations", () => {
      it("should calculate planned minutes", () => {
        const planItems = [
          createPlanItem({
            id: "p1",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T10:00:00Z", // 60 minutes
          }),
          createPlanItem({
            id: "p2",
            start_at: "2024-06-15T10:00:00Z",
            end_at: "2024-06-15T10:30:00Z", // 30 minutes
          }),
        ];

        const metrics = calculateDayMetrics(planItems, [], baseDate);

        expect(metrics.planned_minutes).toBe(90);
      });

      it("should calculate actual minutes", () => {
        const actualEntries = [
          createActualEntry({
            id: "a1",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T10:30:00Z", // 90 minutes
          }),
          createActualEntry({
            id: "a2",
            start_at: "2024-06-15T11:00:00Z",
            end_at: "2024-06-15T11:45:00Z", // 45 minutes
          }),
        ];

        const metrics = calculateDayMetrics([], actualEntries, baseDate);

        expect(metrics.actual_minutes).toBe(135);
      });
    });

    describe("deviation calculations", () => {
      it("should calculate average deviation for linked entries", () => {
        const planItems = [
          createPlanItem({ id: "p1", start_at: "2024-06-15T09:00:00Z" }),
          createPlanItem({ id: "p2", start_at: "2024-06-15T10:00:00Z" }),
        ];
        const actualEntries = [
          createActualEntry({
            id: "a1",
            linked_plan_item_id: "p1",
            start_at: "2024-06-15T09:15:00Z", // 15 min late
          }),
          createActualEntry({
            id: "a2",
            linked_plan_item_id: "p2",
            start_at: "2024-06-15T10:45:00Z", // 45 min late
          }),
        ];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        // Average absolute deviation: (15 + 45) / 2 = 30
        expect(metrics.avg_deviation_minutes).toBe(30);
      });

      it("should use deviation_minutes from entry if available", () => {
        const planItems = [createPlanItem({ id: "p1" })];
        const actualEntries = [
          createActualEntry({
            id: "a1",
            linked_plan_item_id: "p1",
            deviation_minutes: 20, // Pre-calculated
          }),
        ];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        expect(metrics.avg_deviation_minutes).toBe(20);
      });

      it("should count entries within tolerance", () => {
        const planItems = [
          createPlanItem({ id: "p1", start_at: "2024-06-15T09:00:00Z" }),
          createPlanItem({ id: "p2", start_at: "2024-06-15T10:00:00Z" }),
          createPlanItem({ id: "p3", start_at: "2024-06-15T11:00:00Z" }),
        ];
        const actualEntries = [
          createActualEntry({
            id: "a1",
            linked_plan_item_id: "p1",
            start_at: "2024-06-15T09:15:00Z", // 15 min - within tolerance
          }),
          createActualEntry({
            id: "a2",
            linked_plan_item_id: "p2",
            start_at: "2024-06-15T11:00:00Z", // 60 min - outside tolerance
          }),
          createActualEntry({
            id: "a3",
            linked_plan_item_id: "p3",
            start_at: "2024-06-15T11:30:00Z", // 30 min - at tolerance boundary
          }),
        ];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        expect(metrics.within_tolerance_count).toBe(2);
      });

      it("should return null for avg_deviation when no linked entries", () => {
        const planItems = [createPlanItem({ id: "p1" })];
        const actualEntries = [
          createActualEntry({ id: "a1", linked_plan_item_id: null }),
        ];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        expect(metrics.avg_deviation_minutes).toBeNull();
      });
    });

    describe("completion rate", () => {
      it("should calculate completion rate correctly", () => {
        const planItems = [
          createPlanItem({ id: "p1", status: "done" }),
          createPlanItem({ id: "p2", status: "done" }),
          createPlanItem({ id: "p3", status: "skipped" }),
          createPlanItem({ id: "p4", status: "planned" }),
        ];

        const metrics = calculateDayMetrics(planItems, [], baseDate);

        // 2 done out of 4 = 50%
        expect(metrics.completion_rate).toBe(50);
      });

      it("should return null for completion rate when no plans", () => {
        const metrics = calculateDayMetrics([], [], baseDate);

        expect(metrics.completion_rate).toBeNull();
      });

      it("should handle 100% completion", () => {
        const planItems = [
          createPlanItem({ id: "p1", status: "done" }),
          createPlanItem({ id: "p2", status: "done" }),
        ];

        const metrics = calculateDayMetrics(planItems, [], baseDate);

        expect(metrics.completion_rate).toBe(100);
      });

      it("should handle 0% completion", () => {
        const planItems = [
          createPlanItem({ id: "p1", status: "planned" }),
          createPlanItem({ id: "p2", status: "skipped" }),
        ];

        const metrics = calculateDayMetrics(planItems, [], baseDate);

        expect(metrics.completion_rate).toBe(0);
      });
    });

    describe("focus score", () => {
      it("should return null when no planned items", () => {
        const metrics = calculateDayMetrics([], [], baseDate);

        expect(metrics.focus_score).toBeNull();
      });

      it("should calculate high focus score for perfect day", () => {
        const planItems = [
          createPlanItem({
            id: "p1",
            status: "done",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T10:00:00Z",
          }),
        ];
        const actualEntries = [
          createActualEntry({
            id: "a1",
            linked_plan_item_id: "p1",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T10:00:00Z",
          }),
        ];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        // Perfect score: 40 (completion) + 30 (tolerance) + 20 (no unplanned) + 10 (time accuracy) = 100
        expect(metrics.focus_score).toBe(100);
      });

      it("should give full tolerance score when no linked entries", () => {
        const planItems = [createPlanItem({ id: "p1", status: "done" })];
        const actualEntries: ActualEntry[] = [];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        // 40 (completion) + 30 (no linked entries = full) + 20 (no actuals = 0) + 10 (no actual mins)
        // Actually: completion=40, tolerance=30, unplannedRatio=20, timeAccuracy=10
        expect(metrics.focus_score).toBeGreaterThanOrEqual(90);
      });

      it("should penalize unplanned activities", () => {
        const planItems = [
          createPlanItem({
            id: "p1",
            status: "done",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T10:00:00Z",
          }),
        ];
        const actualEntries = [
          createActualEntry({
            id: "a1",
            linked_plan_item_id: "p1",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T10:00:00Z",
          }),
          createActualEntry({
            id: "a2",
            linked_plan_item_id: null, // Unplanned
            start_at: "2024-06-15T11:00:00Z",
            end_at: "2024-06-15T12:00:00Z",
          }),
        ];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        // Unplanned ratio: 1 linked / 2 total = 0.5 * 20 = 10
        expect(metrics.focus_score).toBeLessThan(100);
      });

      it("should penalize time accuracy issues", () => {
        const planItems = [
          createPlanItem({
            id: "p1",
            status: "done",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T10:00:00Z", // 60 minutes planned
          }),
        ];
        const actualEntries = [
          createActualEntry({
            id: "a1",
            linked_plan_item_id: "p1",
            start_at: "2024-06-15T09:00:00Z",
            end_at: "2024-06-15T12:00:00Z", // 180 minutes - 200% over
          }),
        ];

        const metrics = calculateDayMetrics(planItems, actualEntries, baseDate);

        // Time accuracy will be penalized
        expect(metrics.focus_score).toBeLessThan(100);
      });
    });

    describe("empty data handling", () => {
      it("should handle empty arrays gracefully", () => {
        const metrics = calculateDayMetrics([], [], baseDate);

        expect(metrics.date).toBe(baseDate);
        expect(metrics.planned_count).toBe(0);
        expect(metrics.completed_count).toBe(0);
        expect(metrics.skipped_count).toBe(0);
        expect(metrics.actual_count).toBe(0);
        expect(metrics.unplanned_count).toBe(0);
        expect(metrics.planned_minutes).toBe(0);
        expect(metrics.actual_minutes).toBe(0);
        expect(metrics.avg_deviation_minutes).toBeNull();
        expect(metrics.within_tolerance_count).toBe(0);
        expect(metrics.completion_rate).toBeNull();
        expect(metrics.focus_score).toBeNull();
      });
    });
  });
});
