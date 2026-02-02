import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import type { PdfAIInsightsPageProps } from './types';

/**
 * PDF AI Insights Page Component
 * Displays AI-generated insights and recommendations
 */
export function PdfAIInsightsPage({
  unifiedAnalysis,
}: PdfAIInsightsPageProps) {
  const { t } = useTranslation(['simulation']);

  if (!unifiedAnalysis?.insights || unifiedAnalysis.insights.length === 0) {
    return null;
  }

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'high':
        return { border: '#ef4444', background: '#fef2f2' };
      case 'medium':
        return { border: '#f59e0b', background: '#fffbeb' };
      default:
        return { border: '#22c55e', background: '#f0fdf4' };
    }
  };

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>{t('pdf.aiInsights.title')}</h2>

      {/* Insights Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {unifiedAnalysis.insights.slice(0, 6).map((insight, i) => {
          const colors = getSeverityColors(insight.severity);
          return (
            <div
              key={i}
              style={{
                padding: '20px',
                borderRadius: '12px',
                borderLeft: `5px solid ${colors.border}`,
                background: colors.background,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <h4
                style={{
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111827',
                  fontSize: '15px',
                }}
              >
                {insight.title}
              </h4>
              <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                {insight.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {unifiedAnalysis.recommendations && unifiedAnalysis.recommendations.length > 0 && (
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            {t('pdf.aiInsights.strategicRecommendations')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {unifiedAnalysis.recommendations.slice(0, 4).map((rec, i) => (
              <div
                key={i}
                style={{
                  padding: '16px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                      color: 'white',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  >
                    {rec.priority || i + 1}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: PDF_COLORS.primary }}>
                    {rec.title}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500], lineHeight: '1.5' }}>
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfAIInsightsPage;
