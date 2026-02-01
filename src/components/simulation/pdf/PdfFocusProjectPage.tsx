import React from 'react';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
  PDF_COLORS,
} from '@/styles/pdfExport';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfFocusProjectPageProps } from './types';

/**
 * PDF Focus Project Analysis Page Component
 * Displays investment allocation and focus project details
 */
export function PdfFocusProjectPage({
  scenarioA,
  focusProjects,
  investmentAllocation,
  focusProjectPlan,
  dealConfig,
}: PdfFocusProjectPageProps) {
  if (focusProjects.length === 0 || !scenarioA || !investmentAllocation) {
    return null;
  }

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>Yatırım Odak Projesi Analizi</h2>

      {/* Selected Projects */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: focusProjects.length > 1 ? '1fr 1fr' : '1fr',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {focusProjects.map((projectName) => {
          const revenueItem = scenarioA?.revenues.find((r) => r.category === projectName);
          const growthRate =
            revenueItem && revenueItem.baseAmount > 0
              ? ((revenueItem.projectedAmount - revenueItem.baseAmount) / revenueItem.baseAmount) * 100
              : 0;
          return (
            <div
              key={projectName}
              style={{
                padding: '24px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                borderRadius: '16px',
                border: '2px solid #3b82f6',
              }}
            >
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: PDF_COLORS.primary, marginBottom: '16px' }}>
                🎯 {projectName}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>
                    Mevcut Gelir ({scenarioA?.baseYear})
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#374151' }}>
                    {formatCompactUSD(revenueItem?.baseAmount || 0)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>
                    Hedef Gelir ({scenarioA?.targetYear})
                  </p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: PDF_COLORS.success }}>
                    {formatCompactUSD(revenueItem?.projectedAmount || 0)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500], marginBottom: '4px' }}>Büyüme Oranı</p>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: 'bold',
                      color: growthRate >= 0 ? PDF_COLORS.success : PDF_COLORS.danger,
                    }}
                  >
                    {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Investment Allocation */}
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
        Yatırım Dağılımı
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            padding: '20px',
            background: '#f0f9ff',
            borderRadius: '12px',
            border: '1px solid #bae6fd',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: '#0369a1', marginBottom: '8px' }}>Ürün Geliştirme</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#0369a1' }}>
            %{investmentAllocation.product}
          </p>
          <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>
            ${Math.round((dealConfig.investmentAmount * investmentAllocation.product) / 100).toLocaleString()}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#fef3c7',
            borderRadius: '12px',
            border: '1px solid #fcd34d',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '8px' }}>Pazarlama</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#92400e' }}>
            %{investmentAllocation.marketing}
          </p>
          <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>
            ${Math.round((dealConfig.investmentAmount * investmentAllocation.marketing) / 100).toLocaleString()}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#f0fdf4',
            borderRadius: '12px',
            border: '1px solid #86efac',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: '#166534', marginBottom: '8px' }}>İşe Alım</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#166534' }}>
            %{investmentAllocation.hiring}
          </p>
          <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>
            ${Math.round((dealConfig.investmentAmount * investmentAllocation.hiring) / 100).toLocaleString()}
          </p>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#f5f3ff',
            borderRadius: '12px',
            border: '1px solid #c4b5fd',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '12px', color: '#6d28d9', marginBottom: '8px' }}>Operasyonlar</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#6d28d9' }}>
            %{investmentAllocation.operations}
          </p>
          <p style={{ fontSize: '12px', color: PDF_COLORS.gray[500] }}>
            ${Math.round((dealConfig.investmentAmount * investmentAllocation.operations) / 100).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Growth Plan */}
      {focusProjectPlan && (
        <div
          style={{
            padding: '24px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            Büyüme Planı
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: '#4b5563',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}
          >
            {focusProjectPlan}
          </p>
        </div>
      )}

      {/* Summary Banner */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          borderRadius: '12px',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: '12px', opacity: 0.9 }}>Toplam Yatırım</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>${dealConfig.investmentAmount.toLocaleString()}</p>
        </div>
        <div>
          <p style={{ fontSize: '12px', opacity: 0.9 }}>Odak Proje Sayısı</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{focusProjects.length}</p>
        </div>
        <div>
          <p style={{ fontSize: '12px', opacity: 0.9 }}>Toplam Dağılım</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
            %
            {investmentAllocation.product +
              investmentAllocation.marketing +
              investmentAllocation.hiring +
              investmentAllocation.operations}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PdfFocusProjectPage;
