import React from 'react';
import {
  PDF_CONTAINER_STYLE,
  PDF_HIDDEN_CONTAINER_STYLE,
} from '@/styles/pdfExport';

// PDF Page Components
import { PdfCoverPage } from './PdfCoverPage';
import { PdfMetricsPage } from './PdfMetricsPage';
import { PdfChartsPage } from './PdfChartsPage';
import { PdfFinancialRatiosPage } from './PdfFinancialRatiosPage';
import { PdfRevenueExpensePage } from './PdfRevenueExpensePage';
import { PdfInvestorPage } from './PdfInvestorPage';
import { PdfCapitalAnalysisPage } from './PdfCapitalAnalysisPage';
import { PdfValuationPage } from './PdfValuationPage';
import { PdfInvestmentOptionsPage } from './PdfInvestmentOptionsPage';
import { PdfScenarioImpactPage } from './PdfScenarioImpactPage';
import { PdfProjectionPage } from './PdfProjectionPage';
import { PdfFocusProjectPage } from './PdfFocusProjectPage';
import { PdfAIInsightsPage } from './PdfAIInsightsPage';
// PdfPitchDeckPage intentionally excluded - Pitch Deck should be a separate export

import type { PdfExportContainerProps } from './types';

/**
 * PDF Export Container Component
 *
 * Main container for PDF export functionality that composes all PDF pages.
 * This component extracts ~1,039 lines of PDF-related code from ScenarioComparisonPage.
 *
 * Pages included (13 pages):
 * 1. Cover Page - Title and key metrics
 * 2. Metrics Page - Financial summary comparison
 * 3. Charts Page - Visual analysis (quarterly comparison)
 * 4. Financial Ratios Page - Professional analysis metrics
 * 5. Revenue/Expense Page - Itemized comparison
 * 6. Investor Page - Deal analysis and exit strategy
 * 7. Capital Analysis Page - Death Valley, Runway, Capital needs (NEW)
 * 8. Valuation Page - 4 valuation methods, 5Y projection (NEW)
 * 9. Investment Options Page - Min/Recommended/Aggressive, AI timing (NEW)
 * 10. Scenario Impact Page - With vs Without investment comparison (NEW)
 * 11. Projection Page - Editable projections
 * 12. Focus Project Page - Investment allocation
 * 13. AI Insights Page - AI-generated insights and recommendations
 *
 * Note: Pitch Deck is intentionally excluded - should be a separate export.
 */
export function PdfExportContainer({
  presentationPdfRef,
  // Scenarios
  scenarioA,
  scenarioB,
  summaryA,
  summaryB,
  // Metrics
  metrics,
  calculateDiff,
  formatValue,
  // Quarterly data
  quarterlyComparison,
  quarterlyCumulativeData,
  quarterlyItemized,
  // Charts
  chartConfig,
  cumulativeChartConfig,
  // Professional analysis
  financialRatios,
  sensitivityAnalysis,
  // AI Analysis
  unifiedAnalysis,
  // Deal & Investment
  dealConfig,
  pdfExitPlan,
  // Projections
  editableRevenueProjection,
  editableExpenseProjection,
  // Focus Projects
  focusProjects,
  investmentAllocation,
  focusProjectPlan,
  // Capital Analysis (NEW)
  capitalNeedA,
  capitalNeedB,
  // Investment Options (NEW)
  investmentTiers,
  optimalTiming,
  // Scenario Comparison (NEW)
  scenarioComparison,
}: PdfExportContainerProps) {
  return (
    <div
      ref={presentationPdfRef}
      className="pdf-hidden-container"
      style={PDF_HIDDEN_CONTAINER_STYLE}
    >
      {/*
        Landscape A4: 297mm x 210mm = 1.414:1 aspect ratio
        1200px width → 848px height (1200/1.414)
        Each page should be this size
      */}
      <div style={PDF_CONTAINER_STYLE}>
        {/* PAGE 1: COVER */}
        <PdfCoverPage
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          metrics={metrics}
          calculateDiff={calculateDiff}
          formatValue={formatValue}
        />

        {/* PAGE 2: METRICS TABLE */}
        <PdfMetricsPage
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          metrics={metrics}
          calculateDiff={calculateDiff}
          formatValue={formatValue}
        />

        {/* PAGE 3: CHARTS */}
        <PdfChartsPage
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          quarterlyComparison={quarterlyComparison}
          quarterlyCumulativeData={quarterlyCumulativeData}
          chartConfig={chartConfig}
          cumulativeChartConfig={cumulativeChartConfig}
        />

        {/* PAGE 4: PROFESSIONAL ANALYSIS METRICS */}
        <PdfFinancialRatiosPage
          financialRatios={financialRatios}
          sensitivityAnalysis={sensitivityAnalysis}
        />

        {/* PAGE 5: REVENUE/EXPENSE COMPARISON */}
        <PdfRevenueExpensePage
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          summaryA={summaryA}
          summaryB={summaryB}
          quarterlyItemized={quarterlyItemized}
        />

        {/* PAGE 6: INVESTOR METRICS */}
        <PdfInvestorPage
          unifiedAnalysis={unifiedAnalysis}
          dealConfig={dealConfig}
          pdfExitPlan={pdfExitPlan}
        />

        {/* PAGE 7: CAPITAL ANALYSIS (NEW) */}
        {capitalNeedA && capitalNeedB && (
          <PdfCapitalAnalysisPage
            capitalNeedA={capitalNeedA}
            capitalNeedB={capitalNeedB}
            dealConfig={dealConfig}
            scenarioAName={`${scenarioA?.targetYear || ''} ${scenarioA?.name || 'Pozitif'}`}
            scenarioBName={`${scenarioB?.targetYear || ''} ${scenarioB?.name || 'Negatif'}`}
          />
        )}

        {/* PAGE 8: VALUATION PAGE (NEW) */}
        {pdfExitPlan && (
          <PdfValuationPage
            pdfExitPlan={pdfExitPlan}
            dealConfig={dealConfig}
          />
        )}

        {/* PAGE 9: INVESTMENT OPTIONS (NEW) */}
        {investmentTiers && investmentTiers.length > 0 && (
          <PdfInvestmentOptionsPage
            investmentTiers={investmentTiers}
            optimalTiming={optimalTiming}
            targetYear={scenarioB?.targetYear || new Date().getFullYear() + 1}
          />
        )}

        {/* PAGE 10: SCENARIO IMPACT (NEW) */}
        {scenarioComparison && (
          <PdfScenarioImpactPage
            scenarioComparison={scenarioComparison}
            scenarioAName={`${scenarioA?.targetYear || ''} ${scenarioA?.name || 'Pozitif'}`}
            scenarioBName={`${scenarioB?.targetYear || ''} ${scenarioB?.name || 'Negatif'}`}
            scenarioYear={Math.max(scenarioA?.targetYear || 2026, scenarioB?.targetYear || 2026)}
          />
        )}

        {/* PAGE 11: EDITABLE PROJECTION */}
        <PdfProjectionPage
          scenarioA={scenarioA}
          editableRevenueProjection={editableRevenueProjection}
          editableExpenseProjection={editableExpenseProjection}
        />

        {/* PAGE 12: FOCUS PROJECT ANALYSIS */}
        <PdfFocusProjectPage
          scenarioA={scenarioA}
          focusProjects={focusProjects}
          investmentAllocation={investmentAllocation}
          focusProjectPlan={focusProjectPlan}
          dealConfig={dealConfig}
        />

        {/* PAGE 13: AI INSIGHTS (Last page - no page break) */}
        <PdfAIInsightsPage
          unifiedAnalysis={unifiedAnalysis}
        />
        {/* Pitch Deck intentionally excluded from PDF export */}
      </div>
    </div>
  );
}

export default PdfExportContainer;
