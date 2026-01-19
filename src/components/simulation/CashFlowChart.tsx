import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { QuarterlyProjection } from '@/types/simulation';
import { cn } from '@/lib/utils';
import { formatCompactUSD } from '@/lib/formatters';

interface CashFlowChartProps {
  quarterlyProjections: QuarterlyProjection[];
  currentCash?: number;
  safetyBuffer?: number;
  breakEvenQuarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
  className?: string;
  targetYear?: number;
  scenarioAName?: string;
  scenarioBName?: string;
}

const QUARTER_MONTHS: Record<string, string> = {
  'Q1': 'Oca-Mar',
  'Q2': 'Nis-Haz',
  'Q3': 'Tem-Eyl',
  'Q4': 'Eki-Ara',
};

export const CashFlowChart = forwardRef<HTMLDivElement, CashFlowChartProps>(
  ({ quarterlyProjections, currentCash = 0, safetyBuffer, breakEvenQuarter, className, targetYear, scenarioAName, scenarioBName }, ref) => {
    // Build chart data with starting point
    const data = [
      {
        name: 'Başl.',
        quarter: 'Başlangıç',
        bakiye: Math.round(currentCash),
        gelir: 0,
        gider: 0,
        yatirim: 0,
        netAkis: 0,
      },
      ...quarterlyProjections.map(p => ({
        name: p.quarter,
        quarter: `${p.quarter} (${QUARTER_MONTHS[p.quarter] || ''})`,
        bakiye: Math.round(p.closingBalance),
        gelir: Math.round(p.revenue),
        gider: Math.round(p.expense),
        yatirim: Math.round(p.investment),
        netAkis: Math.round(p.netCashFlow),
      }))
    ];

    const allBalances = data.map(d => d.bakiye);
    const minBalance = Math.min(...allBalances);
    const maxBalance = Math.max(...allBalances);
    const yMin = Math.min(0, minBalance) - 5000;
    const yMax = maxBalance + 10000;

    // Dynamic chart title with year
    const chartTitle = targetYear 
      ? `${targetYear} Çeyreklik Nakit Akış Projeksiyonu` 
      : 'Çeyreklik Nakit Akış Projeksiyonu';

    return (
      <Card className={cn("", className)} ref={ref}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis 
                  width={80}
                  domain={[yMin, yMax]}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const pointData = payload[0]?.payload;
                    if (label === 'Başl.') {
                      return (
                        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }} className="rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium mb-2" style={{ color: '#0f172a' }}>Başlangıç Bakiyesi</p>
                          <p className="font-semibold" style={{ color: '#0f172a' }}>{formatCompactUSD(pointData.bakiye)}</p>
                        </div>
                      );
                    }
                    return (
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }} className="rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-medium mb-2" style={{ color: '#0f172a' }}>{pointData.quarter}</p>
                        <div className="space-y-1">
                          <p style={{ color: '#16a34a' }}>Gelir: {formatCompactUSD(pointData.gelir)}</p>
                          <p style={{ color: '#ef4444' }}>Gider: {formatCompactUSD(pointData.gider)}</p>
                          {pointData.yatirim > 0 && (
                            <p style={{ color: '#ea580c' }}>Yatırım: {formatCompactUSD(pointData.yatirim)}</p>
                          )}
                          <div className="border-t pt-1 mt-1">
                            <p style={{ color: '#2563eb' }}>Net Akış: {formatCompactUSD(pointData.netAkis)}</p>
                            <p className="font-semibold" style={{ color: '#0f172a' }}>Bakiye: {formatCompactUSD(pointData.bakiye)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      bakiye: 'Nakit Bakiyesi',
                      gelir: 'Gelir',
                      gider: 'Gider',
                    };
                    return labels[value] || value;
                  }}
                />
                
                {/* Zero line */}
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="5 5" />
                
                {/* Safety buffer line */}
                {safetyBuffer && safetyBuffer > 0 && (
                  <ReferenceLine 
                    y={safetyBuffer} 
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{ value: 'Güvenlik Tamponu', position: 'right', fill: '#f59e0b', fontSize: 10 }}
                  />
                )}
                
                {/* Break-even quarter */}
                {breakEvenQuarter && (
                  <ReferenceLine 
                    x={breakEvenQuarter} 
                    stroke="#2563eb"
                    strokeDasharray="3 3"
                    label={{ value: 'Break-even', position: 'top', fill: '#2563eb', fontSize: 10 }}
                  />
                )}
                
                <Line 
                  type="monotone" 
                  dataKey="bakiye" 
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 5, fill: '#2563eb' }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gelir" 
                  stroke="#16a34a"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="gider" 
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }
);

CashFlowChart.displayName = 'CashFlowChart';
