import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
  getComparisonColor,
} from '@/styles/pdfExport';
import type { PdfMetricsPageProps } from './types';

/**
 * PDF Metrics Page Component
 * Displays financial metrics comparison in a grid layout
 */
export function PdfMetricsPage({
  scenarioA,
  scenarioB,
  metrics,
  calculateDiff,
  formatValue,
}: PdfMetricsPageProps) {
  const { t } = useTranslation(['simulation']);

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>
        {t('pdf.metrics.title')}
      </h2>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {metrics.map((m, i) => {
          const diff = calculateDiff(m.scenarioA, m.scenarioB);
          const isPositive = m.higherIsBetter
            ? m.scenarioB > m.scenarioA
            : m.scenarioB < m.scenarioA;
          return (
            <div
              key={i}
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: isPositive ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${isPositive ? '#86efac' : '#fecaca'}`,
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  color: PDF_COLORS.gray[500],
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                {m.label}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                {/* Scenario A */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      color: PDF_COLORS.primaryLight,
                      fontWeight: '500',
                      marginBottom: '4px',
                    }}
                  >
                    {scenarioA?.name || t('pdf.metrics.scenarioA')}
                  </span>
                  <span style={{ color: PDF_COLORS.primaryLight, fontWeight: '700', fontSize: '16px' }}>
                    {formatValue(m.scenarioA, m.format)}
                  </span>
                </div>

                {/* Arrow */}
                <span style={{ alignSelf: 'center', color: PDF_COLORS.gray[400], fontSize: '18px' }}>→</span>

                {/* Scenario B */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      color: PDF_COLORS.success,
                      fontWeight: '500',
                      marginBottom: '4px',
                    }}
                  >
                    {scenarioB?.name || t('pdf.metrics.scenarioB')}
                  </span>
                  <span style={{ color: PDF_COLORS.success, fontWeight: '700', fontSize: '16px' }}>
                    {formatValue(m.scenarioB, m.format)}
                  </span>
                </div>
              </div>
              <p
                style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: getComparisonColor(isPositive),
                }}
              >
                {diff.percent >= 0 ? '+' : ''}{diff.percent.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PdfMetricsPage;
