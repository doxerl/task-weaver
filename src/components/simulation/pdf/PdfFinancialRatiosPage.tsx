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
import type { PdfFinancialRatiosPageProps } from './types';

/**
 * PDF Financial Ratios Page Component
 * Displays professional analysis metrics including liquidity, leverage, and profitability ratios
 */
export function PdfFinancialRatiosPage({
  financialRatios,
  sensitivityAnalysis,
}: PdfFinancialRatiosPageProps) {
  if (!financialRatios || !sensitivityAnalysis) {
    return null;
  }

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>
        Profesyonel Analiz Metrikleri
      </h2>

      {/* Financial Ratios Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {/* Liquidity */}
        <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1', marginBottom: '16px' }}>
            Likidite Oranları
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>Cari Oran</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {financialRatios.liquidity.currentRatio.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>Asit-Test Oranı</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {financialRatios.liquidity.quickRatio.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>Nakit Oranı</span>
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
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>İşletme Sermayesi</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {formatCompactUSD(financialRatios.liquidity.workingCapital)}
              </span>
            </div>
          </div>
        </div>

        {/* Leverage */}
        <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fcd34d' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', marginBottom: '16px' }}>
            Kaldıraç Oranları
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>Borç/Özkaynak</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {financialRatios.leverage.debtToEquity.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>Borç/Varlık</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{(financialRatios.leverage.debtToAssets * 100).toFixed(0)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>Alacak/Varlık</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{(financialRatios.leverage.receivablesRatio * 100).toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Profitability */}
        <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #86efac' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#166534', marginBottom: '16px' }}>
            Karlılık Oranları
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>ROA</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{financialRatios.profitability.returnOnAssets.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>ROE</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{financialRatios.profitability.returnOnEquity.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>Net Marj</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                %{financialRatios.profitability.netMargin.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis Table */}
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
        Gelir Duyarlılık Analizi
      </h3>
      <table style={TABLE_STYLE}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={TABLE_HEADER_CELL_STYLE}>Değişim</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>Gelir</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>Kâr</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>Marj</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>MOIC</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' }}>Runway</th>
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
                {row.runway < 999 ? `${row.runway} ay` : '∞'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PdfFinancialRatiosPage;
