import React from 'react';
import { useTranslation } from 'react-i18next';
import { PdfPageWrapper } from './PdfPageWrapper';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { InvestmentScenarioComparison } from '@/types/simulation';

export interface PdfFutureImpactPageProps {
  scenarioComparison: InvestmentScenarioComparison;
  scenarioYear: number;
}

/**
 * PDF Page 15: Future Impact Chart
 * Shows 5-year revenue projection comparison
 */
export function PdfFutureImpactPage({
  scenarioComparison,
  scenarioYear,
}: PdfFutureImpactPageProps) {
  const { t } = useTranslation(['simulation', 'common']);
  
  const { futureImpact } = scenarioComparison;
  const yearlyProjections = futureImpact.yearlyProjections || [];
  
  // Find max value for scaling
  const maxValue = Math.max(
    ...yearlyProjections.map(y => Math.max(y.withInvestment, y.withoutInvestment))
  );
  
  // Calculate bar heights (max 120px)
  const getBarHeight = (value: number) => {
    if (maxValue <= 0) return 10;
    return Math.max(10, (value / maxValue) * 120);
  };

  return (
    <PdfPageWrapper style={CONTENT_PAGE_STYLE}>
      <div style={PAGE_HEADER_STYLE}>
        {t('simulation:investment.futureImpact.title')}
      </div>
      
      {/* Legend */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#22c55e', borderRadius: '4px' }} />
          <span style={{ fontSize: '12px' }}>{t('simulation:investment.futureImpact.withInvestment')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#ef4444', borderRadius: '4px' }} />
          <span style={{ fontSize: '12px' }}>{t('simulation:investment.futureImpact.withoutInvestment')}</span>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        alignItems: 'flex-end',
        height: '180px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '8px',
        marginBottom: '16px',
      }}>
        {yearlyProjections.map((yearData, index) => (
          <div key={index} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'flex-end', height: '140px' }}>
              {/* With Investment Bar */}
              <div style={{ 
                width: '32px', 
                height: `${getBarHeight(yearData.withInvestment)}px`,
                backgroundColor: '#22c55e',
                borderRadius: '4px 4px 0 0',
                position: 'relative',
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '-20px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  fontWeight: '600',
                  color: '#16a34a',
                  whiteSpace: 'nowrap',
                }}>
                  {formatCompactUSD(yearData.withInvestment)}
                </div>
              </div>
              
              {/* Without Investment Bar */}
              <div style={{ 
                width: '32px', 
                height: `${getBarHeight(yearData.withoutInvestment)}px`,
                backgroundColor: '#ef4444',
                borderRadius: '4px 4px 0 0',
                position: 'relative',
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '-20px', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  fontWeight: '600',
                  color: '#dc2626',
                  whiteSpace: 'nowrap',
                }}>
                  {formatCompactUSD(yearData.withoutInvestment)}
                </div>
              </div>
            </div>
            
            {/* Year Label */}
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '600' }}>
              {yearData.yearLabel}
            </div>
          </div>
        ))}
      </div>
      
      {/* Difference Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '12px',
        marginTop: '24px',
      }}>
        {yearlyProjections.map((yearData, index) => {
          const diffPercent = yearData.withoutInvestment > 0 
            ? ((yearData.withInvestment - yearData.withoutInvestment) / yearData.withoutInvestment * 100)
            : 0;
          
          return (
            <div key={index} style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px', 
              padding: '12px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>
                {t('simulation:investment.futureImpact.yearDiff', { year: yearData.year })}
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: yearData.difference >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
              }}>
                {yearData.difference >= 0 ? '+' : ''}{formatCompactUSD(yearData.difference)}
              </div>
              <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
                {diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Total Difference Banner */}
      <div style={{ 
        marginTop: '24px',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        color: 'white',
      }}>
        <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>
          {t('simulation:investment.futureImpact.totalDifference')}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
          {formatCompactUSD(futureImpact.cumulativeDifference)}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
          {scenarioYear} - {scenarioYear + 4} ({t('simulation:investment.futureImpact.fiveYearProjection')})
        </div>
      </div>
    </PdfPageWrapper>
  );
}

export default PdfFutureImpactPage;
