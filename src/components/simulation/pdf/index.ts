/**
 * PDF Export Components
 *
 * This module provides components for exporting scenario comparison data to PDF.
 * Extracted from ScenarioComparisonPage.tsx (~1,039 lines of inline code).
 */

// Main Container
export { PdfExportContainer } from './PdfExportContainer';

// Page Components
export { PdfPageWrapper } from './PdfPageWrapper';
export { PdfCoverPage } from './PdfCoverPage';
export { PdfMetricsPage } from './PdfMetricsPage';
export { PdfChartsPage } from './PdfChartsPage';
export { PdfFinancialRatiosPage } from './PdfFinancialRatiosPage';
export { PdfRevenueExpensePage } from './PdfRevenueExpensePage';
export { PdfInvestorPage } from './PdfInvestorPage';
export { PdfProjectionPage } from './PdfProjectionPage';
export { PdfFocusProjectPage } from './PdfFocusProjectPage';
export { PdfAIInsightsPage } from './PdfAIInsightsPage';
export { PdfPitchDeckPage } from './PdfPitchDeckPage';

// Types
export type {
  PdfExportContainerProps,
  PdfCoverPageProps,
  PdfMetricsPageProps,
  PdfChartsPageProps,
  PdfFinancialRatiosPageProps,
  PdfRevenueExpensePageProps,
  PdfInvestorPageProps,
  PdfProjectionPageProps,
  PdfFocusProjectPageProps,
  PdfAIInsightsPageProps,
  PdfPitchDeckPageProps,
  DealConfig,
  ScenarioSummary,
  MetricItem,
  QuarterlyComparisonData,
  CumulativeQuarterlyData,
  PdfExitPlanData,
  ExitPlanYear,
} from './types';
