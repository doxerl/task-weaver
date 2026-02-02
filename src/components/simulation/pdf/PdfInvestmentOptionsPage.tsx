import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfInvestmentOptionsPageProps } from './types';

/**
 * PDF Investment Options Page Component
 * Displays 3 investment tier options and AI optimal timing recommendation
 */
export function PdfInvestmentOptionsPage({
  investmentTiers,
  optimalTiming,
  targetYear,
}: PdfInvestmentOptionsPageProps) {
  const { t } = useTranslation(['simulation']);

  // Guard clause
  if (!investmentTiers || investmentTiers.length === 0) {
    return null;
  }

  // Tier card styles
  const getTierCardStyle = (tier: 'minimum' | 'recommended' | 'aggressive') => {
    const styles = {
      minimum: {
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
        border: '2px solid #f59e0b',
        labelColor: '#92400e',
        valueColor: '#d97706',
      },
      recommended: {
        background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
        border: '3px solid #10b981',
        labelColor: '#065f46',
        valueColor: '#059669',
        ring: true,
      },
      aggressive: {
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
        border: '2px solid #3b82f6',
        labelColor: '#1e40af',
        valueColor: '#2563eb',
      },
    };
    return styles[tier];
  };

  // Urgency level styles
  const getUrgencyStyle = (level: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      critical: { bg: '#fef2f2', text: '#dc2626', icon: '🔴' },
      high: { bg: '#fef2f2', text: '#dc2626', icon: '🟠' },
      medium: { bg: '#fef3c7', text: '#d97706', icon: '🟡' },
      low: { bg: '#f0fdf4', text: '#16a34a', icon: '🟢' },
    };
    return styles[level] || styles.medium;
  };

  // Format runway months
  const formatRunway = (months: number) => {
    if (months >= 999) return '∞';
    return t('pdf.investmentOptions.monthsRunway', { count: months });
  };

  // Get max quarterly need for bar visualization
  const maxQuarterlyNeed = optimalTiming
    ? Math.max(...optimalTiming.quarterlyNeeds, 1)
    : 1;

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>{t('pdf.investmentOptions.title')}</h2>

      {/* 3 Investment Tier Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
        {investmentTiers.map((tier) => {
          const style = getTierCardStyle(tier.tier);
          const isRecommended = tier.tier === 'recommended';

          return (
            <div
              key={tier.tier}
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: style.background,
                border: style.border,
                position: 'relative',
                boxShadow: isRecommended ? '0 8px 24px rgba(16, 185, 129, 0.25)' : '0 4px 12px rgba(0,0,0,0.08)',
              }}
            >
              {/* Recommended Badge */}
              {isRecommended && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#10b981',
                    color: 'white',
                    padding: '4px 16px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  ✓ {t('pdf.investmentOptions.recommended')}
                </div>
              )}

              {/* Tier Label */}
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: style.labelColor,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {tier.label}
              </p>

              {/* Amount */}
              <p
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: style.valueColor,
                  marginBottom: '12px',
                }}
              >
                {formatCompactUSD(tier.amount)}
              </p>

              {/* Runway */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontSize: '16px' }}>⏱️</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: style.labelColor }}>
                  {formatRunway(tier.runwayMonths)} {t('pdf.investmentOptions.runway')}
                </span>
              </div>

              {/* Description */}
              <p style={{ fontSize: '12px', color: style.labelColor, lineHeight: '1.4' }}>
                {tier.description}
              </p>

              {/* Safety Margin */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.5)',
                  borderRadius: '6px',
                  fontSize: '10px',
                  color: style.labelColor,
                }}
              >
                {t('pdf.investmentOptions.safetyMargin')}: %{(tier.safetyMargin * 100).toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Optimal Investment Timing Card */}
      {optimalTiming && (
        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
            border: '2px solid #a78bfa',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '28px' }}>🎯</span>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#5b21b6', margin: 0 }}>
              {t('pdf.investmentOptions.aiOptimalTiming')}
            </h3>
          </div>

          {/* Timing Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
            {/* Recommended Quarter */}
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
                {t('pdf.investmentOptions.recommendedPeriod')}
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#5b21b6' }}>
                {optimalTiming.recommendedQuarter}
              </p>
              <p style={{ fontSize: '10px', color: '#6b7280' }}>
                {optimalTiming.recommendedTiming}
              </p>
            </div>

            {/* Urgency Level */}
            <div
              style={{
                padding: '16px',
                background: getUrgencyStyle(optimalTiming.urgencyLevel).bg,
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                {t('pdf.investmentOptions.urgencyLevel')}
              </p>
              <p style={{ fontSize: '28px', marginBottom: '4px' }}>
                {getUrgencyStyle(optimalTiming.urgencyLevel).icon}
              </p>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: getUrgencyStyle(optimalTiming.urgencyLevel).text,
                  textTransform: 'uppercase',
                }}
              >
                {optimalTiming.urgencyLevel === 'critical' ? t('pdf.investmentOptions.urgencyCritical') :
                  optimalTiming.urgencyLevel === 'high' ? t('pdf.investmentOptions.urgencyHigh') :
                    optimalTiming.urgencyLevel === 'medium' ? t('pdf.investmentOptions.urgencyMedium') : t('pdf.investmentOptions.urgencyLow')}
              </p>
            </div>

            {/* Required Capital */}
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
                {t('pdf.investmentOptions.requiredCapital')}
              </p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
                {formatCompactUSD(optimalTiming.requiredInvestment)}
              </p>
              <p style={{ fontSize: '10px', color: '#6b7280' }}>
                {t('pdf.investmentOptions.forYear', { year: targetYear })}
              </p>
            </div>
          </div>

          {/* Reason and Risk */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ padding: '14px', background: 'rgba(255,255,255,0.6)', borderRadius: '10px' }}>
              <p style={{ fontSize: '11px', color: '#5b21b6', fontWeight: '600', marginBottom: '6px' }}>
                💡 {t('pdf.investmentOptions.whyThisPeriod')}
              </p>
              <p style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>
                {optimalTiming.reason}
              </p>
            </div>
            <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px' }}>
              <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600', marginBottom: '6px' }}>
                ⚠️ {t('pdf.investmentOptions.delayRisk')}
              </p>
              <p style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>
                {optimalTiming.riskIfDelayed}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quarterly Capital Needs Visualization */}
      {optimalTiming && optimalTiming.quarterlyNeeds && optimalTiming.quarterlyNeeds.length > 0 && (
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            {t('pdf.investmentOptions.quarterlyCapitalNeed')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {optimalTiming.quarterlyNeeds.map((need, index) => {
              const quarter = `Q${index + 1}`;
              const isMaxNeed = need === maxQuarterlyNeed;
              const barWidth = Math.max((need / maxQuarterlyNeed) * 100, 5);

              return (
                <div key={quarter} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      width: '40px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isMaxNeed ? '#dc2626' : PDF_COLORS.gray[600],
                    }}
                  >
                    {quarter}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      background: '#e5e7eb',
                      borderRadius: '6px',
                      height: '28px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: isMaxNeed
                          ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                          : 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '8px',
                      }}
                    >
                      {barWidth > 30 && (
                        <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>
                          {formatCompactUSD(need)}
                        </span>
                      )}
                    </div>
                  </div>
                  {barWidth <= 30 && (
                    <span
                      style={{
                        width: '70px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: isMaxNeed ? '#dc2626' : PDF_COLORS.gray[700],
                        textAlign: 'right',
                      }}
                    >
                      {formatCompactUSD(need)}
                    </span>
                  )}
                  {isMaxNeed && (
                    <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '500' }}>
                      ← {t('pdf.investmentOptions.deathValley')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfInvestmentOptionsPage;
