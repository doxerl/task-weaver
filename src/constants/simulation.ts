/**
 * Simulation Constants
 * Centralized constants for ScenarioComparisonPage and related components
 */

// =====================================================
// GROWTH MULTIPLIERS
// =====================================================
export const GROWTH_MULTIPLIERS = {
  /** Default revenue growth multiplier for projections */
  REVENUE: 1.3,
  /** Default expense growth multiplier for projections */
  EXPENSE: 1.15,
} as const;

// =====================================================
// DISPLAY LIMITS
// =====================================================
export const DISPLAY_LIMITS = {
  /** Maximum items to display in focus project selector */
  FOCUS_PROJECTS: 5,
  /** Maximum metrics to show in summary cards */
  METRICS: 4,
  /** Maximum recommendations to display */
  RECOMMENDATIONS: 4,
} as const;

// =====================================================
// PDF EXPORT DIMENSIONS
// =====================================================
export const PDF_DIMENSIONS = {
  /** PDF container width in pixels (A4 landscape) */
  WIDTH: 1200,
  /** PDF container height in pixels (A4 landscape) */
  HEIGHT: 848,
  /** PDF scale factor for rendering */
  SCALE: 1.5,
  /** PDF margin in pixels */
  MARGIN: 10,
} as const;

// =====================================================
// FINANCIAL ASSUMPTIONS
// =====================================================
export const FINANCIAL_ASSUMPTIONS = {
  /** Assumed ratio of bank loans that are short-term */
  SHORT_TERM_DEBT_RATIO: 0.3,
  /** Default organic growth rate */
  DEFAULT_GROWTH_RATE: 0.10,
} as const;

// =====================================================
// CHART STYLES
// =====================================================
export const CHART_STYLES = {
  /** Default fill opacity for chart areas */
  FILL_OPACITY: 0.2,
  /** Active fill opacity on hover */
  ACTIVE_FILL_OPACITY: 0.3,
  /** Shadow blur for chart elements */
  SHADOW_BLUR: 4,
  /** Shadow opacity */
  SHADOW_OPACITY: 0.05,
} as const;

// =====================================================
// QUARTERLY CONSTANTS
// =====================================================
export const QUARTERS = ['q1', 'q2', 'q3', 'q4'] as const;
export type Quarter = typeof QUARTERS[number];

// J-Curve distribution for investment impact
export const J_CURVE_DISTRIBUTION = {
  Q1: 0.10,
  Q2: 0.25,
  Q3: 0.65,
  Q4: 1.00,
} as const;

// =====================================================
// INVESTMENT MULTIPLIERS (by business type)
// =====================================================
export const INVESTMENT_MULTIPLIERS = {
  SAAS: 2.0,
  SERVICES: 1.3,
  PRODUCT: 1.8,
} as const;

// =====================================================
// CACHE SETTINGS
// =====================================================
export const CACHE_SETTINGS = {
  /** Analysis cache duration in milliseconds (10 minutes) */
  ANALYSIS_DURATION_MS: 10 * 60 * 1000,
} as const;
