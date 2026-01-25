import { describe, it, expect } from "vitest";
import {
  formatCompact,
  formatCompactUSD,
  formatCompactTRY,
  formatFullUSD,
  formatFullTRY,
} from "./formatters";

describe("formatters", () => {
  describe("formatCompact", () => {
    describe("TRY currency (default)", () => {
      it("should format values under 1000 without suffix", () => {
        expect(formatCompact(500)).toBe("₺500");
        expect(formatCompact(999)).toBe("₺999");
        expect(formatCompact(0)).toBe("₺0");
        expect(formatCompact(1)).toBe("₺1");
      });

      it("should format thousands with K suffix", () => {
        expect(formatCompact(1000)).toBe("₺1.0K");
        expect(formatCompact(1500)).toBe("₺1.5K");
        expect(formatCompact(73100)).toBe("₺73.1K");
        expect(formatCompact(999999)).toBe("₺1000.0K");
      });

      it("should format millions with M suffix", () => {
        expect(formatCompact(1000000)).toBe("₺1.0M");
        expect(formatCompact(2900000)).toBe("₺2.9M");
        expect(formatCompact(1200000)).toBe("₺1.2M");
        expect(formatCompact(150000000)).toBe("₺150.0M");
      });

      it("should handle negative values", () => {
        expect(formatCompact(-500)).toBe("-₺500");
        expect(formatCompact(-1500)).toBe("-₺1.5K");
        expect(formatCompact(-2900000)).toBe("-₺2.9M");
      });

      it("should handle very small negative values", () => {
        expect(formatCompact(-1)).toBe("-₺1");
        expect(formatCompact(-99)).toBe("-₺99");
      });
    });

    describe("USD currency", () => {
      it("should format values under 1000 without suffix", () => {
        expect(formatCompact(500, "USD")).toBe("$500");
        expect(formatCompact(999, "USD")).toBe("$999");
        expect(formatCompact(0, "USD")).toBe("$0");
      });

      it("should format thousands with K suffix", () => {
        expect(formatCompact(1000, "USD")).toBe("$1.0K");
        expect(formatCompact(73100, "USD")).toBe("$73.1K");
      });

      it("should format millions with M suffix", () => {
        expect(formatCompact(1000000, "USD")).toBe("$1.0M");
        expect(formatCompact(2900000, "USD")).toBe("$2.9M");
      });

      it("should handle negative USD values", () => {
        expect(formatCompact(-500, "USD")).toBe("-$500");
        expect(formatCompact(-2900000, "USD")).toBe("-$2.9M");
      });
    });

    describe("edge cases", () => {
      it("should handle exactly 1000", () => {
        expect(formatCompact(1000)).toBe("₺1.0K");
      });

      it("should handle exactly 1000000", () => {
        expect(formatCompact(1000000)).toBe("₺1.0M");
      });

      it("should handle decimal rounding", () => {
        expect(formatCompact(1234)).toBe("₺1.2K");
        expect(formatCompact(1254)).toBe("₺1.3K");
        expect(formatCompact(1244)).toBe("₺1.2K");
      });

      it("should handle large numbers in billions", () => {
        expect(formatCompact(1000000000)).toBe("₺1000.0M");
        expect(formatCompact(5500000000)).toBe("₺5500.0M");
      });
    });
  });

  describe("formatCompactUSD (deprecated)", () => {
    it("should work the same as formatCompact with USD", () => {
      expect(formatCompactUSD(500)).toBe(formatCompact(500, "USD"));
      expect(formatCompactUSD(73100)).toBe(formatCompact(73100, "USD"));
      expect(formatCompactUSD(2900000)).toBe(formatCompact(2900000, "USD"));
      expect(formatCompactUSD(-1500)).toBe(formatCompact(-1500, "USD"));
    });
  });

  describe("formatCompactTRY (deprecated)", () => {
    it("should work the same as formatCompact with TRY", () => {
      expect(formatCompactTRY(500)).toBe(formatCompact(500, "TRY"));
      expect(formatCompactTRY(73100)).toBe(formatCompact(73100, "TRY"));
      expect(formatCompactTRY(2900000)).toBe(formatCompact(2900000, "TRY"));
      expect(formatCompactTRY(-1500)).toBe(formatCompact(-1500, "TRY"));
    });
  });

  describe("formatFullUSD", () => {
    it("should format with USD currency symbol and thousand separators", () => {
      expect(formatFullUSD(150549)).toBe("$150,549");
      expect(formatFullUSD(2188068)).toBe("$2,188,068");
    });

    it("should format small values without decimals", () => {
      expect(formatFullUSD(0)).toBe("$0");
      expect(formatFullUSD(1)).toBe("$1");
      expect(formatFullUSD(999)).toBe("$999");
    });

    it("should format with thousand separators", () => {
      expect(formatFullUSD(1000)).toBe("$1,000");
      expect(formatFullUSD(10000)).toBe("$10,000");
      expect(formatFullUSD(100000)).toBe("$100,000");
      expect(formatFullUSD(1000000)).toBe("$1,000,000");
    });

    it("should handle negative values", () => {
      expect(formatFullUSD(-1000)).toBe("-$1,000");
      expect(formatFullUSD(-150549)).toBe("-$150,549");
    });

    it("should round decimal values to integers", () => {
      expect(formatFullUSD(1234.56)).toBe("$1,235");
      expect(formatFullUSD(1234.44)).toBe("$1,234");
    });
  });

  describe("formatFullTRY", () => {
    it("should format with TRY currency symbol and Turkish locale separators", () => {
      // Turkish locale uses . for thousand separators
      expect(formatFullTRY(150549)).toBe("₺150.549");
      expect(formatFullTRY(2188068)).toBe("₺2.188.068");
    });

    it("should format small values without decimals", () => {
      expect(formatFullTRY(0)).toBe("₺0");
      expect(formatFullTRY(1)).toBe("₺1");
      expect(formatFullTRY(999)).toBe("₺999");
    });

    it("should format with Turkish thousand separators (period)", () => {
      expect(formatFullTRY(1000)).toBe("₺1.000");
      expect(formatFullTRY(10000)).toBe("₺10.000");
      expect(formatFullTRY(100000)).toBe("₺100.000");
      expect(formatFullTRY(1000000)).toBe("₺1.000.000");
    });

    it("should handle negative values", () => {
      expect(formatFullTRY(-1000)).toBe("-₺1.000");
      expect(formatFullTRY(-150549)).toBe("-₺150.549");
    });

    it("should round decimal values to integers", () => {
      expect(formatFullTRY(1234.56)).toBe("₺1.235");
      expect(formatFullTRY(1234.44)).toBe("₺1.234");
    });
  });
});
