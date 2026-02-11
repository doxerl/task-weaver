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
import type { MultiYearCapitalPlan, ExitPlan } from '@/types/simulation';
import type { DealConfig } from './types';

export interface PdfFiveYearProjectionPageProps {
  multiYearPlan: MultiYearCapitalPlan | null;
  dealConfig: DealConfig;
  exitPlan: ExitPlan | null;
}

/**
 * PDF Page 18: Five Year Projection Table
 * Shows detailed 5-year financial projection
 */
export function PdfFiveYearProjectionPage({
  multiYearPlan,
  dealConfig,
  exitPlan,
}: PdfFiveYearProjectionPageProps) {
  const { t } = useTranslation(['simulation', 'common']);
  
  if (!multiYearPlan || !multiYearPlan.years || multiYearPlan.years.length === 0) {
    return null;
  }
  
  const { years, totalRequiredInvestment, selfSustainingFromYear } = multiYearPlan;
  const allYears = exitPlan?.allYears || [];
  
  // Calculate MOIC for each year
  const getMoic = (yearIndex: number) => {
    if (!exitPlan || dealConfig.investmentAmount <= 0) return 0;
    const yearProjection = allYears[yearIndex];
    if (!yearProjection) return 0;
    const investorShare = yearProjection.companyValuation * (dealConfig.equityPercentage / 100);
    return investorShare / dealConfig.investmentAmount;
  };

  return (
    <PdfPageWrapper style={CONTENT_PAGE_STYLE}>
      <div style={PAGE_HEADER_STYLE}>
        {t('simulation:investment.fiveYearProjection.title')}
      </div>
      
      <div style={{ fontSize: '12px', color: PDF_COLORS.gray[600], marginBottom: '16px' }}>
        {t('simulation:investment.fiveYearProjection.description')}
      </div>
      
      {/* Main Table */}
      <table style={TABLE_STYLE}>
        <thead>
          <tr>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, width: '60px' }}>{t('simulation:investment.fiveYearProjection.year')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.opening')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.revenue')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.expense')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.netProfit')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.deathValley')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.capitalNeed')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.yearEnd')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.valuation')}</th>
            <th style={{ ...TABLE_HEADER_CELL_STYLE, textAlign: 'right' as const }}>{t('simulation:investment.fiveYearProjection.moic')}</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year, index) => {
            const exitYear = allYears[index];
            const moic = getMoic(index);
            
            return (
              <tr key={year.year} style={{ 
                backgroundColor: year.isSelfSustaining ? '#f0fdf4' : 'transparent',
              }}>
                <td style={{ ...TABLE_CELL_STYLE, fontWeight: '600' }}>
                  {year.year}
                  {year.isSelfSustaining && (
                    <span style={{ 
                      marginLeft: '4px', 
                      fontSize: '10px', 
                      color: PDF_COLORS.success,
                    }}>✓</span>
                  )}
                </td>
                <td style={TABLE_CELL_RIGHT_STYLE}>
                  {formatCompactUSD(year.openingCash)}
                </td>
                <td style={TABLE_CELL_RIGHT_STYLE}>
                  {formatCompactUSD(year.projectedRevenue)}
                </td>
                <td style={TABLE_CELL_RIGHT_STYLE}>
                  {formatCompactUSD(year.projectedExpenses)}
                </td>
                <td style={{ 
                  ...TABLE_CELL_RIGHT_STYLE, 
                  color: year.projectedNetProfit >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
                  fontWeight: '600',
                }}>
                  {formatCompactUSD(year.projectedNetProfit)}
                </td>
                <td style={{ 
                  ...TABLE_CELL_RIGHT_STYLE,
                  color: year.peakDeficit < 0 ? PDF_COLORS.danger : PDF_COLORS.success,
                }}>
                  {formatCompactUSD(year.peakDeficit)}
                  <span style={{ fontSize: '9px', color: PDF_COLORS.gray[500], marginLeft: '2px' }}>
                    ({year.peakDeficitQuarter})
                  </span>
                </td>
                <td style={{ 
                  ...TABLE_CELL_RIGHT_STYLE,
                  color: year.requiredCapital > 0 ? PDF_COLORS.warning : PDF_COLORS.success,
                  fontWeight: '600',
                }}>
                  {year.requiredCapital > 0 ? formatCompactUSD(year.requiredCapital) : '-'}
                </td>
                <td style={{ 
                  ...TABLE_CELL_RIGHT_STYLE,
                  color: year.endingCash >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
                  fontWeight: '600',
                }}>
                  {formatCompactUSD(year.endingCash)}
                </td>
                <td style={TABLE_CELL_RIGHT_STYLE}>
                  {exitYear ? formatCompactUSD(year.weightedValuation || exitYear.companyValuation) : '-'}
                </td>
                <td style={{ 
                  ...TABLE_CELL_RIGHT_STYLE,
                  fontWeight: '600',
                  color: moic >= 3 ? PDF_COLORS.success : moic >= 2 ? PDF_COLORS.warning : PDF_COLORS.danger,
                }}>
                  {moic > 0 ? `${moic.toFixed(1)}x` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '16px',
        marginTop: '24px',
      }}>
        <div style={{ 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>
            {t('simulation:investment.fiveYearProjection.totalCapitalNeed')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: PDF_COLORS.primary }}>
            {formatCompactUSD(totalRequiredInvestment)}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: selfSustainingFromYear ? '#f0fdf4' : '#fef2f2', 
          borderRadius: '8px', 
          padding: '16px',
          border: `1px solid ${selfSustainingFromYear ? '#86efac' : '#fca5a5'}`,
        }}>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>
            {t('simulation:capital.selfSustaining')}
          </div>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: selfSustainingFromYear ? PDF_COLORS.success : PDF_COLORS.danger,
          }}>
            {selfSustainingFromYear 
              ? t('simulation:investment.exitPlan.yearN', { year: selfSustainingFromYear - years[0].year + 1 })
              : t('simulation:capital.notSelfSustaining')
            }
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: '#eff6ff', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid #93c5fd',
        }}>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>
            {t('simulation:investment.exitPlan.year5')} {t('simulation:investment.fiveYearProjection.valuation')}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: PDF_COLORS.primaryLight }}>
            {exitPlan?.year5Projection 
              ? formatCompactUSD(exitPlan.year5Projection.companyValuation)
              : '-'
            }
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: '#faf5ff', 
          borderRadius: '8px', 
          padding: '16px',
          border: '1px solid #d8b4fe',
        }}>
          <div style={{ fontSize: '10px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>
            {t('simulation:investment.exitPlan.year5')} MOIC
          </div>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: (exitPlan?.moic5Year || 0) >= 3 ? PDF_COLORS.success : '#9333ea',
          }}>
            {exitPlan?.moic5Year ? `${exitPlan.moic5Year.toFixed(1)}x` : '-'}
          </div>
        </div>
      </div>
    </PdfPageWrapper>
  );
}

export default PdfFiveYearProjectionPage;
