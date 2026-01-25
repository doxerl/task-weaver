import { describe, it, expect } from "vitest";
import {
  VUK_DEPRECIATION_RATES,
  getUsefulLifeByCategory,
  getDepreciationRateByCategory,
  calculateDepreciation,
  calculateTotalDepreciation,
  type DepreciationInput,
} from "./depreciationCalculator";

describe("depreciationCalculator", () => {
  describe("VUK_DEPRECIATION_RATES", () => {
    it("should have correct rates for TELEFON (mobile phone)", () => {
      const rate = VUK_DEPRECIATION_RATES["TELEFON"];
      expect(rate).toBeDefined();
      expect(rate.years).toBe(3);
      expect(rate.rate).toBe(33.33);
      expect(rate.accountCode).toBe("255");
    });

    it("should have correct rates for BILGISAYAR (computer)", () => {
      const rate = VUK_DEPRECIATION_RATES["BILGISAYAR"];
      expect(rate).toBeDefined();
      expect(rate.years).toBe(4);
      expect(rate.rate).toBe(25.0);
    });

    it("should have correct rates for ARAC (vehicle)", () => {
      const rate = VUK_DEPRECIATION_RATES["ARAC"];
      expect(rate).toBeDefined();
      expect(rate.years).toBe(5);
      expect(rate.rate).toBe(20.0);
      expect(rate.accountCode).toBe("254");
    });

    it("should have correct rates for EKIPMAN (equipment)", () => {
      const rate = VUK_DEPRECIATION_RATES["EKIPMAN"];
      expect(rate).toBeDefined();
      expect(rate.years).toBe(10);
      expect(rate.rate).toBe(10.0);
      expect(rate.accountCode).toBe("253");
    });
  });

  describe("getUsefulLifeByCategory", () => {
    it("should return correct useful life for known categories", () => {
      expect(getUsefulLifeByCategory("TELEFON")).toBe(3);
      expect(getUsefulLifeByCategory("BILGISAYAR")).toBe(4);
      expect(getUsefulLifeByCategory("ARAC")).toBe(5);
      expect(getUsefulLifeByCategory("EKIPMAN")).toBe(10);
    });

    it("should return default of 5 years for unknown categories", () => {
      expect(getUsefulLifeByCategory("UNKNOWN")).toBe(5);
      expect(getUsefulLifeByCategory("")).toBe(5);
    });
  });

  describe("getDepreciationRateByCategory", () => {
    it("should return correct depreciation rate for known categories", () => {
      expect(getDepreciationRateByCategory("TELEFON")).toBe(33.33);
      expect(getDepreciationRateByCategory("BILGISAYAR")).toBe(25.0);
      expect(getDepreciationRateByCategory("ARAC")).toBe(20.0);
      expect(getDepreciationRateByCategory("EKIPMAN")).toBe(10.0);
    });

    it("should return default of 20% for unknown categories", () => {
      expect(getDepreciationRateByCategory("UNKNOWN")).toBe(20.0);
      expect(getDepreciationRateByCategory("")).toBe(20.0);
    });
  });

  describe("calculateDepreciation", () => {
    describe("edge cases - invalid inputs", () => {
      it("should return zero depreciation when purchaseDate is null", () => {
        const input: DepreciationInput = {
          assetValue: 100000,
          purchaseDate: null,
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.annualDepreciation).toBe(0);
        expect(result.accumulatedDepreciation).toBe(0);
        expect(result.netBookValue).toBe(100000);
        expect(result.monthsUsed).toBe(0);
        expect(result.isFullyDepreciated).toBe(false);
      });

      it("should return zero depreciation when assetValue is zero", () => {
        const input: DepreciationInput = {
          assetValue: 0,
          purchaseDate: "2023-01-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.annualDepreciation).toBe(0);
        expect(result.accumulatedDepreciation).toBe(0);
      });

      it("should return zero depreciation when assetValue is negative", () => {
        const input: DepreciationInput = {
          assetValue: -10000,
          purchaseDate: "2023-01-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.annualDepreciation).toBe(0);
      });

      it("should return zero depreciation when usefulLifeYears is zero", () => {
        const input: DepreciationInput = {
          assetValue: 100000,
          purchaseDate: "2023-01-01",
          usefulLifeYears: 0,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.annualDepreciation).toBe(0);
      });

      it("should return zero depreciation when purchase date is in the future", () => {
        const input: DepreciationInput = {
          assetValue: 100000,
          purchaseDate: "2025-06-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.annualDepreciation).toBe(0);
        expect(result.accumulatedDepreciation).toBe(0);
        expect(result.netBookValue).toBe(100000);
        expect(result.monthsUsed).toBe(0);
        expect(result.isFullyDepreciated).toBe(false);
      });
    });

    describe("straight line depreciation calculations", () => {
      it("should calculate correct annual depreciation for a vehicle (example from docs)", () => {
        // Example: 3,459,470 TL vehicle, 5 year useful life
        // Annual depreciation: 3,459,470 / 5 = 691,894 TL
        const input: DepreciationInput = {
          assetValue: 3459470,
          purchaseDate: "2022-01-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.annualDepreciation).toBe(691894);
      });

      it("should calculate correct accumulated depreciation after 2 years", () => {
        const input: DepreciationInput = {
          assetValue: 3459470,
          purchaseDate: "2022-01-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2023-12-31",
        };

        const result = calculateDepreciation(input);

        // Annual depreciation = 3,459,470 / 5 = 691,894
        // monthsUsed is calculated using 30.44 days/month (approx 23 months for ~729 days)
        // Accumulated = (691,894 / 12) * monthsUsed
        expect(result.annualDepreciation).toBe(691894);
        expect(result.monthsUsed).toBeGreaterThanOrEqual(23);
        expect(result.monthsUsed).toBeLessThanOrEqual(24);
        expect(result.accumulatedDepreciation).toBeGreaterThan(1300000);
        expect(result.accumulatedDepreciation).toBeLessThan(1400000);
      });

      it("should calculate correct net book value", () => {
        const input: DepreciationInput = {
          assetValue: 100000,
          purchaseDate: "2023-01-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        // Annual depreciation = 100,000 / 5 = 20,000
        // monthsUsed is calculated using 30.44 days/month (approx 23 months for ~730 days)
        // Accumulated = (20,000 / 12) * monthsUsed ≈ 38,333
        // Net book value = 100,000 - accumulated ≈ 61,667
        expect(result.annualDepreciation).toBe(20000);
        expect(result.netBookValue).toBeGreaterThan(60000);
        expect(result.netBookValue).toBeLessThan(65000);
        expect(result.netBookValue).toBe(100000 - result.accumulatedDepreciation);
      });

      it("should calculate partial year depreciation correctly", () => {
        const input: DepreciationInput = {
          assetValue: 120000,
          purchaseDate: "2024-07-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        // Annual depreciation = 120,000 / 5 = 24,000
        // 6 months used: accumulated = (24,000 / 12) * 6 = 12,000
        expect(result.annualDepreciation).toBe(24000);
        expect(result.monthsUsed).toBe(6);
      });

      it("should cap net book value at zero when fully depreciated", () => {
        const input: DepreciationInput = {
          assetValue: 60000,
          purchaseDate: "2018-01-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.netBookValue).toBe(0);
        expect(result.isFullyDepreciated).toBe(true);
      });

      it("should mark as fully depreciated when useful life is exceeded", () => {
        const input: DepreciationInput = {
          assetValue: 100000,
          purchaseDate: "2015-01-01",
          usefulLifeYears: 5,
          method: "straight_line",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        expect(result.isFullyDepreciated).toBe(true);
        expect(result.accumulatedDepreciation).toBe(100000);
        expect(result.netBookValue).toBe(0);
      });
    });

    describe("declining balance method (fallback to straight line)", () => {
      it("should use straight line calculation for declining_balance method (not yet implemented)", () => {
        const input: DepreciationInput = {
          assetValue: 100000,
          purchaseDate: "2023-01-01",
          usefulLifeYears: 5,
          method: "declining_balance",
          asOfDate: "2024-12-31",
        };

        const result = calculateDepreciation(input);

        // Currently falls back to straight line
        expect(result.annualDepreciation).toBe(20000);
      });
    });
  });

  describe("calculateTotalDepreciation", () => {
    it("should calculate totals for multiple assets", () => {
      const assets = [
        { value: 100000, purchaseDate: "2023-01-01", usefulLife: 5, name: "Vehicle" },
        { value: 50000, purchaseDate: "2023-01-01", usefulLife: 4, name: "Computer" },
      ];

      const result = calculateTotalDepreciation(assets, "2024-12-31");

      // Vehicle: annual = 20,000, accumulated after ~24 months = 40,000
      // Computer: annual = 12,500, accumulated after ~24 months = 25,000
      expect(result.total.annualDepreciation).toBe(32500);
      expect(result.byAsset).toHaveLength(2);
      expect(result.byAsset[0].name).toBe("Vehicle");
      expect(result.byAsset[1].name).toBe("Computer");
    });

    it("should handle empty assets array", () => {
      const result = calculateTotalDepreciation([], "2024-12-31");

      expect(result.total.annualDepreciation).toBe(0);
      expect(result.total.accumulatedDepreciation).toBe(0);
      expect(result.total.netBookValue).toBe(0);
      expect(result.byAsset).toHaveLength(0);
    });

    it("should handle assets with null purchase dates", () => {
      const assets = [
        { value: 100000, purchaseDate: null, usefulLife: 5, name: "Unknown Asset" },
        { value: 50000, purchaseDate: "2023-01-01", usefulLife: 4, name: "Computer" },
      ];

      const result = calculateTotalDepreciation(assets, "2024-12-31");

      // Only computer should contribute depreciation
      expect(result.total.annualDepreciation).toBe(12500);
      expect(result.byAsset[0].result.annualDepreciation).toBe(0);
      expect(result.byAsset[1].result.annualDepreciation).toBe(12500);
    });

    it("should correctly determine if all assets are fully depreciated", () => {
      const assets = [
        { value: 10000, purchaseDate: "2010-01-01", usefulLife: 5, name: "Old Asset 1" },
        { value: 20000, purchaseDate: "2010-01-01", usefulLife: 5, name: "Old Asset 2" },
      ];

      const result = calculateTotalDepreciation(assets, "2024-12-31");

      expect(result.total.isFullyDepreciated).toBe(true);
    });

    it("should not mark as fully depreciated if any asset still has value", () => {
      const assets = [
        { value: 10000, purchaseDate: "2010-01-01", usefulLife: 5, name: "Old Asset" },
        { value: 50000, purchaseDate: "2024-01-01", usefulLife: 5, name: "New Asset" },
      ];

      const result = calculateTotalDepreciation(assets, "2024-12-31");

      expect(result.total.isFullyDepreciated).toBe(false);
    });

    it("should use max monthsUsed and yearsUsed from all assets", () => {
      const assets = [
        { value: 10000, purchaseDate: "2020-01-01", usefulLife: 5, name: "Asset A" },
        { value: 20000, purchaseDate: "2023-01-01", usefulLife: 5, name: "Asset B" },
      ];

      const result = calculateTotalDepreciation(assets, "2024-12-31");

      // Asset A has been used longer, so max should come from it
      expect(result.total.monthsUsed).toBeGreaterThan(result.byAsset[1].result.monthsUsed);
    });
  });
});
