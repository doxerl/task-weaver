import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { CashFlowProjection } from '@/types/simulation';
import { cn } from '@/lib/utils';

interface CashFlowChartProps {
  projections: CashFlowProjection[];
  breakEvenMonth?: number | null;
  className?: string;
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export const CashFlowChart = forwardRef<HTMLDivElement, CashFlowChartProps>(
  ({ projections, breakEvenMonth, className }, ref) => {
    const data = projections.map(p => ({
      name: p.monthName,
      month: p.month,
      bakiye: Math.round(p.closingBalance),
      gelir: Math.round(p.revenue),
      gider: Math.round(p.expense),
      yatirim: Math.round(p.investment),
      netAkis: Math.round(p.netCashFlow),
    }));

    const minBalance = Math.min(...data.map(d => d.bakiye));
    const maxBalance = Math.max(...data.map(d => d.bakiye));
    const yMin = Math.min(0, minBalance) - 5000;
    const yMax = maxBalance + 10000;

    return (
      <Card className={cn("", className)} ref={ref}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aylık Nakit Akış Projeksiyonu</CardTitle>
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
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-medium mb-2">{label}</p>
                        <div className="space-y-1">
                          <p className="text-green-600">Gelir: {formatUSD(data.gelir)}</p>
                          <p className="text-red-600">Gider: {formatUSD(data.gider)}</p>
                          {data.yatirim > 0 && (
                            <p className="text-orange-600">Yatırım: {formatUSD(data.yatirim)}</p>
                          )}
                          <div className="border-t pt-1 mt-1">
                            <p className="text-primary">Net Akış: {formatUSD(data.netAkis)}</p>
                            <p className="font-semibold">Bakiye: {formatUSD(data.bakiye)}</p>
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
                
                {/* Break-even month */}
                {breakEvenMonth && (
                  <ReferenceLine 
                    x={projections[breakEvenMonth - 1]?.monthName} 
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
                  dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 6 }}
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
