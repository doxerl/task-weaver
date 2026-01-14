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
}

const QUARTER_MONTHS: Record<string, string> = {
  'Q1': 'Oca-Mar',
  'Q2': 'Nis-Haz',
  'Q3': 'Tem-Eyl',
  'Q4': 'Eki-Ara',
};

export const CashFlowChart = forwardRef<HTMLDivElement, CashFlowChartProps>(
  ({ quarterlyProjections, currentCash = 0, safetyBuffer, breakEvenQuarter, className }, ref) => {
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

    return (
      <Card className={cn("", className)} ref={ref}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Çeyreklik Nakit Akış Projeksiyonu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  width={80}
                  domain={[yMin, yMax]}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const pointData = payload[0]?.payload;
                    if (label === 'Başl.') {
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium mb-2">Başlangıç Bakiyesi</p>
                          <p className="font-semibold">{formatCompactUSD(pointData.bakiye)}</p>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-medium mb-2">{pointData.quarter}</p>
                        <div className="space-y-1">
                          <p className="text-green-600">Gelir: {formatCompactUSD(pointData.gelir)}</p>
                          <p className="text-red-600">Gider: {formatCompactUSD(pointData.gider)}</p>
                          {pointData.yatirim > 0 && (
                            <p className="text-orange-600">Yatırım: {formatCompactUSD(pointData.yatirim)}</p>
                          )}
                          <div className="border-t pt-1 mt-1">
                            <p className="text-primary">Net Akış: {formatCompactUSD(pointData.netAkis)}</p>
                            <p className="font-semibold">Bakiye: {formatCompactUSD(pointData.bakiye)}</p>
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
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                
                {/* Safety buffer line */}
                {safetyBuffer && safetyBuffer > 0 && (
                  <ReferenceLine 
                    y={safetyBuffer} 
                    stroke="hsl(var(--warning))"
                    strokeDasharray="3 3"
                    label={{ value: 'Güvenlik Tamponu', position: 'right', fill: 'hsl(var(--warning))', fontSize: 10 }}
                  />
                )}
                
                {/* Break-even quarter */}
                {breakEvenQuarter && (
                  <ReferenceLine 
                    x={breakEvenQuarter} 
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 3"
                    label={{ value: 'Break-even', position: 'top', fill: 'hsl(var(--primary))', fontSize: 10 }}
                  />
                )}
                
                <Line 
                  type="monotone" 
                  dataKey="bakiye" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="gelir" 
                  stroke="hsl(142 76% 36%)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="gider" 
                  stroke="hsl(0 84% 60%)"
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
