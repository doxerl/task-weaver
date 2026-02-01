import React from 'react';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
  GRID_4_COLS_STYLE,
  GRID_2_COLS_STYLE,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfCapitalAnalysisPageProps } from './types';

/**
 * PDF Capital Analysis Page Component
 * Displays Death Valley analysis, Runway metrics, and Capital requirements comparison
 */
export function PdfCapitalAnalysisPage({
  capitalNeedA,
  capitalNeedB,
  scenarioAName,
  scenarioBName,
}: PdfCapitalAnalysisPageProps) {
  // Guard clause - both capital needs required
  if (!capitalNeedA || !capitalNeedB) {
    return null;
  }

  // Calculate max deficit for bar visualization
  const maxDeficit = Math.max(
    Math.abs(capitalNeedA.minCumulativeCash),
    Math.abs(capitalNeedB.minCumulativeCash),
    1 // Prevent division by zero
  );

  // Helper to get bar width percentage
  const getBarWidth = (value: number) => {
    return Math.min((Math.abs(value) / maxDeficit) * 100, 100);
  };

  // Helper to format runway months
  const formatRunway = (months: number) => {
    if (months >= 999) return '∞ (Süresiz)';
    if (months >= 24) return `${months} ay (2+ yıl)`;
    if (months >= 12) return `${months} ay (1+ yıl)`;
    return `${months} ay`;
  };

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>Sermaye & Death Valley Analizi</h2>

      {/* Scenario Comparison Cards */}
      <div style={{ ...GRID_2_COLS_STYLE, marginBottom: '24px' }}>
        {/* Scenario A (Positive) Card */}
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: '#f0fdf4',
            border: '2px solid #86efac',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#166534', margin: 0 }}>
              {scenarioAName}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Death Valley</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: capitalNeedA.minCumulativeCash < 0 ? '#dc2626' : '#166534' }}>
                {formatCompactUSD(capitalNeedA.minCumulativeCash)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Kritik Çeyrek</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
                {capitalNeedA.criticalQuarter || 'Yok'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Runway</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534' }}>
                {formatRunway(capitalNeedA.runwayMonths)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>Yıl Sonu</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: capitalNeedA.yearEndBalance >= 0 ? '#166534' : '#dc2626' }}>
                {formatCompactUSD(capitalNeedA.yearEndBalance)}
              </p>
            </div>
          </div>

          {capitalNeedA.selfSustaining && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#dcfce7',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#166534',
              fontWeight: '500'
            }}>
              ✓ Kendi Kendini Finanse Ediyor
            </div>
          )}
        </div>

        {/* Scenario B (Negative) Card */}
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '2px solid #fca5a5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#991b1b', margin: 0 }}>
              {scenarioBName}
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>Death Valley</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: capitalNeedB.minCumulativeCash < 0 ? '#dc2626' : '#166534' }}>
                {formatCompactUSD(capitalNeedB.minCumulativeCash)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>Kritik Çeyrek</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#991b1b' }}>
                {capitalNeedB.criticalQuarter || 'Yok'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>Runway</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#991b1b' }}>
                {formatRunway(capitalNeedB.runwayMonths)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>Yıl Sonu</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: capitalNeedB.yearEndBalance >= 0 ? '#166534' : '#dc2626' }}>
                {formatCompactUSD(capitalNeedB.yearEndBalance)}
              </p>
            </div>
          </div>

          {!capitalNeedB.selfSustaining && capitalNeedB.requiredInvestment > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#fee2e2',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#991b1b',
              fontWeight: '500'
            }}>
              ⚠ Gerekli Yatırım: {formatCompactUSD(capitalNeedB.requiredInvestment)}
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={{ ...GRID_4_COLS_STYLE, marginBottom: '24px' }}>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '11px', color: PDF_COLORS.gray[500], marginBottom: '6px', textTransform: 'uppercase' }}>
            Peak Deficit (B)
          </p>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: PDF_COLORS.danger }}>
            {formatCompactUSD(Math.min(capitalNeedB.minCumulativeCash, 0))}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '11px', color: PDF_COLORS.gray[500], marginBottom: '6px', textTransform: 'uppercase' }}>
            Gerekli Yatırım
          </p>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
            {formatCompactUSD(capitalNeedB.requiredInvestment)}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '11px', color: PDF_COLORS.gray[500], marginBottom: '6px', textTransform: 'uppercase' }}>
            2Y Death Valley
          </p>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: PDF_COLORS.danger }}>
            {formatCompactUSD(capitalNeedB.extendedRunway?.combinedDeathValley || capitalNeedB.minCumulativeCash)}
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '11px', color: PDF_COLORS.gray[500], marginBottom: '6px', textTransform: 'uppercase' }}>
            Break-even
          </p>
          <p style={{ fontSize: '22px', fontWeight: 'bold', color: PDF_COLORS.success }}>
            {capitalNeedA.breakEvenQuarter || 'Q4+'}
          </p>
        </div>
      </div>

      {/* Death Valley Visual Comparison */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
          Death Valley Derinlik Karşılaştırması
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Scenario A Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '120px', fontSize: '12px', color: '#166534', fontWeight: '500' }}>
              Pozitif (A)
            </span>
            <div style={{ flex: 1, background: '#e5e7eb', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${getBarWidth(capitalNeedA.minCumulativeCash)}%`,
                  height: '100%',
                  background: capitalNeedA.minCumulativeCash < 0
                    ? 'linear-gradient(90deg, #22c55e 0%, #86efac 100%)'
                    : '#22c55e',
                  borderRadius: '4px',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span style={{ width: '80px', fontSize: '12px', fontWeight: '600', textAlign: 'right', color: capitalNeedA.minCumulativeCash < 0 ? '#dc2626' : '#166534' }}>
              {formatCompactUSD(capitalNeedA.minCumulativeCash)}
            </span>
          </div>

          {/* Scenario B Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '120px', fontSize: '12px', color: '#991b1b', fontWeight: '500' }}>
              Negatif (B)
            </span>
            <div style={{ flex: 1, background: '#e5e7eb', borderRadius: '4px', height: '24px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${getBarWidth(capitalNeedB.minCumulativeCash)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444 0%, #fca5a5 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span style={{ width: '80px', fontSize: '12px', fontWeight: '600', textAlign: 'right', color: '#dc2626' }}>
              {formatCompactUSD(capitalNeedB.minCumulativeCash)}
            </span>
          </div>
        </div>
      </div>

      {/* Runway Status Banner */}
      <div
        style={{
          padding: '20px',
          borderRadius: '12px',
          background: capitalNeedA.selfSustaining
            ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: `2px solid ${capitalNeedA.selfSustaining ? '#86efac' : '#fcd34d'}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{capitalNeedA.selfSustaining ? '🎯' : '⏳'}</span>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: capitalNeedA.selfSustaining ? '#166534' : '#92400e', margin: 0 }}>
                {capitalNeedA.selfSustaining ? 'Pozitif Senaryo: Self-Sustaining' : 'Pozitif Senaryo: Yatırım Gerekli'}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: capitalNeedA.selfSustaining ? '#166534' : '#92400e' }}>
              {capitalNeedA.selfSustaining
                ? 'Pozitif senaryo kendi kendini finanse edebiliyor. Yatırım büyüme hızlandırıcı olarak değerlendirilebilir.'
                : `Pozitif senaryoda bile ${formatCompactUSD(capitalNeedA.requiredInvestment)} yatırım gerekli.`
              }
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Runway (A)</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534' }}>
                {formatRunway(capitalNeedA.runwayMonths)}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px' }}>
              <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Runway (B)</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>
                {formatRunway(capitalNeedB.runwayMonths)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PdfCapitalAnalysisPage;
