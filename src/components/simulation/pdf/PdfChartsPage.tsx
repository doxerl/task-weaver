import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CONTENT_PAGE_STYLE,
  PAGE_HEADER_STYLE,
} from '@/styles/pdfExport';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { formatCompactUSD } from '@/lib/formatters';
import type { PdfChartsPageProps } from './types';

/**
 * PDF Charts Page Component
 * Displays quarterly comparison charts
 */
export function PdfChartsPage({
  scenarioA,
  scenarioB,
  quarterlyComparison,
  quarterlyCumulativeData,
  chartConfig,
  cumulativeChartConfig,
}: PdfChartsPageProps) {
  const { t } = useTranslation(['simulation']);

  return (
    <div className="page-break-after" style={CONTENT_PAGE_STYLE}>
      <h2 style={PAGE_HEADER_STYLE}>
        {t('pdf.charts.title')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Quarterly Net Profit Chart */}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '20px',
            background: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            height: '420px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            {t('pdf.charts.quarterlyNetProfitComparison')}
          </h3>
          <div style={{ width: '100%', height: '340px' }}>
            <ChartContainer config={chartConfig} style={{ width: '100%', height: '100%' }}>
              <ComposedChart data={quarterlyComparison} width={500} height={320}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickFormatter={(v) => formatCompactUSD(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="scenarioANet" fill="#2563eb" name={scenarioA?.name} radius={4} />
                <Bar dataKey="scenarioBNet" fill="#16a34a" name={scenarioB?.name} radius={4} />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>

        {/* Cumulative Cash Flow Chart */}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '20px',
            background: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            height: '420px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            {t('pdf.charts.cumulativeCashFlow')}
          </h3>
          <div style={{ width: '100%', height: '340px' }}>
            <ChartContainer config={cumulativeChartConfig} style={{ width: '100%', height: '100%' }}>
              <AreaChart data={quarterlyCumulativeData} width={500} height={320}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickFormatter={(v) => formatCompactUSD(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="scenarioACumulative"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.3}
                  name={scenarioA?.name}
                />
                <Area
                  type="monotone"
                  dataKey="scenarioBCumulative"
                  stroke="#16a34a"
                  fill="#16a34a"
                  fillOpacity={0.3}
                  name={scenarioB?.name}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PdfChartsPage;
