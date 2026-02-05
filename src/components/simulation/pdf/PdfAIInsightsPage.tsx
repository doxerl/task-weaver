import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import type { PdfAIInsightsPageProps } from './types';

interface CalculatedInsight {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low' | 'critical';
  source: string;
}

/**
 * PDF AI Insights Page Component
 * Displays calculated insights first, then filtered AI insights
 * Evidence-based approach to prevent hallucinations
 */
export function PdfAIInsightsPage({
  unifiedAnalysis,
  summaryA,
  summaryB,
  capitalNeedA,
  capitalNeedB,
  scenarioComparison,
  dealConfig,
}: PdfAIInsightsPageProps) {
  const { t } = useTranslation(['simulation']);

  // Generate insights from CALCULATED data (not AI)
  const calculatedInsights = useMemo<CalculatedInsight[]>(() => {
    const insights: CalculatedInsight[] = [];

    // 1. Revenue Gap Analysis
    if (summaryA && summaryB) {
      const revenueGap = summaryA.totalRevenue - summaryB.totalRevenue;
      if (Math.abs(revenueGap) > 0) {
        insights.push({
          title: 'Gelir Farkı Analizi',
          description: `Yatırım senaryosu ile ${Math.abs(revenueGap).toLocaleString('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} ${revenueGap >= 0 ? 'daha fazla' : 'daha az'} gelir öngörülüyor.`,
          severity: Math.abs(revenueGap) > 100000 ? 'high' : 'medium',
          source: `Hesaplama: summaryA.totalRevenue - summaryB.totalRevenue`,
        });
      }
    }

    // 2. Runway Comparison
    if (capitalNeedA && capitalNeedB) {
      const runwayDiff = capitalNeedA.runwayMonths - capitalNeedB.runwayMonths;
      insights.push({
        title: 'Runway Karşılaştırması',
        description: `Pozitif senaryo: ${capitalNeedA.runwayMonths} ay, Negatif senaryo: ${capitalNeedB.runwayMonths} ay runway. ${runwayDiff > 0 ? `${runwayDiff} ay daha uzun sürdürülebilirlik.` : ''}`,
        severity: capitalNeedB.runwayMonths < 12 ? 'critical' : capitalNeedB.runwayMonths < 18 ? 'high' : 'medium',
        source: `Hesaplama: capitalNeed.runwayMonths`,
      });

      // Death Valley Alert - use minCumulativeCash and criticalQuarter
      if (capitalNeedB.minCumulativeCash < 0) {
        insights.push({
          title: 'Death Valley Uyarısı',
          description: `Organik senaryoda ${capitalNeedB.criticalQuarter}'de ${Math.abs(capitalNeedB.minCumulativeCash).toLocaleString('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} nakit açığı oluşacak. Minimum ${capitalNeedB.requiredInvestment.toLocaleString('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} yatırım gerekli.`,
          severity: 'critical',
          source: `Hesaplama: capitalNeed.minCumulativeCash, capitalNeed.requiredInvestment`,
        });
      }
    }

    // 3. Profit Margin Comparison
    if (summaryA && summaryB) {
      const marginA = summaryA.profitMargin * 100;
      const marginB = summaryB.profitMargin * 100;
      insights.push({
        title: 'Kâr Marjı Farkı',
        description: `Pozitif senaryo: %${marginA.toFixed(1)}, Negatif senaryo: %${marginB.toFixed(1)} kâr marjı. ${marginA > marginB ? `Yatırım ile %${(marginA - marginB).toFixed(1)} puan iyileşme.` : ''}`,
        severity: marginA > marginB ? 'high' : 'medium',
        source: `Hesaplama: summary.netProfit / summary.totalRevenue`,
      });
    }

    // 4. Investment Impact (Growth Multiplier from scenario comparison)
    if (scenarioComparison && dealConfig) {
      // Calculate growth multiplier from withInvestment vs withoutInvestment
      const withRevenue = scenarioComparison.withInvestment.totalRevenue;
      const withoutRevenue = scenarioComparison.withoutInvestment.totalRevenue;
      const multiplier = withoutRevenue > 0 ? withRevenue / withoutRevenue : 0;
      
      insights.push({
        title: 'Yatırım Getiri Etkisi',
        description: `${dealConfig.investmentAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} yatırım ile ${multiplier.toFixed(2)}x gelir çarpanı elde ediliyor.`,
        severity: multiplier > 2 ? 'high' : multiplier > 1.5 ? 'medium' : 'low',
        source: `Hesaplama: withInvestment.totalRevenue / withoutInvestment.totalRevenue`,
      });

      // Opportunity Cost from opportunityCost object
      if (scenarioComparison.opportunityCost) {
        const revenueLoss = scenarioComparison.opportunityCost.revenueLoss;
        if (revenueLoss > 0) {
          insights.push({
            title: 'Fırsat Maliyeti',
            description: `Yatırım alınmazsa ${revenueLoss.toLocaleString('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} potansiyel gelir kaybedilecek. Risk seviyesi: ${scenarioComparison.opportunityCost.riskLevel}.`,
            severity: scenarioComparison.opportunityCost.riskLevel === 'critical' ? 'critical' : scenarioComparison.opportunityCost.riskLevel === 'high' ? 'high' : 'medium',
            source: `Hesaplama: scenarioComparison.opportunityCost.revenueLoss`,
          });
        }
      }
    }

    return insights;
  }, [summaryA, summaryB, capitalNeedA, capitalNeedB, scenarioComparison, dealConfig]);

  // Filter AI insights - only show high confidence (>=75%)
  const filteredAIInsights = useMemo(() => {
    if (!unifiedAnalysis?.insights) return [];
    
    return unifiedAnalysis.insights.filter(insight => {
      const confidence = (insight as { confidence_score?: number }).confidence_score ?? 50;
      return confidence >= 75;
    });
  }, [unifiedAnalysis?.insights]);

  // Filter AI recommendations - only show high priority
  const filteredRecommendations = useMemo(() => {
    if (!unifiedAnalysis?.recommendations) return [];
    
    return unifiedAnalysis.recommendations.filter(rec => {
      const priority = rec.priority ?? 3;
      return priority <= 2; // Only priority 1 and 2
    });
  }, [unifiedAnalysis?.recommendations]);

  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { border: '#dc2626', background: '#fef2f2' };
      case 'high':
        return { border: '#ef4444', background: '#fef2f2' };
      case 'medium':
        return { border: '#f59e0b', background: '#fffbeb' };
      default:
        return { border: '#22c55e', background: '#f0fdf4' };
    }
  };

  // If no insights at all, return null
  if (calculatedInsights.length === 0 && filteredAIInsights.length === 0) {
    return null;
  }

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>{t('pdf.aiInsights.title')}</h2>

      {/* SECTION 1: Calculated Insights (Evidence-Based) */}
      {calculatedInsights.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1e40af' }}>
            📊 Hesaplanmış Metrikler
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {calculatedInsights.slice(0, 6).map((insight, i) => {
              const colors = getSeverityColors(insight.severity);
              return (
                <div
                  key={`calc-${i}`}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `5px solid ${colors.border}`,
                    background: colors.background,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <h4
                    style={{
                      fontWeight: '600',
                      marginBottom: '6px',
                      color: '#111827',
                      fontSize: '14px',
                    }}
                  >
                    {insight.title}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.5', marginBottom: '6px' }}>
                    {insight.description}
                  </p>
                  <p style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>
                    {insight.source}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SECTION 2: AI Insights (Filtered - High Confidence Only) */}
      {filteredAIInsights.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#7c3aed' }}>
            🤖 AI Önerileri (Yüksek Güven)
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {filteredAIInsights.slice(0, 4).map((insight, i) => {
              const colors = getSeverityColors(insight.severity);
              return (
                <div
                  key={`ai-${i}`}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `5px solid ${colors.border}`,
                    background: colors.background,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  <h4
                    style={{
                      fontWeight: '600',
                      marginBottom: '6px',
                      color: '#111827',
                      fontSize: '14px',
                    }}
                  >
                    {insight.title}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#4b5563', lineHeight: '1.5' }}>
                    {insight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SECTION 3: Strategic Recommendations (Filtered) */}
      {filteredRecommendations.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
            {t('pdf.aiInsights.strategicRecommendations')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {filteredRecommendations.slice(0, 4).map((rec, i) => (
              <div
                key={`rec-${i}`}
                style={{
                  padding: '14px',
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
                      color: 'white',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    {rec.priority || i + 1}
                  </span>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: PDF_COLORS.primary }}>
                    {rec.title}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: PDF_COLORS.gray[500], lineHeight: '1.5' }}>
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
