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

// =====================================================
// AI ANALYSIS DEFAULTS
// =====================================================
export const AI_DEFAULTS = {
  /** Fallback exchange rate when not available from scenario (TRY/USD) */
  FALLBACK_EXCHANGE_RATE: 39,
  /** Maximum years to include in exit plan for AI analysis */
  EXIT_PLAN_MAX_YEARS: 5,
  /** Confidence thresholds for AI insights */
  CONFIDENCE_THRESHOLDS: {
    CERTAIN: 90,
    HIGH: 75,
    MEDIUM: 60,
    LOW: 50
  },
  /** Default revenue growth multiplier for AI projections */
  DEFAULT_REVENUE_GROWTH_MULTIPLIER: 1.3,
  /** Minimum growth threshold - below this is considered "low growth" */
  MIN_GROWTH_THRESHOLD: 0.05,
  /** Maximum reasonable growth threshold - above this might be hallucination */
  MAX_REASONABLE_GROWTH: 2.0,
} as const;

// =====================================================
// SECTOR-SPECIFIC J-CURVE DISTRIBUTIONS
// =====================================================
/** J-Curve quarterly revenue realization patterns by sector */
export const SECTOR_J_CURVES = {
  /** SaaS/Software: Slow start, accelerating growth */
  SAAS: { q1: 0.10, q2: 0.25, q3: 0.65, q4: 1.00 },
  /** Consulting/Services: Steadier realization */
  SERVICES: { q1: 0.20, q2: 0.45, q3: 0.75, q4: 1.00 },
  /** Product/License: Backend-loaded with demos */
  PRODUCT: { q1: 0.05, q2: 0.15, q3: 0.50, q4: 1.00 },
  /** E-commerce: More even distribution */
  ECOMMERCE: { q1: 0.25, q2: 0.40, q3: 0.60, q4: 1.00 },
} as const;

// =====================================================
// OPERATING LEVERAGE CONSTANTS
// =====================================================
export const OPERATING_LEVERAGE = {
  /** Fixed expense growth rate (inflation-based) */
  FIXED_EXPENSE_GROWTH: 0.08,
  /** Variable expense multiplier relative to revenue growth */
  VARIABLE_EXPENSE_MULTIPLIER: 0.5,
  /** Target: If revenue grows 60%, expenses should grow only 25-35% */
  EXPENSE_TO_REVENUE_RATIO_MIN: 0.4,
  EXPENSE_TO_REVENUE_RATIO_MAX: 0.6,
} as const;

// =====================================================
// DEFAULT INVESTMENT ALLOCATION
// =====================================================
export const DEFAULT_INVESTMENT_ALLOCATION = {
  /** Product development percentage */
  PRODUCT: 40,
  /** Marketing percentage */
  MARKETING: 30,
  /** Hiring/Personnel percentage */
  HIRING: 20,
  /** Operations percentage */
  OPERATIONS: 10,
} as const;

// =====================================================
// GROWTH SIMULATION DEFAULTS
// =====================================================
export const SIMULATION_DEFAULTS = {
  /** Default exchange rate (TRY/USD) when not fetched */
  EXCHANGE_RATE: 45,
  /** Minimum revenue threshold to include in projections (USD) */
  MIN_REVENUE_THRESHOLD: 500,
  /** Minimum expense threshold to include in projections (USD) */
  MIN_EXPENSE_THRESHOLD: 300,
} as const;

// =====================================================
// GROWTH RATES
// =====================================================
export const GROWTH_RATES = {
  /** Expense growth as ratio of revenue growth (operating leverage) */
  EXPENSE_TO_REVENUE_RATIO: 0.7,
  /** Fallback growth rate when revenue is 0 */
  FALLBACK_GROWTH: 0.15,
  /** Threshold below which growth is considered "low" */
  LOW_GROWTH_THRESHOLD: 0.05,
  /** Fallback growth rate for low-growth scenarios */
  LOW_GROWTH_FALLBACK: 0.20,
  /** Operating leverage - expense growth ratio */
  OPERATING_LEVERAGE: 0.60,
} as const;

// =====================================================
// CATEGORY MAPPINGS (for GrowthSimulation)
// =====================================================
export const REVENUE_CATEGORY_MAP: Record<string, string> = {
  'SBT': 'SBT Tracker',
  'L&S': 'Leadership Denetim',
  'PlannerDeck': 'PlannerDeck',
  'Hizmet': 'Hizmet Gelirleri',
  'Diğer': 'Diğer Gelirler',
  'Danışmanlık': 'Danışmanlık',
  'Eğitim': 'Eğitim Gelirleri',
  'SaaS': 'SaaS Gelirleri',
} as const;

export const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'PERSONEL': 'Personel (Brüt+SGK)',
  'KIRA': 'Kira ve Aidat',
  'PAZARLAMA': 'Pazarlama',
  'YAZILIM': 'Yazılım ve Araçlar',
  'PROFESYONEL': 'Profesyonel Hizmetler',
  'SEYAHAT': 'Seyahat ve Konaklama',
  'OFIS': 'Ofis Giderleri',
  'İLETİŞİM': 'İletişim',
  'SİGORTA': 'Sigorta',
  'VERGİ': 'Vergi ve Harçlar',
  'BAKIM': 'Bakım ve Onarım',
  'EĞİTİM': 'Eğitim ve Gelişim',
  'BANKA': 'Banka Masrafları',
  'DİĞER': 'Diğer Giderler',
} as const;

/** Expense categories hidden from projections */
export const HIDDEN_EXPENSE_CATEGORIES = [
  'Amortisman',
  'Faiz',
  'Kambiyo',
] as const;
