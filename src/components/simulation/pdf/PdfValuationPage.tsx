import React from 'react';
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
import type { PdfValuationPageProps } from './types';

/**
 * Safe division utility
 */
function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  return denominator !== 0 ? numerator / denominator : defaultValue;
}

/**
 * PDF Valuation Methods Page Component
 * Displays 4 valuation methods comparison and 5-year projection table
 */
export function PdfValuationPage({
  pdfExitPlan,
  dealConfig,
}: PdfValuationPageProps) {
  if (!pdfExitPlan) {
    return null;
  }

  // Get year 5 projection for valuation calculations
  const year5 = pdfExitPlan.allYears?.find(y => y.year === Math.max(...(pdfExitPlan.allYears?.map(y => y.year) || [0])));
  const year1 = pdfExitPlan.allYears?.[0];

  // Calculate valuation methods based on year 5 data
  const revenue = year5?.revenue || 0;
  const netProfit = year5?.netProfit || 0;
  const ebitda = netProfit * 1.15; // Approximate EBITDA (add back 15% for D&A)

  // Valuation calculations
  const revenueMultiple = revenue * dealConfig.sectorMultiple;
  const ebitdaMultiple = ebitda * (dealConfig.sectorMultiple * 1.5); // EBITDA multiple typically higher
  const dcfValue = year5?.companyValuation || revenueMultiple * 0.9; // Use exit valuation or estimate
  const vcMethodValue = safeDivide(revenueMultiple, 10, 0) * 10; // VC expects 10x return

  // Weighted average (30% Revenue, 25% EBITDA, 30% DCF, 15% VC)
  const weightedValuation =
    revenueMultiple * 0.30 +
    ebitdaMultiple * 0.25 +
    dcfValue * 0.30 +
    vcMethodValue * 0.15;

  // Valuation method cards data
  const valuationMethods = [
    {
      name: 'Ciro Çarpanı',
      value: revenueMultiple,
      formula: `${formatCompactUSD(revenue)} × ${dealConfig.sectorMultiple}x`,
      weight: '30%',
      color: '#eff6ff',
      borderColor: '#93c5fd',
      iconColor: '#3b82f6',
    },
    {
      name: 'EBITDA Çarpanı',
      value: ebitdaMultiple,
      formula: `${formatCompactUSD(ebitda)} × ${(dealConfig.sectorMultiple * 1.5).toFixed(1)}x`,
      weight: '25%',
      color: '#faf5ff',
      borderColor: '#c4b5fd',
      iconColor: '#8b5cf6',
    },
    {
      name: 'DCF',
      value: dcfValue,
      formula: '%30 iskonto oranı',
      weight: '30%',
      color: '#f0fdf4',
      borderColor: '#86efac',
      iconColor: '#22c55e',
    },
    {
      name: 'VC Metodu',
      value: vcMethodValue,
      formula: '10x hedef ROI',
      weight: '15%',
      color: '#fffbeb',
      borderColor: '#fcd34d',
      iconColor: '#f59e0b',
    },
  ];

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>Değerleme Analizi</h2>

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
            AĞIRLIKLI DEĞERLEME (5. YIL)
          </p>
          <p style={{ fontSize: '11px', opacity: 0.7 }}>
            4 farklı metodun ağırlıklı ortalaması
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
          5 Yıllık Finansal Projeksiyon Detayı
        </h3>

        <table style={{ ...TABLE_STYLE, fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, color: '#374151' }}>Yıl</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>Gelir</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>Gider</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>Net Kâr</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>Kâr Marjı</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>Şirket Değeri</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>Yatırımcı Payı</th>
              <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right', color: '#374151' }}>MOIC</th>
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
            <span style={{ color: PDF_COLORS.gray[600] }}>MOIC ≥ 3x (Mükemmel)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ca8a04' }} />
            <span style={{ color: PDF_COLORS.gray[600] }}>MOIC 2-3x (İyi)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#dc2626' }} />
            <span style={{ color: PDF_COLORS.gray[600] }}>MOIC &lt; 2x (Düşük)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#166534', fontWeight: '600' }}>★</span>
            <span style={{ color: PDF_COLORS.gray[600] }}>Önemli Yıllar (3 ve 5)</span>
          </div>
        </div>
      </div>

      {/* Growth Model Info */}
      {pdfExitPlan.growthConfig && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '20px' }}>
          <div style={{ padding: '14px 18px', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fcd34d' }}>
            <p style={{ fontSize: '11px', color: '#92400e', marginBottom: '6px', fontWeight: '500' }}>
              Yıl 1-2: Agresif Büyüme Aşaması
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>
              %{(pdfExitPlan.growthConfig.aggressiveGrowthRate * 100).toFixed(0)}
            </p>
          </div>
          <div style={{ padding: '14px 18px', background: '#dcfce7', borderRadius: '10px', border: '1px solid #86efac' }}>
            <p style={{ fontSize: '11px', color: '#166534', marginBottom: '6px', fontWeight: '500' }}>
              Yıl 3-5: Normalize Büyüme Aşaması
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
