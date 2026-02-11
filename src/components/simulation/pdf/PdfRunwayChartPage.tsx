import React from 'react';
import { useTranslation } from 'react-i18next';
import { PdfPageWrapper } from './PdfPageWrapper';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';

export interface RunwayDataPoint {
  quarter: string;
  withInvestment: number;
  withoutInvestment: number;
  difference: number;
}

export interface PdfRunwayChartPageProps {
  runwayData: RunwayDataPoint[];
  scenarioAName: string;
  scenarioBName: string;
}

/**
 * PDF Page 16: Runway Chart
 * Shows cumulative cash position comparison by quarter
 */
export function PdfRunwayChartPage({
  runwayData,
  scenarioAName,
  scenarioBName,
}: PdfRunwayChartPageProps) {
  const { t } = useTranslation(['simulation', 'common']);
  
  if (!runwayData || runwayData.length === 0) {
    return null;
  }
  
  // Find min and max for scaling
  const allValues = runwayData.flatMap(d => [d.withInvestment, d.withoutInvestment, 0]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue || 1;
  
  // Chart dimensions
  const chartWidth = 1000;
  const chartHeight = 200;
  const paddingLeft = 80;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  
  // Convert value to Y coordinate
  const getY = (value: number) => {
    return paddingTop + plotHeight - ((value - minValue) / range * plotHeight);
  };
  
  // Generate path for line chart
  const generatePath = (key: 'withInvestment' | 'withoutInvestment') => {
    const points = runwayData.map((d, i) => {
      const x = paddingLeft + (i / (runwayData.length - 1)) * plotWidth;
      const y = getY(d[key]);
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };
  
  // Zero line Y position
  const zeroY = getY(0);
  
  // Last values
  const lastData = runwayData[runwayData.length - 1];
  const opportunityCost = lastData.withInvestment - lastData.withoutInvestment;

  return (
    <PdfPageWrapper style={CONTENT_PAGE_STYLE}>
      <div style={PAGE_HEADER_STYLE}>
        {t('simulation:investment.cashFlowRunway.title')}
      </div>
      
      <div style={{ fontSize: '12px', color: PDF_COLORS.gray[600], marginBottom: '16px' }}>
        {t('simulation:investment.cashFlowRunway.description')}
      </div>
      
      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '3px', backgroundColor: '#22c55e', borderRadius: '2px' }} />
          <span style={{ fontSize: '12px' }}>{scenarioAName} ({t('simulation:investment.cashFlowRunway.withInvestment')})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '3px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
          <span style={{ fontSize: '12px' }}>{scenarioBName} ({t('simulation:investment.cashFlowRunway.withoutInvestment')})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '2px', backgroundColor: '#6b7280', borderRadius: '1px', borderStyle: 'dashed', borderWidth: '1px' }} />
          <span style={{ fontSize: '12px' }}>{t('simulation:investment.cashFlowRunway.zeroLine')}</span>
        </div>
      </div>
      
      {/* SVG Chart */}
      <svg width={chartWidth} height={chartHeight} style={{ marginBottom: '24px' }}>
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={paddingLeft} y={paddingTop} width={plotWidth} height={plotHeight} fill="url(#grid)" />
        
        {/* Zero reference line */}
        <line 
          x1={paddingLeft} 
          y1={zeroY} 
          x2={chartWidth - paddingRight} 
          y2={zeroY}
          stroke="#9ca3af"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        
        {/* With Investment Line (Green) */}
        <path
          d={generatePath('withInvestment')}
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
        />
        
        {/* Without Investment Line (Red) */}
        <path
          d={generatePath('withoutInvestment')}
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
        />
        
        {/* Data points - With Investment */}
        {runwayData.map((d, i) => {
          const x = paddingLeft + (i / (runwayData.length - 1)) * plotWidth;
          const y = getY(d.withInvestment);
          return (
            <g key={`with-${i}`}>
              <circle cx={x} cy={y} r="6" fill="#22c55e" />
              <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill="#16a34a" fontWeight="600">
                {formatCompactUSD(d.withInvestment)}
              </text>
            </g>
          );
        })}
        
        {/* Data points - Without Investment */}
        {runwayData.map((d, i) => {
          const x = paddingLeft + (i / (runwayData.length - 1)) * plotWidth;
          const y = getY(d.withoutInvestment);
          return (
            <g key={`without-${i}`}>
              <circle cx={x} cy={y} r="6" fill="#ef4444" />
              <text x={x} y={y + 18} textAnchor="middle" fontSize="10" fill="#dc2626" fontWeight="600">
                {formatCompactUSD(d.withoutInvestment)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {runwayData.map((d, i) => {
          const x = paddingLeft + (i / (runwayData.length - 1)) * plotWidth;
          return (
            <text 
              key={`label-${i}`} 
              x={x} 
              y={chartHeight - 10} 
              textAnchor="middle" 
              fontSize="12" 
              fill="#64748b"
              fontWeight="500"
            >
              {d.quarter}
            </text>
          );
        })}
        
        {/* Y-axis labels */}
        {[minValue, (minValue + maxValue) / 2, maxValue].map((value, i) => {
          const y = getY(value);
          return (
            <text 
              key={`y-${i}`} 
              x={paddingLeft - 10} 
              y={y + 4} 
              textAnchor="end" 
              fontSize="10" 
              fill="#64748b"
            >
              {formatCompactUSD(value)}
            </text>
          );
        })}
      </svg>
      
      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px',
      }}>
        {runwayData.map((d, i) => (
          <div key={i} style={{ 
            backgroundColor: '#f8fafc', 
            borderRadius: '8px', 
            padding: '16px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>{d.quarter}</div>
            <div style={{ 
              fontSize: '11px', 
              color: d.difference >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
              fontWeight: '600',
            }}>
              {t('simulation:investment.cashFlowRunway.difference')}: {d.difference >= 0 ? '+' : ''}{formatCompactUSD(d.difference)}
            </div>
          </div>
        ))}
      </div>
      
      {/* Opportunity Cost Banner */}
      <div style={{ 
        marginTop: '24px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid #93c5fd',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: PDF_COLORS.gray[600] }}>
            {t('simulation:investment.cashFlowRunway.opportunityCost')} (Q4)
          </div>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
            {t('simulation:investment.capitalComparison.opportunityCostDesc')}
          </div>
        </div>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: opportunityCost >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
        }}>
          {opportunityCost >= 0 ? '+' : ''}{formatCompactUSD(opportunityCost)}
        </div>
      </div>
    </PdfPageWrapper>
  );
}

export default PdfRunwayChartPage;
