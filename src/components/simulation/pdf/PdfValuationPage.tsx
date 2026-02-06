import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  TABLE_STYLE,
  TABLE_HEADER_CELL_STYLE,
  TABLE_CELL_STYLE,
  TABLE_CELL_RIGHT_STYLE,
  PDF_COLORS,
  GRID_4_COLS_STYLE,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import { DEFAULT_VALUATION_CONFIG } from '@/lib/valuationCalculator';
import type { PdfValuationPageProps } from './types';

/**
 * Safe division utility for table calculations
 */
function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  return denominator !== 0 ? numerator / denominator : defaultValue;
}

/**
 * PDF Valuation Methods Page Component
 * Displays 4 valuation methods comparison and 5-year projection table
 * 
 * IMPORTANT: This component does NOT calculate valuations - it reads pre-calculated
 * values from pdfExitPlan.allYears[].valuations for data consistency with UI
 */
export function PdfValuationPage({
  pdfExitPlan,
  dealConfig,
}: PdfValuationPageProps) {
  const { t } = useTranslation(['simulation']);

  // Get weights from centralized config (for display purposes only)
  const { weights, discountRate, expectedROI } = DEFAULT_VALUATION_CONFIG;

  // Get year 5 projection - use pre-calculated values, NO recalculation
  const year5 = pdfExitPlan?.allYears?.[4]; // 5th year (index 4)

  // Guard: If allYears is empty or has fewer than 5 elements, year5 will be undefined
  // We still need to calculate valuation methods even if year5 is missing (use defaults)
  
  // Read pre-calculated valuation values from props (Single Source of Truth)
  const valuations = year5?.valuations;
  const revenueMultiple = valuations?.revenueMultiple || 0;
  const ebitdaMultiple = valuations?.ebitdaMultiple || 0;
  const dcfValue = valuations?.dcf || 0;
  const vcMethodValue = valuations?.vcMethod || 0;
  const weightedValuation = valuations?.weighted || 0;

  // Read pre-calculated financial metrics from props
  const ebitda = year5?.ebitda || (year5 ? year5.revenue - year5.expenses : 0);
  const revenue = year5?.revenue || 0;

  // Valuation method cards data (useMemo must be before conditional returns)
  const valuationMethods = useMemo(() => [
    {
      name: t('pdf.valuation.revenueMultiple'),
      value: revenueMultiple,
      formula: `${formatCompactUSD(revenue)} × ${dealConfig?.sectorMultiple || 3}x`,
      weight: `${(weights.revenueMultiple * 100).toFixed(0)}%`,
      color: '#eff6ff',
      borderColor: '#93c5fd',
      iconColor: '#3b82f6',
    },
    {
      name: t('pdf.valuation.ebitdaMultiple'),
      value: ebitdaMultiple,
      formula: ebitda !== 0 
        ? `${formatCompactUSD(ebitda)} × ${(ebitdaMultiple / ebitda).toFixed(1)}x`
        : `${formatCompactUSD(ebitda)} × 8x`,
      weight: `${(weights.ebitdaMultiple * 100).toFixed(0)}%`,
      color: '#faf5ff',
      borderColor: '#c4b5fd',
      iconColor: '#8b5cf6',
    },
    {
      name: t('pdf.valuation.dcf'),
      value: dcfValue,
      formula: t('pdf.valuation.discountRate', { rate: (discountRate * 100).toFixed(0) }),
      weight: `${(weights.dcf * 100).toFixed(0)}%`,
      color: '#f0fdf4',
      borderColor: '#86efac',
      iconColor: '#22c55e',
    },
    {
      name: t('pdf.valuation.vcMethod'),
      value: vcMethodValue,
      formula: t('pdf.valuation.targetROI', { roi: expectedROI }),
      weight: `${(weights.vcMethod * 100).toFixed(0)}%`,
      color: '#fffbeb',
      borderColor: '#fcd34d',
      iconColor: '#f59e0b',
    },
  ], [t, revenueMultiple, ebitdaMultiple, dcfValue, vcMethodValue, revenue, ebitda, dealConfig?.sectorMultiple, weights, discountRate, expectedROI]);

  // Early return after all hooks - guard for missing data
  if (!pdfExitPlan || !pdfExitPlan.allYears || pdfExitPlan.allYears.length === 0) {
    return null;
  }

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>{t('pdf.valuation.title')}</h2>

      {/* 4 Valuation Methods Grid */}
      <div style={{ ...GRID_4_COLS_STYLE, marginBottom: '24px' }}>
        {valuationMethods.map((method) => (
          <div
            key={method.name}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: method.color,
              border: `1px solid ${method.borderColor}`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: method.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {method.weight}
            </div>
            <p style={{ fontSize: '12px', color: PDF_COLORS.gray[600], marginBottom: '8px', fontWeight: '600' }}>
              {method.name}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
              {formatCompactUSD(method.value)}
            </p>
            <p style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
              {method.formula}
            </p>
          </div>
        ))}
      </div>

      {/* Weighted Valuation Banner */}
      <div
        style={{
          padding: '24px',
          marginBottom: '24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
            {t('pdf.valuation.weightedValuationYear5')}
          </p>
          <p style={{ fontSize: '11px', opacity: 0.7 }}>
            {t('pdf.valuation.weightedAverage4Methods')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '36px', fontWeight: 'bold' }}>
            {formatCompactUSD(weightedValuation)}
          </p>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>
            MOIC: {pdfExitPlan.moic5Year.toFixed(1)}x
          </p>
        </div>
      </div>

      {/* 5-Year Projection Table */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
          {t('pdf.valuation.fiveYearProjectionDetail')}
        </h3>

        <table style={{ ...TABLE_STYLE, fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, color: '#374151' }}>{t('pdf.valuation.year')}</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>{t('pdf.valuation.revenue')}</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>{t('pdf.valuation.expense')}</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>{t('pdf.valuation.netProfit')}</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>{t('pdf.valuation.profitMargin')}</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>{t('pdf.valuation.companyValue')}</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>{t('pdf.valuation.investorShare')}</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>{t('pdf.valuation.moic')}</th>
            </tr>
          </thead>
          <tbody>
            {pdfExitPlan.allYears?.slice(0, 5).map((year, index) => {
              const profitMargin = safeDivide(year.netProfit, year.revenue, 0) * 100;
              const investorShare = year.companyValuation * (dealConfig.equityPercentage / 100);
              const moic = safeDivide(investorShare, dealConfig.investmentAmount, 0);
              const isHighlightYear = index === 2 || index === 4; // Year 3 and Year 5

              return (
                <tr
                  key={year.year}
                  style={{
                    background: isHighlightYear ? '#f0fdf4' : 'transparent',
                  }}
                >
                  <td style={{ ...TABLE_CELL_STYLE, fontWeight: '600', color: '#374151' }}>
                    {year.year}
                    {isHighlightYear && (
                      <span style={{ marginLeft: '6px', fontSize: '9px', color: PDF_COLORS.success }}>
                        ★
                      </span>
                    )}
                  </td>
                  <td style={{ ...TABLE_CELL_RIGHT_STYLE, color: '#374151' }}>
                    {formatCompactUSD(year.revenue)}
                  </td>
                  <td style={{ ...TABLE_CELL_RIGHT_STYLE, color: '#374151' }}>
                    {formatCompactUSD(year.expenses)}
                  </td>
                  <td
                    style={{
                      ...TABLE_CELL_RIGHT_STYLE,
                      color: year.netProfit >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
                      fontWeight: '500',
                    }}
                  >
                    {formatCompactUSD(year.netProfit)}
                  </td>
                  <td
                    style={{
                      ...TABLE_CELL_RIGHT_STYLE,
                      color: profitMargin >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
                    }}
                  >
                    %{profitMargin.toFixed(1)}
                  </td>
                  <td style={{ ...TABLE_CELL_RIGHT_STYLE, color: '#374151', fontWeight: '500' }}>
                    {formatCompactUSD(year.companyValuation)}
                  </td>
                  <td style={{ ...TABLE_CELL_RIGHT_STYLE, color: PDF_COLORS.primary }}>
                    {formatCompactUSD(investorShare)}
                  </td>
                  <td
                    style={{
                      ...TABLE_CELL_RIGHT_STYLE,
                      fontWeight: '600',
                      color: moic >= 3 ? '#166534' : moic >= 2 ? '#ca8a04' : '#dc2626',
                    }}
                  >
                    {moic.toFixed(1)}x
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* MOIC Legend */}
        <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#166534' }} />
            <span style={{ color: PDF_COLORS.gray[600] }}>{t('pdf.valuation.moicExcellent')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ca8a04' }} />
            <span style={{ color: PDF_COLORS.gray[600] }}>{t('pdf.valuation.moicGood')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#dc2626' }} />
            <span style={{ color: PDF_COLORS.gray[600] }}>{t('pdf.valuation.moicLow')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#166534', fontWeight: '600' }}>★</span>
            <span style={{ color: PDF_COLORS.gray[600] }}>{t('pdf.valuation.importantYears')}</span>
          </div>
        </div>
      </div>

      {/* Growth Model Info */}
      {pdfExitPlan.growthConfig && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '20px' }}>
          <div style={{ padding: '14px 18px', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fcd34d' }}>
            <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '6px', fontWeight: '500' }}>
              {t('pdf.valuation.aggressiveGrowthPhase')}
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>
              %{(pdfExitPlan.growthConfig.aggressiveGrowthRate * 100).toFixed(0)}
            </p>
          </div>
          <div style={{ padding: '14px 18px', background: '#dcfce7', borderRadius: '10px', border: '1px solid #86efac' }}>
            <p style={{ fontSize: '11px', color: '#166534', marginBottom: '6px', fontWeight: '500' }}>
              {t('pdf.valuation.normalizedGrowthPhase')}
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
              %{(pdfExitPlan.growthConfig.normalizedGrowthRate * 100).toFixed(0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfValuationPage;
