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
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfProjectionPageProps } from './types';

/**
 * PDF Editable Projection Page Component
 * Displays the user-edited revenue and expense projections
 */
export function PdfProjectionPage({
  scenarioA,
  editableRevenueProjection,
  editableExpenseProjection,
}: PdfProjectionPageProps) {
  const { t } = useTranslation(['simulation']);

  if (editableRevenueProjection.length === 0 || !scenarioA) {
    return null;
  }

  // Calculate totals
  const totalRevenue = editableRevenueProjection.reduce(
    (s, i) => s + i.q1 + i.q2 + i.q3 + i.q4,
    0
  );
  const totalExpense = editableExpenseProjection.reduce(
    (s, i) => s + i.q1 + i.q2 + i.q3 + i.q4,
    0
  );
  const netProfit = totalRevenue - totalExpense;
  const editedCount =
    editableRevenueProjection.filter((i) => i.userEdited).length +
    editableExpenseProjection.filter((i) => i.userEdited).length;

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>
        {scenarioA?.targetYear ? t('pdf.projection.title', { year: scenarioA.targetYear + 1 }) : t('pdf.projection.nextYear')}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Revenue Projection Table */}
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
              {t('pdf.projection.revenue')}
            </span>
            {t('pdf.projection.revenueProjection')}
          </h3>
          <table style={{ ...TABLE_STYLE, fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                <th style={{ ...TABLE_HEADER_CELL_STYLE, borderBottom: '2px solid #86efac' }}>{t('pdf.projection.item')}</th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  Q1
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  Q2
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  Q3
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  Q4
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {t('pdf.projection.total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {editableRevenueProjection.slice(0, 6).map((item, i) => (
                <tr key={i} style={{ background: item.userEdited ? '#fef3c7' : 'white' }}>
                  <td style={{ ...TABLE_CELL_STYLE, fontWeight: '500' }}>
                    {item.category} {item.userEdited ? '✏️' : ''}
                  </td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q1)}</td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q2)}</td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q3)}</td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q4)}</td>
                  <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600' }}>
                    {formatCompactUSD(item.q1 + item.q2 + item.q3 + item.q4)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f0fdf4', fontWeight: 'bold' }}>
                <td style={{ padding: '8px', borderTop: '2px solid #86efac' }}>{t('pdf.projection.totalUpper')}</td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #86efac' }}>
                  {formatCompactUSD(editableRevenueProjection.reduce((s, i) => s + i.q1, 0))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #86efac' }}>
                  {formatCompactUSD(editableRevenueProjection.reduce((s, i) => s + i.q2, 0))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #86efac' }}>
                  {formatCompactUSD(editableRevenueProjection.reduce((s, i) => s + i.q3, 0))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #86efac' }}>
                  {formatCompactUSD(editableRevenueProjection.reduce((s, i) => s + i.q4, 0))}
                </td>
                <td
                  style={{
                    padding: '8px',
                    textAlign: 'right',
                    borderTop: '2px solid #86efac',
                    color: '#166534',
                  }}
                >
                  {formatCompactUSD(totalRevenue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expense Projection Table */}
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
              {t('pdf.projection.expense')}
            </span>
            {t('pdf.projection.expenseProjection')}
          </h3>
          <table style={{ ...TABLE_STYLE, fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#fef2f2' }}>
                <th style={{ ...TABLE_HEADER_CELL_STYLE, borderBottom: '2px solid #fecaca' }}>{t('pdf.projection.item')}</th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  Q1
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  Q2
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  Q3
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  Q4
                </th>
                <th
                  style={{
                    ...TABLE_HEADER_CELL_STYLE,
                    textAlign: 'right',
                    borderBottom: '2px solid #fecaca',
                  }}
                >
                  {t('pdf.projection.total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {editableExpenseProjection.slice(0, 6).map((item, i) => (
                <tr key={i} style={{ background: item.userEdited ? '#fef3c7' : 'white' }}>
                  <td style={{ ...TABLE_CELL_STYLE, fontWeight: '500' }}>
                    {item.category} {item.userEdited ? '✏️' : ''}
                  </td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q1)}</td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q2)}</td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q3)}</td>
                  <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(item.q4)}</td>
                  <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600' }}>
                    {formatCompactUSD(item.q1 + item.q2 + item.q3 + item.q4)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#fef2f2', fontWeight: 'bold' }}>
                <td style={{ padding: '8px', borderTop: '2px solid #fecaca' }}>{t('pdf.projection.totalUpper')}</td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #fecaca' }}>
                  {formatCompactUSD(editableExpenseProjection.reduce((s, i) => s + i.q1, 0))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #fecaca' }}>
                  {formatCompactUSD(editableExpenseProjection.reduce((s, i) => s + i.q2, 0))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #fecaca' }}>
                  {formatCompactUSD(editableExpenseProjection.reduce((s, i) => s + i.q3, 0))}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', borderTop: '2px solid #fecaca' }}>
                  {formatCompactUSD(editableExpenseProjection.reduce((s, i) => s + i.q4, 0))}
                </td>
                <td
                  style={{
                    padding: '8px',
                    textAlign: 'right',
                    borderTop: '2px solid #fecaca',
                    color: '#dc2626',
                  }}
                >
                  {formatCompactUSD(totalExpense)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Projection Summary */}
      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div
          style={{
            padding: '20px',
            background: '#f0fdf4',
            borderRadius: '12px',
            border: '1px solid #86efac',
          }}
        >
          <p style={{ fontSize: '12px', color: '#166534', marginBottom: '8px' }}>{t('pdf.projection.totalRevenue')}</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>
            {formatCompactUSD(totalRevenue)}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#fef2f2',
            borderRadius: '12px',
            border: '1px solid #fecaca',
          }}
        >
          <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>{t('pdf.projection.totalExpense')}</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
            {formatCompactUSD(totalExpense)}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#eff6ff',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
          }}
        >
          <p style={{ fontSize: '12px', color: PDF_COLORS.primary, marginBottom: '8px' }}>{t('pdf.projection.estimatedNetProfit')}</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
            {formatCompactUSD(netProfit)}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#fef3c7',
            borderRadius: '12px',
            border: '1px solid #fcd34d',
          }}
        >
          <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px' }}>{t('pdf.projection.editedItems')}</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>{editedCount}</p>
        </div>
      </div>
    </div>
  );
}

export default PdfProjectionPage;
