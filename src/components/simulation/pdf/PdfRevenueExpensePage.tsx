import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  TABLE_STYLE,
  TABLE_HEADER_CELL_STYLE,
  TABLE_CELL_STYLE,
  TABLE_CELL_RIGHT_STYLE,
  PDF_COLORS,
  getComparisonColor,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfRevenueExpensePageProps } from './types';

/**
 * PDF Revenue/Expense Comparison Page Component
 * Displays detailed revenue and expense items comparison between scenarios
 */
export function PdfRevenueExpensePage({
  scenarioA,
  scenarioB,
  summaryA,
  summaryB,
  quarterlyItemized,
}: PdfRevenueExpensePageProps) {
  const { t } = useTranslation(['simulation']);

  if (!quarterlyItemized || !scenarioA || !scenarioB) {
    return null;
  }

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>
        {t('pdf.revenueExpense.title')}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Revenue Items Table */}
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                background: '#16a34a',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              {t('pdf.revenueExpense.revenue')}
            </span>
            {t('pdf.revenueExpense.top5Revenue')}
          </h3>
          <table style={{ ...TABLE_STYLE, fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                <th style={{ ...TABLE_HEADER_CELL_STYLE, borderBottom: '2px solid #86efac' }}>{t('pdf.revenueExpense.item')}</th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {scenarioA?.name || t('pdf.revenueExpense.scenarioA')}
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {scenarioB?.name || t('pdf.revenueExpense.scenarioB')}
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {t('pdf.revenueExpense.difference')}
                </th>
              </tr>
            </thead>
            <tbody>
              {quarterlyItemized.scenarioA.revenues.slice(0, 5).map((r, i) => {
                const bItem = quarterlyItemized.scenarioB.revenues.find((br) => br.category === r.category);
                const diff = bItem ? ((bItem.total - r.total) / Math.max(r.total, 1)) * 100 : 0;
                return (
                  <tr key={i}>
                    <td style={{ ...TABLE_CELL_STYLE, fontWeight: '500' }}>{r.category}</td>
                    <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(r.total)}</td>
                    <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(bItem?.total || 0)}</td>
                    <td
                      style={{
                        ...TABLE_CELL_RIGHT_STYLE,
                        color: getComparisonColor(diff >= 0),
                        fontWeight: '500',
                      }}
                    >
                      {diff >= 0 ? '+' : ''}{diff.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Revenue Summary */}
          <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ fontWeight: '600', color: '#166534' }}>{t('pdf.revenueExpense.totalRevenue')}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: PDF_COLORS.primaryLight }}>
                  {formatCompactUSD(summaryA?.totalRevenue || 0)}
                </span>
                <span style={{ margin: '0 8px', color: PDF_COLORS.gray[400] }}>→</span>
                <span style={{ color: PDF_COLORS.success }}>
                  {formatCompactUSD(summaryB?.totalRevenue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Items Table */}
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                background: '#dc2626',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              {t('pdf.revenueExpense.expense')}
            </span>
            {t('pdf.revenueExpense.top5Expense')}
          </h3>
          <table style={{ ...TABLE_STYLE, fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#fef2f2' }}>
                <th style={{ ...TABLE_HEADER_CELL_STYLE, borderBottom: '2px solid #fecaca' }}>{t('pdf.revenueExpense.item')}</th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  {scenarioA?.name || t('pdf.revenueExpense.scenarioA')}
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  {scenarioB?.name || t('pdf.revenueExpense.scenarioB')}
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  {t('pdf.revenueExpense.difference')}
                </th>
              </tr>
            </thead>
            <tbody>
              {quarterlyItemized.scenarioA.expenses.slice(0, 5).map((e, i) => {
                const bItem = quarterlyItemized.scenarioB.expenses.find((be) => be.category === e.category);
                const diff = bItem ? ((bItem.total - e.total) / Math.max(e.total, 1)) * 100 : 0;
                return (
                  <tr key={i}>
                    <td style={{ ...TABLE_CELL_STYLE, fontWeight: '500' }}>{e.category}</td>
                    <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(e.total)}</td>
                    <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(bItem?.total || 0)}</td>
                    <td
                      style={{
                        ...TABLE_CELL_RIGHT_STYLE,
                        color: getComparisonColor(diff <= 0),
                        fontWeight: '500',
                      }}
                    >
                      {diff >= 0 ? '+' : ''}{diff.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Expense Summary */}
          <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ fontWeight: '600', color: PDF_COLORS.danger }}>{t('pdf.revenueExpense.totalExpense')}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: PDF_COLORS.primaryLight }}>
                  {formatCompactUSD(summaryA?.totalExpense || 0)}
                </span>
                <span style={{ margin: '0 8px', color: PDF_COLORS.gray[400] }}>→</span>
                <span style={{ color: PDF_COLORS.success }}>
                  {formatCompactUSD(summaryB?.totalExpense || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Net Profit Comparison Summary */}
      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div style={{ padding: '20px', background: '#2563eb', borderRadius: '12px', color: 'white' }}>
          <p style={{ fontSize: '12px', opacity: 0.9 }}>{scenarioA?.name || t('pdf.revenueExpense.scenarioA')} {t('pdf.revenueExpense.netProfit')}</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCompactUSD(summaryA?.netProfit || 0)}</p>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>{t('pdf.revenueExpense.margin')}: %{summaryA?.profitMargin.toFixed(1)}</p>
        </div>
        <div style={{ padding: '20px', background: '#16a34a', borderRadius: '12px', color: 'white' }}>
          <p style={{ fontSize: '12px', opacity: 0.9 }}>{scenarioB?.name || t('pdf.revenueExpense.scenarioB')} {t('pdf.revenueExpense.netProfit')}</p>
          <p style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCompactUSD(summaryB?.netProfit || 0)}</p>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>{t('pdf.revenueExpense.margin')}: %{summaryB?.profitMargin.toFixed(1)}</p>
        </div>
        <div
          style={{
            padding: '20px',
            background:
              summaryB && summaryA && summaryB.netProfit > summaryA.netProfit ? '#f0fdf4' : '#fef2f2',
            borderRadius: '12px',
            border: `2px solid ${
              summaryB && summaryA && summaryB.netProfit > summaryA.netProfit ? '#86efac' : '#fecaca'
            }`,
          }}
        >
          <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>{t('pdf.revenueExpense.differenceBA')}</p>
          <p
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color:
                summaryB && summaryA && summaryB.netProfit > summaryA.netProfit
                  ? PDF_COLORS.success
                  : PDF_COLORS.danger,
            }}
          >
            {summaryB && summaryA
              ? (summaryB.netProfit - summaryA.netProfit >= 0 ? '+' : '') +
                formatCompactUSD(summaryB.netProfit - summaryA.netProfit)
              : '-'}
          </p>
          <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>
            {summaryB && summaryA && summaryA.netProfit !== 0
              ? `${(((summaryB.netProfit - summaryA.netProfit) / Math.abs(summaryA.netProfit)) * 100).toFixed(0)}% ${t('pdf.revenueExpense.change')}`
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PdfRevenueExpensePage;
