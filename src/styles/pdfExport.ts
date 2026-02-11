/**
 * PDF Export Styles
 * Centralized styles for PDF export components
 * These are inline styles because html2canvas requires inline styles for rendering
 */

// PDF dimensions for GrowthComparisonPage (still uses html2canvas)
const PDF_DIMENSIONS = { WIDTH: 1200, HEIGHT: 848 };

export const PDF_PAGE_STYLE = {
  width: `${PDF_DIMENSIONS.WIDTH}px`,
  height: `${PDF_DIMENSIONS.HEIGHT}px`,
  boxSizing: 'border-box' as const,
  background: 'white',
};

// =====================================================
// CONTAINER STYLES
// =====================================================
export const PDF_CONTAINER_STYLE = {
  width: `${PDF_DIMENSIONS.WIDTH}px`,
  background: 'white',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

export const PDF_HIDDEN_CONTAINER_STYLE = {
  position: 'absolute' as const,
  left: '-9999px',
  top: 0,
};

// =====================================================
// COVER PAGE STYLES
// =====================================================
export const COVER_PAGE_STYLE = {
  ...PDF_PAGE_STYLE,
  position: 'relative' as const,
  background: 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 55%, #ffffff 55%)',
  padding: '48px',
};

export const COVER_TITLE_STYLE = {
  fontSize: '42px',
  fontWeight: 'bold',
  color: 'white',
  marginBottom: '16px',
};

export const COVER_SUBTITLE_STYLE = {
  fontSize: '22px',
  color: '#93c5fd',
  marginBottom: '8px',
};

// =====================================================
// CONTENT PAGE STYLES
// =====================================================
export const CONTENT_PAGE_STYLE = {
  ...PDF_PAGE_STYLE,
  padding: '40px',
};

export const PAGE_HEADER_STYLE = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1e3a8a',
  marginBottom: '24px',
  borderBottom: '2px solid #3b82f6',
  paddingBottom: '8px',
};

export const SECTION_TITLE_STYLE = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e3a8a',
  marginBottom: '12px',
};

// =====================================================
// TABLE STYLES
// =====================================================
export const TABLE_STYLE = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '12px',
};

export const TABLE_HEADER_CELL_STYLE = {
  padding: '8px 12px',
  backgroundColor: '#f3f4f6',
  fontWeight: '600',
  textAlign: 'left' as const,
  borderBottom: '2px solid #e2e8f0',
};

export const TABLE_CELL_STYLE = {
  padding: '6px 8px',
  borderBottom: '1px solid #e2e8f0',
};

export const TABLE_CELL_RIGHT_STYLE = {
  ...TABLE_CELL_STYLE,
  textAlign: 'right' as const,
};

export const TABLE_TOTAL_ROW_STYLE = {
  backgroundColor: '#f8fafc',
  fontWeight: '600',
};

// =====================================================
// METRIC CARD STYLES
// =====================================================
export const METRIC_CARD_STYLE = {
  background: 'white',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
};

export const METRIC_LABEL_STYLE = {
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '12px',
  textTransform: 'uppercase' as const,
};

export const METRIC_VALUE_STYLE = {
  fontSize: '16px',
  fontWeight: 'bold',
};

// =====================================================
// COLOR PALETTE
// =====================================================
export const PDF_COLORS = {
  primary: '#1e3a8a',
  primaryLight: '#3b82f6',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e2e8f0',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// =====================================================
// GRID LAYOUTS
// =====================================================
export const GRID_4_COLS_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '20px',
};

export const GRID_2_COLS_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '20px',
};

export const FLEX_BETWEEN_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get color based on value comparison
 */
export function getComparisonColor(isPositive: boolean): string {
  return isPositive ? PDF_COLORS.success : PDF_COLORS.danger;
}

/**
 * Get scenario color
 */
export function getScenarioColor(scenario: 'A' | 'B'): string {
  return scenario === 'A' ? PDF_COLORS.primaryLight : PDF_COLORS.success;
}

/**
 * Create gradient background
 */
export function createGradientBackground(from: string, to: string, breakpoint = 55): string {
  return `linear-gradient(180deg, ${from} 0%, ${to} ${breakpoint}%, #ffffff ${breakpoint}%)`;
}
