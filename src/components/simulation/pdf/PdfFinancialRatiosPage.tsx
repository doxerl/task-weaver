import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  TABLE_STYLE,
  TABLE_HEADER_CELL_STYLE,
  TABLE_CELL_STYLE,
  TABLE_CELL_RIGHT_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfFinancialRatiosPageProps } from './types';

/**
 * PDF Financial Ratios Page Component
 * Displays professional analysis metrics including liquidity, leverage, and profitability ratios
 */
export function PdfFinancialRatiosPage({
  financialRatios,
  sensitivityAnalysis,
}: PdfFinancialRatiosPageProps) {
  const { t } = useTranslation(['simulation']);

  if (!financialRatios || !sensitivityAnalysis) {
    return null;
  }

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>
        {t('pdf.financialRatios.title')}
      </h2>

      {/* Financial Ratios Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {/* Liquidity */}
        <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1', marginBottom: '16px' }}>
            {t('pdf.financialRatios.liquidityRatios')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.currentRatio')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {financialRatios.liquidity.currentRatio.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.quickRatio')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {financialRatios.liquidity.quickRatio.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.cashRatio')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {financialRatios.liquidity.cashRatio.toFixed(2)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #bae6fd',
                paddingTop: '8px',
                marginTop: '4px',
              }}
            >
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.workingCapital')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {formatCompactUSD(financialRatios.liquidity.workingCapital)}
              </span>
            </div>
          </div>
        </div>

        {/* Leverage */}
        <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fcd34d' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '16px' }}>
            {t('pdf.financialRatios.leverageRatios')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.debtToEquity')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {financialRatios.leverage.debtToEquity.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.debtToAssets')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{(financialRatios.leverage.debtToAssets * 100).toFixed(0)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.receivablesToAssets')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{(financialRatios.leverage.receivablesRatio * 100).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Profitability */}
        <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #86efac' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '16px' }}>
            {t('pdf.financialRatios.profitabilityRatios')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.roa')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{financialRatios.profitability.returnOnAssets.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.roe')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{financialRatios.profitability.returnOnEquity.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.financialRatios.netMargin')}</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{financialRatios.profitability.netMargin.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis Table */}
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
        {t('pdf.financialRatios.sensitivityTitle')}
      </h3>
      <table style={TABLE_STYLE}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={TABLE_HEADER_CELL_STYLE}>{t('pdf.financialRatios.change')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>{t('pdf.financialRatios.revenue')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>{t('pdf.financialRatios.profit')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>{t('pdf.financialRatios.margin')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>{t('pdf.financialRatios.moic')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>{t('pdf.financialRatios.runway')}</th>
          </tr>
        </thead>
        <tbody>
          {sensitivityAnalysis.revenueImpact.map((row, i) => (
            <tr key={i} style={{ background: row.change === 0 ? '#fef3c7' : 'white' }}>
              <td
                style={{
                  ...TABLE_CELL_STYLE,
                  fontWeight: row.change === 0 ? '600' : '400',
                }}
              >
                {row.change >= 0 ? '+' : ''}{row.change}%
              </td>
              <td style={TABLE_CELL_RIGHT_STYLE}>
                {formatCompactUSD(row.revenue)}
              </td>
              <td
                style={{
                  ...TABLE_CELL_RIGHT_STYLE,
                  color: row.profit >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
                  fontWeight: '500',
                }}
              >
                {formatCompactUSD(row.profit)}
              </td>
              <td style={TABLE_CELL_RIGHT_STYLE}>
                %{row.margin.toFixed(1)}
              </td>
              <td style={TABLE_CELL_RIGHT_STYLE}>
                {row.moic.toFixed(1)}x
              </td>
              <td style={TABLE_CELL_RIGHT_STYLE}>
                {row.runway < 999 ? t('pdf.financialRatios.months', { count: row.runway }) : '∞'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PdfFinancialRatiosPage;
