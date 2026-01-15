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

// PDF uyumluluğu için hex renk değerleri
const COLORS = {
  pessimistic: '#ef4444',  // Red (red-500)
  baseline: '#2563eb',     // Primary (blue-600)
  optimistic: '#22c55e',   // Green (green-500)
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="shortName" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }} className="rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-medium mb-2" style={{ color: '#0f172a' }}>{label} Senaryo</p>
                        <div className="space-y-1">
                          <p style={{ color: '#64748b' }}>Net Kar: <span className="font-semibold" style={{ color: '#0f172a' }}>{formatUSD(data.kar)}</span></p>
                          <p style={{ color: '#64748b' }}>ROI: <span className="font-semibold" style={{ color: '#0f172a' }}>%{data.roi.toFixed(0)}</span></p>
                          <p style={{ color: '#64748b' }}>Kar Marjı: <span className="font-semibold" style={{ color: '#0f172a' }}>%{data.margin.toFixed(1)}</span></p>
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
