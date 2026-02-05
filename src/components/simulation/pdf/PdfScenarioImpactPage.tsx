import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
  GRID_2_COLS_STYLE,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfScenarioImpactPageProps } from './types';

/**
 * PDF Scenario Impact Page Component
 * Displays With vs Without Investment comparison and Opportunity Cost analysis
 */
export function PdfScenarioImpactPage({
  scenarioComparison,
  scenarioAName,
  scenarioBName,
  scenarioYear,
}: PdfScenarioImpactPageProps) {
  const { t } = useTranslation(['simulation']);

  // Guard clause
  if (!scenarioComparison) {
    return null;
  }

  const { withInvestment, withoutInvestment, opportunityCost, futureImpact } = scenarioComparison;

  // Risk level styles
  const getRiskLevelStyle = (level: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      critical: { bg: '#dc2626', text: 'white', label: t('pdf.scenarioImpact.riskLevels.critical') },
      high: { bg: '#f97316', text: 'white', label: t('pdf.scenarioImpact.riskLevels.high') },
      medium: { bg: '#eab308', text: '#1f2937', label: t('pdf.scenarioImpact.riskLevels.medium') },
      low: { bg: '#22c55e', text: 'white', label: t('pdf.scenarioImpact.riskLevels.low') },
    };
    return styles[level] || styles.medium;
  };

  const riskStyle = getRiskLevelStyle(opportunityCost.riskLevel);

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>{t('pdf.scenarioImpact.title')}</h2>

      {/* Two-Column Scenario Comparison */}
      <div style={{ ...GRID_2_COLS_STYLE, marginBottom: '24px' }}>
        {/* With Investment Card (Positive) */}
        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '2px solid #86efac',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#166534', margin: 0 }}>
                {t('pdf.scenarioImpact.withInvestment')}
              </h3>
              <p style={{ fontSize: '11px', color: '#16a34a', margin: 0 }}>{scenarioAName}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>{t('pdf.scenarioImpact.totalRevenue')}</p>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#166534' }}>
                {formatCompactUSD(withInvestment.totalRevenue)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>{t('pdf.scenarioImpact.netProfit')}</p>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: withInvestment.netProfit >= 0 ? '#166534' : '#dc2626' }}>
                {formatCompactUSD(withInvestment.netProfit)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>{t('pdf.scenarioImpact.profitMargin')}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
                %{withInvestment.profitMargin.toFixed(1)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>{t('pdf.scenarioImpact.growthRate')}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
                %{withInvestment.growthRate.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Exit Metrics */}
          <div
            style={{
              marginTop: '16px',
              padding: '14px',
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '10px', color: '#166534', marginBottom: '2px' }}>{t('pdf.scenarioImpact.valuation5Y')}</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
                  {formatCompactUSD(withInvestment.exitValuation)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: '#166534', marginBottom: '2px' }}>{t('pdf.scenarioImpact.moic5Y')}</p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>
                  {withInvestment.moic5Year.toFixed(1)}x
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Without Investment Card (Negative) */}
        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '2px solid #fca5a5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '28px' }}>❌</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#991b1b', margin: 0 }}>
                {t('pdf.scenarioImpact.withoutInvestment')}
              </h3>
              <p style={{ fontSize: '11px', color: '#dc2626', margin: 0 }}>{scenarioBName}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>{t('pdf.scenarioImpact.totalRevenue')}</p>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#991b1b' }}>
                {formatCompactUSD(withoutInvestment.totalRevenue)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>{t('pdf.scenarioImpact.netProfit')}</p>
              <p style={{ fontSize: '22px', fontWeight: 'bold', color: withoutInvestment.netProfit >= 0 ? '#166534' : '#dc2626' }}>
                {formatCompactUSD(withoutInvestment.netProfit)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>{t('pdf.scenarioImpact.profitMargin')}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#991b1b' }}>
                %{withoutInvestment.profitMargin.toFixed(1)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>{t('pdf.scenarioImpact.organicGrowth')}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#991b1b' }}>
                %{withoutInvestment.organicGrowthRate.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Warning Note */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(220, 38, 38, 0.1)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#991b1b',
            }}
          >
            ⚠️ {t('pdf.scenarioImpact.organicGrowthWarning')}
          </div>
        </div>
      </div>

      {/* Opportunity Cost Alert Banner */}
      <div
        style={{
          padding: '24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '2px solid #fcd34d',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#92400e', margin: 0 }}>
              {t('pdf.scenarioImpact.opportunityCostTitle')}
            </h3>
          </div>
          <div
            style={{
              padding: '6px 14px',
              background: riskStyle.bg,
              color: riskStyle.text,
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {riskStyle.label} {t('pdf.scenarioImpact.risk')}
          </div>
        </div>

        {/* 4 Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div
            style={{
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
              {t('pdf.scenarioImpact.revenueLoss')}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626' }}>
              {formatCompactUSD(opportunityCost.revenueLoss)}
            </p>
            <p style={{ fontSize: '10px', color: '#dc2626' }}>↓ {t('pdf.scenarioImpact.year', { year: scenarioYear })}</p>
          </div>

          <div
            style={{
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
              {t('pdf.scenarioImpact.profitLoss')}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626' }}>
              {formatCompactUSD(opportunityCost.profitLoss)}
            </p>
            <p style={{ fontSize: '10px', color: '#dc2626' }}>↓ {t('pdf.scenarioImpact.netDifference')}</p>
          </div>

          <div
            style={{
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
              {t('pdf.scenarioImpact.growthDifference')}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626' }}>
              %{opportunityCost.growthRateDiff.toFixed(0)}
            </p>
            <p style={{ fontSize: '10px', color: '#dc2626' }}>↓ {t('pdf.scenarioImpact.potentialLoss')}</p>
          </div>

          <div
            style={{
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
              {t('pdf.scenarioImpact.valuationLoss5Y')}
            </p>
            <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#dc2626' }}>
              {formatCompactUSD(opportunityCost.valuationLoss)}
            </p>
            <p style={{ fontSize: '10px', color: '#dc2626' }}>↓ {t('pdf.scenarioImpact.projection', { year: scenarioYear + 5 })}</p>
          </div>
        </div>

        {/* Summary Text */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#92400e',
            lineHeight: '1.5',
          }}
          dangerouslySetInnerHTML={{
            __html: t('pdf.scenarioImpact.summaryText', {
              percent: opportunityCost.percentageLoss.toFixed(0),
              amount: formatCompactUSD(opportunityCost.valuationLoss),
            }),
          }}
        />
      </div>

      {/* Future Impact - Year Comparison Cards */}
      {futureImpact && (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            {t('pdf.scenarioImpact.futureProjectionTitle')}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {/* Year 1 */}
            <div
              style={{
                padding: '18px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500], marginBottom: '12px', fontWeight: '600' }}>
                {t('pdf.scenarioImpact.yearLabel', { num: 1 })} ({scenarioYear + 1})
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#16a34a' }}>✅ {t('pdf.scenarioImpact.withInvestmentShort')}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                    {formatCompactUSD(futureImpact.year1WithInvestment)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#dc2626' }}>❌ {t('pdf.scenarioImpact.withoutInvestmentShort')}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                    {formatCompactUSD(futureImpact.year1WithoutInvestment)}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    background: '#f0fdf4',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#166534' }}>{t('pdf.scenarioImpact.difference')}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>
                    +{formatCompactUSD(futureImpact.year1WithInvestment - futureImpact.year1WithoutInvestment)}
                  </span>
                </div>
              </div>
            </div>

            {/* Year 3 */}
            <div
              style={{
                padding: '18px',
                borderRadius: '12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500], marginBottom: '12px', fontWeight: '600' }}>
                {t('pdf.scenarioImpact.yearLabel', { num: 3 })} ({scenarioYear + 3})
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#16a34a' }}>✅ {t('pdf.scenarioImpact.withInvestmentShort')}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>
                    {formatCompactUSD(futureImpact.year3WithInvestment)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#dc2626' }}>❌ {t('pdf.scenarioImpact.withoutInvestmentShort')}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                    {formatCompactUSD(futureImpact.year3WithoutInvestment)}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    background: '#f0fdf4',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '10px', color: '#166534' }}>{t('pdf.scenarioImpact.difference')}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>
                    +{formatCompactUSD(futureImpact.year3WithInvestment - futureImpact.year3WithoutInvestment)}
                  </span>
                </div>
              </div>
            </div>

            {/* Year 5 */}
            <div
              style={{
                padding: '18px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '2px solid #93c5fd',
              }}
            >
              <p style={{ fontSize: '12px', color: PDF_COLORS.primary, marginBottom: '12px', fontWeight: '600' }}>
                {t('pdf.scenarioImpact.yearLabel', { num: 5 })} ({scenarioYear + 5}) ★
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#16a34a' }}>✅ {t('pdf.scenarioImpact.withInvestmentShort')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>
                    {formatCompactUSD(futureImpact.year5WithInvestment)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#dc2626' }}>❌ {t('pdf.scenarioImpact.withoutInvestmentShort')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>
                    {formatCompactUSD(futureImpact.year5WithoutInvestment)}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: '#dcfce7',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#166534', fontWeight: '500' }}>{t('pdf.scenarioImpact.totalDifference')}</span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#166534' }}>
                    +{formatCompactUSD(futureImpact.cumulativeDifference)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfScenarioImpactPage;
