import { describe, it, expect } from "vitest";
import { getISOWeekData } from "./weekUtils";

describe("weekUtils", () => {
  describe("getISOWeekData", () => {
    describe("standard week calculations", () => {
      it("should return week 1 for January 4th (always in week 1)", () => {
        // January 4th is always in week 1 according to ISO 8601
        const result = getISOWeekData(new Date(2024, 0, 4)); // Jan 4, 2024
        expect(result.weekNumber).toBe(1);
        expect(result.weekYear).toBe(2024);
      });

      it("should return correct week for a mid-year date", () => {
        // June 15, 2024 is a Saturday in week 24
        const result = getISOWeekData(new Date(2024, 5, 15));
        expect(result.weekNumber).toBe(24);
        expect(result.weekYear).toBe(2024);
      });

      it("should return week 52 for late December (most years)", () => {
        // December 25, 2024 (Wednesday)
        const result = getISOWeekData(new Date(2024, 11, 25));
        expect(result.weekNumber).toBe(52);
        expect(result.weekYear).toBe(2024);
      });
    });

    describe("year boundary edge cases", () => {
      it("should handle Jan 1 that belongs to previous year week 52", () => {
        // January 1, 2022 was a Saturday - belongs to week 52 of 2021
        const result = getISOWeekData(new Date(2022, 0, 1));
        expect(result.weekNumber).toBe(52);
        expect(result.weekYear).toBe(2021);
      });

      it("should handle Dec 31 that belongs to next year week 1", () => {
        // December 31, 2020 was a Thursday - belongs to week 53 of 2020
        const result2020 = getISOWeekData(new Date(2020, 11, 31));
        expect(result2020.weekYear).toBe(2020);
        expect(result2020.weekNumber).toBe(53);

        // December 31, 2019 was a Tuesday - still week 1 of 2020
        const result2019 = getISOWeekData(new Date(2019, 11, 31));
        expect(result2019.weekYear).toBe(2020);
        expect(result2019.weekNumber).toBe(1);
      });

      it("should handle years with 53 weeks", () => {
        // 2020 had 53 weeks (started and ended on Thursday)
        const result = getISOWeekData(new Date(2020, 11, 28)); // Dec 28, 2020
        expect(result.weekNumber).toBe(53);
        expect(result.weekYear).toBe(2020);
      });

      it("should handle first Monday of year correctly", () => {
        // January 6, 2020 was a Monday - week 2 of 2020
        const result = getISOWeekData(new Date(2020, 0, 6));
        expect(result.weekNumber).toBe(2);
        expect(result.weekYear).toBe(2020);
      });
    });

    describe("day of week handling", () => {
      it("should return same week for all days Monday-Sunday", () => {
        // Week 24 of 2024: June 10-16
        const monday = getISOWeekData(new Date(2024, 5, 10));
        const tuesday = getISOWeekData(new Date(2024, 5, 11));
        const wednesday = getISOWeekData(new Date(2024, 5, 12));
        const thursday = getISOWeekData(new Date(2024, 5, 13));
        const friday = getISOWeekData(new Date(2024, 5, 14));
        const saturday = getISOWeekData(new Date(2024, 5, 15));
        const sunday = getISOWeekData(new Date(2024, 5, 16));

        expect(monday.weekNumber).toBe(24);
        expect(tuesday.weekNumber).toBe(24);
        expect(wednesday.weekNumber).toBe(24);
        expect(thursday.weekNumber).toBe(24);
        expect(friday.weekNumber).toBe(24);
        expect(saturday.weekNumber).toBe(24);
        expect(sunday.weekNumber).toBe(24);

        // All should have same week year
        expect(monday.weekYear).toBe(2024);
        expect(sunday.weekYear).toBe(2024);
      });

      it("should increment week number at Monday boundary", () => {
        // Sunday June 16, 2024 is week 24
        const sunday = getISOWeekData(new Date(2024, 5, 16));
        // Monday June 17, 2024 is week 25
        const monday = getISOWeekData(new Date(2024, 5, 17));

        expect(sunday.weekNumber).toBe(24);
        expect(monday.weekNumber).toBe(25);
      });
    });

    describe("time component handling", () => {
      it("should return same result regardless of time", () => {
        const midnight = getISOWeekData(new Date(2024, 5, 15, 0, 0, 0));
        const noon = getISOWeekData(new Date(2024, 5, 15, 12, 0, 0));
        const endOfDay = getISOWeekData(new Date(2024, 5, 15, 23, 59, 59));

        expect(midnight.weekNumber).toBe(noon.weekNumber);
        expect(noon.weekNumber).toBe(endOfDay.weekNumber);
        expect(midnight.weekYear).toBe(endOfDay.weekYear);
      });
    });

    describe("specific known dates", () => {
      it("should correctly identify week numbers for 2024", () => {
        // Known dates in 2024
        expect(getISOWeekData(new Date(2024, 0, 1)).weekNumber).toBe(1); // Jan 1, 2024 (Monday)
        expect(getISOWeekData(new Date(2024, 0, 7)).weekNumber).toBe(1); // Jan 7, 2024 (Sunday)
        expect(getISOWeekData(new Date(2024, 0, 8)).weekNumber).toBe(2); // Jan 8, 2024 (Monday)
        expect(getISOWeekData(new Date(2024, 6, 4)).weekNumber).toBe(27); // July 4, 2024
      });

      it("should correctly identify week numbers for 2023", () => {
        // January 1, 2023 was a Sunday - belongs to week 52 of 2022
        const jan1_2023 = getISOWeekData(new Date(2023, 0, 1));
        expect(jan1_2023.weekNumber).toBe(52);
        expect(jan1_2023.weekYear).toBe(2022);

        // January 2, 2023 was a Monday - week 1 of 2023
        const jan2_2023 = getISOWeekData(new Date(2023, 0, 2));
        expect(jan2_2023.weekNumber).toBe(1);
        expect(jan2_2023.weekYear).toBe(2023);
      });
    });

    describe("leap year handling", () => {
      it("should handle Feb 29 in leap years", () => {
        // February 29, 2024 (leap year) - Thursday, week 9
        const result = getISOWeekData(new Date(2024, 1, 29));
        expect(result.weekNumber).toBe(9);
        expect(result.weekYear).toBe(2024);
      });

      it("should handle dates around Feb 28/29 boundary", () => {
        // 2024 is a leap year
        const feb28 = getISOWeekData(new Date(2024, 1, 28));
        const feb29 = getISOWeekData(new Date(2024, 1, 29));
        const mar1 = getISOWeekData(new Date(2024, 2, 1));

        expect(feb28.weekNumber).toBe(9);
        expect(feb29.weekNumber).toBe(9);
        expect(mar1.weekNumber).toBe(9);
      });
    });
  });
});
