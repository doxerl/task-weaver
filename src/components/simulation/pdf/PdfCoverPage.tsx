import React from 'react';
import { useTranslation } from 'react-i18next';
import { PdfPageWrapper } from './PdfPageWrapper';
import {
  COVER_PAGE_STYLE,
  METRIC_CARD_STYLE,
  METRIC_LABEL_STYLE,
  PDF_COLORS,
  GRID_4_COLS_STYLE,
  getComparisonColor,
} from '@/styles/pdfExport';
import type { PdfCoverPageProps } from './types';

/**
 * PDF Cover Page Component
 * First page of the PDF export with title and key metrics
 */
export function PdfCoverPage({
  scenarioA,
  scenarioB,
  metrics,
  calculateDiff,
  formatValue,
}: PdfCoverPageProps) {
  const { t } = useTranslation(['simulation']);

  return (
    <div
      className="page-break-after"
      style={{
        ...COVER_PAGE_STYLE,
        background: 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 55%, #ffffff 55%)',
      }}
    >
      {/* Title Section */}
      <div style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
          {t('pdf.cover.title')}
        </h1>
        <p style={{ fontSize: '22px', color: '#93c5fd', marginBottom: '8px' }}>
          {scenarioA?.name} vs {scenarioB?.name}
        </p>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
          {t('pdf.cover.targetYear')}: {scenarioB?.targetYear || new Date().getFullYear()}
        </p>
      </div>

      {/* Summary Metrics */}
      <div style={{ position: 'absolute', bottom: '80px', left: '48px', right: '48px' }}>
        <div style={GRID_4_COLS_STYLE}>
          {metrics.slice(0, 4).map((m, i) => {
            const diff = calculateDiff(m.scenarioA, m.scenarioB);
            const isPositive = m.higherIsBetter
              ? m.scenarioB > m.scenarioA
              : m.scenarioB < m.scenarioA;
            return (
              <div key={i} style={METRIC_CARD_STYLE}>
                <p style={METRIC_LABEL_STYLE}>{m.label}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '9px', color: PDF_COLORS.primaryLight, marginBottom: '2px' }}>
                      {scenarioA?.name}
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: PDF_COLORS.primaryLight }}>
                      {formatValue(m.scenarioA, m.format)}
                    </p>
                  </div>
                  <span style={{ color: PDF_COLORS.gray[400], fontSize: '16px' }}>→</span>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '9px', color: PDF_COLORS.success, marginBottom: '2px' }}>
                      {scenarioB?.name}
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: PDF_COLORS.success }}>
                      {formatValue(m.scenarioB, m.format)}
                    </p>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: getComparisonColor(isPositive),
                    textAlign: 'center',
                    marginTop: '8px',
                  }}
                >
                  {diff.percent >= 0 ? '+' : ''}{diff.percent.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PdfCoverPage;
