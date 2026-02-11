import React from 'react';
import { useTranslation } from 'react-i18next';
import { PdfPageWrapper } from './PdfPageWrapper';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';

export interface GrowthConfig {
  aggressiveGrowthRate: number;
  normalizedGrowthRate: number;
  rawUserGrowthRate?: number;
}

export interface PdfGrowthModelPageProps {
  growthConfig: GrowthConfig | null;
  targetYear: number;
}

/**
 * PDF Page 17: Growth Model
 * Explains the two-stage growth model
 */
export function PdfGrowthModelPage({
  growthConfig,
  targetYear,
}: PdfGrowthModelPageProps) {
  const { t } = useTranslation(['simulation', 'common']);
  
  if (!growthConfig) {
    return null;
  }
  
  const { aggressiveGrowthRate, normalizedGrowthRate, rawUserGrowthRate } = growthConfig;
  const isCapped = rawUserGrowthRate && rawUserGrowthRate > 1.0; // Capped at 100%
  
  // Years labels
  const year1 = targetYear;
  const year5 = targetYear + 4;

  return (
    <PdfPageWrapper style={CONTENT_PAGE_STYLE}>
      <div style={PAGE_HEADER_STYLE}>
        {t('simulation:investment.twoStageGrowth.title')}
      </div>
      
      {/* Two Stage Model Diagram */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* Stage 1: Aggressive Growth */}
        <div style={{ 
          background: 'linear-gradient(135deg, #22c55e15 0%, #22c55e05 100%)',
          borderRadius: '12px',
          padding: '24px',
          border: '2px solid #22c55e40',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px',
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              backgroundColor: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
            }}>
              1
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: PDF_COLORS.gray[800] }}>
                {t('simulation:investment.twoStageGrowth.year1to2')}
              </div>
              <div style={{ fontSize: '12px', color: PDF_COLORS.gray[600] }}>
                {year1} - {year1 + 1}
              </div>
            </div>
          </div>
          
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: '#16a34a',
            marginBottom: '8px',
          }}>
            %{(aggressiveGrowthRate * 100).toFixed(0)}
          </div>
          
          <div style={{ fontSize: '12px', color: PDF_COLORS.gray[600] }}>
            {t('simulation:investment.twoStageGrowth.revenueGrowth')}
          </div>
          
          {isCapped && (
            <div style={{ 
              marginTop: '16px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              padding: '12px',
              border: '1px solid #fcd34d',
            }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#92400e' }}>
                ⚠️ {t('simulation:investment.twoStageGrowth.capWarning')}
              </div>
              <div style={{ fontSize: '10px', color: '#a16207', marginTop: '4px' }}>
                {t('simulation:investment.twoStageGrowth.capWarningDetail', { 
                  original: ((rawUserGrowthRate || 0) * 100).toFixed(0) 
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Stage 2: Normalized Growth */}
        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f615 0%, #3b82f605 100%)',
          borderRadius: '12px',
          padding: '24px',
          border: '2px solid #3b82f640',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '16px',
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '50%', 
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
            }}>
              2
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: PDF_COLORS.gray[800] }}>
                {t('simulation:investment.twoStageGrowth.year3to5')}
              </div>
              <div style={{ fontSize: '12px', color: PDF_COLORS.gray[600] }}>
                {year1 + 2} - {year5}
              </div>
            </div>
          </div>
          
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: '#2563eb',
            marginBottom: '8px',
          }}>
            %{(normalizedGrowthRate * 100).toFixed(0)}
          </div>
          
          <div style={{ fontSize: '12px', color: PDF_COLORS.gray[600] }}>
            {t('simulation:investment.twoStageGrowth.revenueGrowth')} ({t('simulation:investment.twoStageGrowth.sectorAverage')})
          </div>
        </div>
      </div>
      
      {/* Growth Decay Visual */}
      <div style={{ 
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
          {t('simulation:investment.futureImpact.fiveYearProjection')}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '100px' }}>
          {[1, 2, 3, 4, 5].map(year => {
            // Calculate growth rate for each year
            let rate: number;
            if (year <= 2) {
              rate = aggressiveGrowthRate;
            } else {
              // Decay from aggressive to normalized
              const decayFactor = 0.8; // 80% decay per year
              const decayYears = year - 2;
              rate = aggressiveGrowthRate * Math.pow(decayFactor, decayYears);
              rate = Math.max(rate, normalizedGrowthRate); // Floor at normalized rate
            }
            
            const barHeight = Math.max(20, rate * 100);
            const isAggressive = year <= 2;
            
            return (
              <div key={year} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  marginBottom: '4px',
                  color: isAggressive ? '#16a34a' : '#2563eb',
                }}>
                  %{(rate * 100).toFixed(0)}
                </div>
                <div style={{ 
                  height: `${barHeight}px`, 
                  backgroundColor: isAggressive ? '#22c55e' : '#3b82f6',
                  borderRadius: '4px 4px 0 0',
                  marginInline: 'auto',
                  width: '48px',
                }} />
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '11px', 
                  color: PDF_COLORS.gray[600],
                }}>
                  {t('simulation:investment.exitPlan.yearN', { year })}
                </div>
                <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500] }}>
                  {year1 + year - 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Explanation */}
      <div style={{ 
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #93c5fd',
      }}>
        <div style={{ fontSize: '12px', color: PDF_COLORS.gray[700], lineHeight: '1.6' }}>
          <strong>{t('simulation:investment.twoStageGrowth.title')}:</strong>{' '}
          {t('simulation:investment.twoStageGrowth.year1to2')}{' '}
          (%{(aggressiveGrowthRate * 100).toFixed(0)}){' '}
          → {t('simulation:investment.twoStageGrowth.year3to5')}{' '}
          (%{(normalizedGrowthRate * 100).toFixed(0)}).
        </div>
      </div>
    </PdfPageWrapper>
  );
}

export default PdfGrowthModelPage;
