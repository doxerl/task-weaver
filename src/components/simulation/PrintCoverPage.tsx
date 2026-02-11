import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCompactUSD } from '@/lib/formatters';

interface PrintCoverPageProps {
  scenarioAName: string;
  scenarioBName: string;
  scenarioAYear: number;
  scenarioBYear: number;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
}

export function PrintCoverPage({
  scenarioAName,
  scenarioBName,
  scenarioAYear,
  scenarioBYear,
  totalRevenue,
  totalExpense,
  netProfit,
  profitMargin,
}: PrintCoverPageProps) {
  const { t } = useTranslation(['simulation', 'common']);
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="print-only page-break-after" style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      padding: '40px',
    }}>
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '36pt', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
          {t('simulation:comparison.title')}
        </h1>
        <p style={{ fontSize: '18pt', color: '#3b82f6', marginBottom: '8px' }}>
          {scenarioAYear} {scenarioAName} vs {scenarioBYear} {scenarioBName}
        </p>
        <p style={{ fontSize: '12pt', color: '#6b7280' }}>
          {dateStr}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '24px',
        width: '100%',
        maxWidth: '800px',
      }}>
        <div style={{ 
          padding: '20px', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '10pt', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
            {t('simulation:metrics.totalRevenue')}
          </p>
          <p style={{ fontSize: '18pt', fontWeight: 'bold', color: '#1e3a8a' }}>
            {formatCompactUSD(totalRevenue)}
          </p>
        </div>
        <div style={{ 
          padding: '20px', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '10pt', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
            {t('simulation:metrics.totalExpense')}
          </p>
          <p style={{ fontSize: '18pt', fontWeight: 'bold', color: '#1e3a8a' }}>
            {formatCompactUSD(totalExpense)}
          </p>
        </div>
        <div style={{ 
          padding: '20px', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '10pt', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
            {t('simulation:metrics.netProfit')}
          </p>
          <p style={{ 
            fontSize: '18pt', 
            fontWeight: 'bold', 
            color: netProfit >= 0 ? '#16a34a' : '#dc2626',
          }}>
            {formatCompactUSD(netProfit)}
          </p>
        </div>
        <div style={{ 
          padding: '20px', 
          borderRadius: '12px', 
          border: '1px solid #e5e7eb',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '10pt', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase' }}>
            {t('simulation:metrics.profitMargin')}
          </p>
          <p style={{ 
            fontSize: '18pt', 
            fontWeight: 'bold', 
            color: profitMargin >= 0 ? '#16a34a' : '#dc2626',
          }}>
            %{profitMargin.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrintCoverPage;
