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
// NEW: Phase 2 PDF Pages
import { PdfQuarterlyCashFlowPage } from './PdfQuarterlyCashFlowPage';
import { PdfFutureImpactPage } from './PdfFutureImpactPage';
import { PdfRunwayChartPage } from './PdfRunwayChartPage';
import { PdfGrowthModelPage } from './PdfGrowthModelPage';
import { PdfFiveYearProjectionPage } from './PdfFiveYearProjectionPage';
// PdfPitchDeckPage intentionally excluded - Pitch Deck should be a separate export

import type { PdfExportContainerProps } from './types';

/**
 * PDF Export Container Component
 *
 * Main container for PDF export functionality that composes all PDF pages.
 * This component extracts ~1,039 lines of PDF-related code from ScenarioComparisonPage.
 *
 * Pages included (18 pages):
 * 1. Cover Page - Title and key metrics
 * 2. Metrics Page - Financial summary comparison
 * 3. Charts Page - Visual analysis (quarterly comparison)
 * 4. Financial Ratios Page - Professional analysis metrics
 * 5. Revenue/Expense Page - Itemized comparison
 * 6. Investor Page - Deal analysis and exit strategy
 * 7. Capital Analysis Page - Death Valley, Runway, Capital needs
 * 8. Valuation Page - 4 valuation methods, 5Y projection
 * 9. Investment Options Page - Min/Recommended/Aggressive, AI timing
 * 10. Scenario Impact Page - With vs Without investment comparison
 * 11. Projection Page - Editable projections
 * 12. Focus Project Page - Investment allocation
 * 13. AI Insights Page - AI-generated insights and recommendations
 * 14. Quarterly Cash Flow Page - Detailed quarterly breakdown
 * 15. Future Impact Page - 5-year projection chart
 * 16. Runway Chart Page - Cash flow runway comparison
 * 17. Growth Model Page - Two-stage growth explanation
 * 18. Five Year Projection Page - Detailed 5-year table
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
  // Capital Analysis
  capitalNeedA,
  capitalNeedB,
  // Investment Options
  investmentTiers,
  optimalTiming,
  // Scenario Comparison
  scenarioComparison,
  // NEW: Phase 2 props
  quarterlyRevenueA,
  quarterlyExpenseA,
  quarterlyRevenueB,
  quarterlyExpenseB,
  runwayData,
  growthConfig,
  multiYearCapitalPlan,
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

        {/* PAGE 13: AI INSIGHTS */}
        <PdfAIInsightsPage
          unifiedAnalysis={unifiedAnalysis}
          summaryA={summaryA}
          summaryB={summaryB}
          capitalNeedA={capitalNeedA}
          capitalNeedB={capitalNeedB}
          scenarioComparison={scenarioComparison}
          dealConfig={dealConfig}
        />

        {/* PAGE 14: QUARTERLY CASH FLOW */}
        {quarterlyRevenueA && quarterlyExpenseA && quarterlyRevenueB && quarterlyExpenseB && (
          <PdfQuarterlyCashFlowPage
            quarterlyRevenueA={quarterlyRevenueA}
            quarterlyExpenseA={quarterlyExpenseA}
            quarterlyRevenueB={quarterlyRevenueB}
            quarterlyExpenseB={quarterlyExpenseB}
            investmentAmount={dealConfig.investmentAmount}
            scenarioAName={`${scenarioA?.targetYear || ''} ${scenarioA?.name || ''}`}
            scenarioBName={`${scenarioB?.targetYear || ''} ${scenarioB?.name || ''}`}
          />
        )}

        {/* PAGE 15: FUTURE IMPACT */}
        {scenarioComparison && (
          <PdfFutureImpactPage
            scenarioComparison={scenarioComparison}
            scenarioYear={Math.max(scenarioA?.targetYear || 2026, scenarioB?.targetYear || 2026)}
          />
        )}

        {/* PAGE 16: RUNWAY CHART */}
        {runwayData && runwayData.length > 0 && (
          <PdfRunwayChartPage
            runwayData={runwayData}
            scenarioAName={`${scenarioA?.targetYear || ''} ${scenarioA?.name || ''}`}
            scenarioBName={`${scenarioB?.targetYear || ''} ${scenarioB?.name || ''}`}
          />
        )}

        {/* PAGE 17: GROWTH MODEL */}
        {growthConfig && (
          <PdfGrowthModelPage
            growthConfig={growthConfig}
            targetYear={scenarioA?.targetYear || new Date().getFullYear() + 1}
          />
        )}

        {/* PAGE 18: FIVE YEAR PROJECTION */}
        {multiYearCapitalPlan && (
          <PdfFiveYearProjectionPage
            multiYearPlan={multiYearCapitalPlan}
            dealConfig={dealConfig}
            exitPlan={pdfExitPlan}
          />
        )}
      </div>
    </div>
  );
}

export default PdfExportContainer;
