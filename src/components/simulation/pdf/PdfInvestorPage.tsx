import React from 'react';
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
import type { PdfInvestorPageProps } from './types';

/**
 * Safe division utility
 */
function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  return denominator !== 0 ? numerator / denominator : defaultValue;
}

/**
 * PDF Investor Analysis Page Component
 * Displays deal analysis, investment metrics, and exit strategy
 */
export function PdfInvestorPage({
  unifiedAnalysis,
  dealConfig,
  pdfExitPlan,
}: PdfInvestorPageProps) {
  if (!unifiedAnalysis) {
    return null;
  }

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>Yatırımcı Analizi</h2>

      {/* Deal Analysis Score */}
      {unifiedAnalysis.deal_analysis && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            borderRadius: '16px',
            color: 'white',
          }}
        >
          <div>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>Anlaşma Skoru</p>
            <p style={{ fontSize: '48px', fontWeight: 'bold' }}>
              {unifiedAnalysis.deal_analysis.deal_score}/10
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>Değerleme Görüşü</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'capitalize' }}>
              {unifiedAnalysis.deal_analysis.valuation_verdict === 'premium'
                ? '💎 Premium'
                : unifiedAnalysis.deal_analysis.valuation_verdict === 'fair'
                ? '✅ Adil'
                : '💰 Ucuz'}
            </p>
          </div>
          <div style={{ textAlign: 'right', maxWidth: '400px' }}>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>Yatırımcı Çekiciliği</p>
            <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
              {unifiedAnalysis.deal_analysis.investor_attractiveness}
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: PDF_COLORS.gray[500],
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            Yatırım Miktarı
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
            ${dealConfig.investmentAmount.toLocaleString()}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: PDF_COLORS.gray[500],
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            Equity Oranı
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
            %{dealConfig.equityPercentage}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: PDF_COLORS.gray[500],
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            Pre-Money Valuation
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
            $
            {(
              safeDivide(dealConfig.investmentAmount, dealConfig.equityPercentage, 0) * 100 -
              dealConfig.investmentAmount
            ).toLocaleString()}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: PDF_COLORS.gray[500],
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            Sektör Çarpanı
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
            {dealConfig.sectorMultiple}x
          </p>
        </div>
      </div>

      {/* Risk Factors */}
      {unifiedAnalysis.deal_analysis?.risk_factors &&
        unifiedAnalysis.deal_analysis.risk_factors.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
              Risk Faktörleri
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {unifiedAnalysis.deal_analysis.risk_factors.slice(0, 6).map((risk, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    background: '#fef2f2',
                    borderRadius: '8px',
                    borderLeft: '3px solid #ef4444',
                    fontSize: '13px',
                    color: '#991b1b',
                  }}
                >
                  ⚠️ {risk}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Exit Strategy Preview */}
      {pdfExitPlan && (
        <div
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            borderRadius: '12px',
            border: '1px solid #86efac',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#166534' }}>
            Çıkış Stratejisi
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>3 Yıllık MOIC</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>
                {pdfExitPlan.moic3Year.toFixed(1)}x
              </p>
              <p style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
                {pdfExitPlan.yearLabels?.moic3Year}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>5 Yıllık MOIC</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>
                {pdfExitPlan.moic5Year.toFixed(1)}x
              </p>
              <p style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
                {pdfExitPlan.yearLabels?.moic5Year}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>5. Yıl Değerleme</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>
                {formatCompactUSD(pdfExitPlan.year5Projection?.companyValuation || 0)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>Yatırımcı Payı</p>
              <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>
                {formatCompactUSD(pdfExitPlan.investorShare5Year)}
              </p>
            </div>
          </div>

          {/* 5-Year Projection Table */}
          {pdfExitPlan.allYears && pdfExitPlan.allYears.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                5 Yıllık Finansal Projeksiyon
              </h4>
              <table style={{ ...TABLE_STYLE, fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ ...TABLE_HEADER_CELL_STYLE, color: '#374151' }}>Yıl</th>
                    <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>
                      Gelir
                    </th>
                    <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>
                      Gider
                    </th>
                    <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>
                      Net Kâr
                    </th>
                    <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>
                      Şirket Değeri
                    </th>
                    <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>
                      MOIC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pdfExitPlan.allYears.slice(0, 5).map((year) => (
                    <tr key={year.year}>
                      <td style={{ ...TABLE_CELL_STYLE, fontWeight: '500', color: '#374151' }}>
                        {year.year}
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
                      <td style={{ ...TABLE_CELL_RIGHT_STYLE, color: '#374151' }}>
                        {formatCompactUSD(year.companyValuation)}
                      </td>
                      <td
                        style={{
                          ...TABLE_CELL_RIGHT_STYLE,
                          fontWeight: '600',
                          color: '#166534',
                        }}
                      >
                        {safeDivide(
                          year.companyValuation * (dealConfig.equityPercentage / 100),
                          dealConfig.investmentAmount,
                          0
                        ).toFixed(1)}
                        x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Growth Model */}
          {pdfExitPlan.growthConfig && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
              <div style={{ padding: '12px 16px', background: '#fef3c7', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                  Yıl 1-2 (Agresif Aşama)
                </p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#d97706' }}>
                  %{(pdfExitPlan.growthConfig.aggressiveGrowthRate * 100).toFixed(0)}
                </p>
              </div>
              <div style={{ padding: '12px 16px', background: '#dcfce7', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>
                  Yıl 3-5 (Normalize Aşama)
                </p>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                  %{(pdfExitPlan.growthConfig.normalizedGrowthRate * 100).toFixed(0)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PdfInvestorPage;
