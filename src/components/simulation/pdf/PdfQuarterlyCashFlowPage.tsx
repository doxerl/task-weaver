import React from 'react';
import { useTranslation } from 'react-i18next';
import { PdfPageWrapper } from './PdfPageWrapper';
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

export interface PdfQuarterlyCashFlowPageProps {
  quarterlyRevenueA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyRevenueB: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseB: { q1: number; q2: number; q3: number; q4: number };
  investmentAmount: number;
  scenarioAName: string;
  scenarioBName: string;
}

/**
 * PDF Page 14: Quarterly Cash Flow Analysis
 * Shows detailed quarterly revenue/expense/net breakdown for both scenarios
 */
export function PdfQuarterlyCashFlowPage({
  quarterlyRevenueA,
  quarterlyExpenseA,
  quarterlyRevenueB,
  quarterlyExpenseB,
  investmentAmount,
  scenarioAName,
  scenarioBName,
}: PdfQuarterlyCashFlowPageProps) {
  const { t } = useTranslation(['simulation', 'common']);
  
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  // Calculate net and cumulative for Scenario A (with investment)
  const netA = {
    q1: quarterlyRevenueA.q1 - quarterlyExpenseA.q1,
    q2: quarterlyRevenueA.q2 - quarterlyExpenseA.q2,
    q3: quarterlyRevenueA.q3 - quarterlyExpenseA.q3,
    q4: quarterlyRevenueA.q4 - quarterlyExpenseA.q4,
  };
  
  const cumulativeA = {
    q1: investmentAmount + netA.q1,
    q2: investmentAmount + netA.q1 + netA.q2,
    q3: investmentAmount + netA.q1 + netA.q2 + netA.q3,
    q4: investmentAmount + netA.q1 + netA.q2 + netA.q3 + netA.q4,
  };
  
  // Calculate net and cumulative for Scenario B (without investment)
  const netB = {
    q1: quarterlyRevenueB.q1 - quarterlyExpenseB.q1,
    q2: quarterlyRevenueB.q2 - quarterlyExpenseB.q2,
    q3: quarterlyRevenueB.q3 - quarterlyExpenseB.q3,
    q4: quarterlyRevenueB.q4 - quarterlyExpenseB.q4,
  };
  
  const cumulativeB = {
    q1: netB.q1,
    q2: netB.q1 + netB.q2,
    q3: netB.q1 + netB.q2 + netB.q3,
    q4: netB.q1 + netB.q2 + netB.q3 + netB.q4,
  };
  
  // Find death valley (minimum cumulative)
  const deathValleyA = Math.min(cumulativeA.q1, cumulativeA.q2, cumulativeA.q3, cumulativeA.q4);
  const deathValleyB = Math.min(cumulativeB.q1, cumulativeB.q2, cumulativeB.q3, cumulativeB.q4);
  
  const totalRevenueA = quarterlyRevenueA.q1 + quarterlyRevenueA.q2 + quarterlyRevenueA.q3 + quarterlyRevenueA.q4;
  const totalExpenseA = quarterlyExpenseA.q1 + quarterlyExpenseA.q2 + quarterlyExpenseA.q3 + quarterlyExpenseA.q4;
  const totalRevenueB = quarterlyRevenueB.q1 + quarterlyRevenueB.q2 + quarterlyRevenueB.q3 + quarterlyRevenueB.q4;
  const totalExpenseB = quarterlyExpenseB.q1 + quarterlyExpenseB.q2 + quarterlyExpenseB.q3 + quarterlyExpenseB.q4;

  const renderTable = (
    title: string,
    revenue: { q1: number; q2: number; q3: number; q4: number },
    expense: { q1: number; q2: number; q3: number; q4: number },
    net: { q1: number; q2: number; q3: number; q4: number },
    cumulative: { q1: number; q2: number; q3: number; q4: number },
    totalRev: number,
    totalExp: number,
    startingBalance: number,
    isPositive: boolean
  ) => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '600', 
        marginBottom: '8px',
        color: isPositive ? PDF_COLORS.success : PDF_COLORS.danger,
      }}>
        {title}
        <span style={{ fontSize: '11px', color: PDF_COLORS.gray[500], marginLeft: '8px' }}>
          ({t('simulation:pdf.quarterlyCashFlow.startingBalance', { amount: formatCompactUSD(startingBalance) })})
        </span>
      </div>
      <table style={TABLE_STYLE}>
        <thead>
          <tr>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, width: '80px' }}></th>
            {quarters.map(q => (
              <th key={q} style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{q}</th>
            ))}
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const, backgroundColor: '#e2e8f0' }}>
              {t('simulation:projection.total')}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={TABLE_CELL_STYLE}>{t('simulation:charts.revenue')}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(revenue.q1)}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(revenue.q2)}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(revenue.q3)}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(revenue.q4)}</td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600' }}>{formatCompactUSD(totalRev)}</td>
          </tr>
          <tr>
            <td style={TABLE_CELL_STYLE}>{t('simulation:charts.expense')}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(expense.q1)}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(expense.q2)}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(expense.q3)}</td>
            <td style={TABLE_CELL_RIGHT_STYLE}>{formatCompactUSD(expense.q4)}</td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600' }}>{formatCompactUSD(totalExp)}</td>
          </tr>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <td style={{ ...TABLE_CELL_STYLE, fontWeight: '600' }}>{t('simulation:pdf.quarterlyCashFlow.net')}</td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: net.q1 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(net.q1)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: net.q2 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(net.q2)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: net.q3 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(net.q3)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: net.q4 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(net.q4)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: (totalRev - totalExp) >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(totalRev - totalExp)}
            </td>
          </tr>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <td style={{ ...TABLE_CELL_STYLE, fontWeight: '600' }}>{t('simulation:pdf.quarterlyCashFlow.cumulative')}</td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: cumulative.q1 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(cumulative.q1)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: cumulative.q2 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(cumulative.q2)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: cumulative.q3 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(cumulative.q3)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600', color: cumulative.q4 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
              {formatCompactUSD(cumulative.q4)}
            </td>
            <td style={{ ...TABLE_CELL_RIGHT_STYLE, fontWeight: '600' }}>-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <PdfPageWrapper style={CONTENT_PAGE_STYLE}>
      <div style={PAGE_HEADER_STYLE}>
        {t('simulation:pdf.quarterlyCashFlow.title')}
      </div>
      
      {/* Scenario A - With Investment */}
      {renderTable(
        t('simulation:pdf.quarterlyCashFlow.invested', { name: scenarioAName }),
        quarterlyRevenueA,
        quarterlyExpenseA,
        netA,
        cumulativeA,
        totalRevenueA,
        totalExpenseA,
        investmentAmount,
        true
      )}
      
      {/* Scenario B - Without Investment */}
      {renderTable(
        t('simulation:pdf.quarterlyCashFlow.uninvested', { name: scenarioBName }),
        quarterlyRevenueB,
        quarterlyExpenseB,
        netB,
        cumulativeB,
        totalRevenueB,
        totalExpenseB,
        0,
        false
      )}
      
      {/* Year End Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '16px',
        marginTop: '24px',
      }}>
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid #86efac',
        }}>
          <div style={{ fontSize: '11px', color: PDF_COLORS.gray[600], marginBottom: '4px' }}>
            {scenarioAName} {t('simulation:pdf.quarterlyCashFlow.yearEnd')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: cumulativeA.q4 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
            {formatCompactUSD(cumulativeA.q4)}
          </div>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
            Death Valley: {formatCompactUSD(deathValleyA)}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: '#fef2f2', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid #fca5a5',
        }}>
          <div style={{ fontSize: '11px', color: PDF_COLORS.gray[600], marginBottom: '4px' }}>
            {scenarioBName} {t('simulation:pdf.quarterlyCashFlow.yearEnd')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: cumulativeB.q4 >= 0 ? PDF_COLORS.success : PDF_COLORS.danger }}>
            {formatCompactUSD(cumulativeB.q4)}
          </div>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
            Death Valley: {formatCompactUSD(deathValleyB)}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: '#eff6ff', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid #93c5fd',
        }}>
          <div style={{ fontSize: '11px', color: PDF_COLORS.gray[600], marginBottom: '4px' }}>
            {t('simulation:investment.quarterlyCapital.opportunityCost')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: PDF_COLORS.primaryLight }}>
            {formatCompactUSD(cumulativeA.q4 - cumulativeB.q4)}
          </div>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
            {t('simulation:investment.capitalComparison.opportunityCostDesc')}
          </div>
        </div>
      </div>
    </PdfPageWrapper>
  );
}

export default PdfQuarterlyCashFlowPage;
