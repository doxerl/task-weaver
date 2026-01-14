import { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { SensitivityAnalysis } from '@/types/simulation';
import { cn } from '@/lib/utils';

interface SensitivityChartProps {
  sensitivity: SensitivityAnalysis;
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

const COLORS = {
  pessimistic: 'hsl(0 84% 60%)',      // Red
  baseline: 'hsl(var(--primary))',     // Primary
  optimistic: 'hsl(142 76% 36%)',      // Green
};

export const SensitivityChart = forwardRef<HTMLDivElement, SensitivityChartProps>(
  ({ sensitivity, className }, ref) => {
    const data = [
      { 
        name: 'Pesimist\n(-20%)', 
        shortName: 'Pesimist',
        kar: Math.round(sensitivity.pessimistic.profit),
        roi: sensitivity.pessimistic.roi,
        margin: sensitivity.pessimistic.margin,
        color: COLORS.pessimistic,
      },
      { 
        name: 'Baz\nSenaryo', 
        shortName: 'Baz',
        kar: Math.round(sensitivity.baseline.profit),
        roi: sensitivity.baseline.roi,
        margin: sensitivity.baseline.margin,
        color: COLORS.baseline,
      },
      { 
        name: 'Optimist\n(+20%)', 
        shortName: 'Optimist',
        kar: Math.round(sensitivity.optimistic.profit),
        roi: sensitivity.optimistic.roi,
        margin: sensitivity.optimistic.margin,
        color: COLORS.optimistic,
      },
    ];

    return (
      <Card className={cn("", className)} ref={ref}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Duyarlılık Analizi - Kar Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="shortName" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
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
                        <p className="font-medium mb-2">{label} Senaryo</p>
                        <div className="space-y-1">
                          <p>Net Kar: <span className="font-semibold">{formatUSD(data.kar)}</span></p>
                          <p>ROI: <span className="font-semibold">%{data.roi.toFixed(0)}</span></p>
                          <p>Kar Marjı: <span className="font-semibold">%{data.margin.toFixed(1)}</span></p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar 
                  dataKey="kar" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={80}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Summary table below chart */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
              <p className="text-muted-foreground text-xs">Pesimist</p>
              <p className="font-semibold text-red-600">%{sensitivity.pessimistic.roi.toFixed(0)} ROI</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <p className="text-muted-foreground text-xs">Baz</p>
              <p className="font-semibold text-primary">%{sensitivity.baseline.roi.toFixed(0)} ROI</p>
            </div>
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
              <p className="text-muted-foreground text-xs">Optimist</p>
              <p className="font-semibold text-green-600">%{sensitivity.optimistic.roi.toFixed(0)} ROI</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

SensitivityChart.displayName = 'SensitivityChart';
