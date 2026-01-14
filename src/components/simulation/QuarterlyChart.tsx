import { useMemo, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { QuarterlyAmounts } from '@/types/simulation';

interface QuarterlyChartProps {
  revenueQuarterly: QuarterlyAmounts;
  expenseQuarterly: QuarterlyAmounts;
  investmentQuarterly: QuarterlyAmounts;
  className?: string;
}

function formatUSD(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatUSD(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const QuarterlyChart = forwardRef<HTMLDivElement, QuarterlyChartProps>(
  function QuarterlyChart({ revenueQuarterly, expenseQuarterly, investmentQuarterly, className }, ref) {
    const chartData = useMemo(() => {
      const quarters: ('q1' | 'q2' | 'q3' | 'q4')[] = ['q1', 'q2', 'q3', 'q4'];
      const quarterLabels: Record<string, string> = {
        q1: 'Q1 (Oca-Mar)',
        q2: 'Q2 (Nis-Haz)',
        q3: 'Q3 (Tem-Eyl)',
        q4: 'Q4 (Eki-Ara)',
      };

      return quarters.map(q => ({
        name: quarterLabels[q],
        quarter: q.toUpperCase(),
        revenue: revenueQuarterly[q],
        expense: expenseQuarterly[q],
        investment: investmentQuarterly[q],
        netProfit: revenueQuarterly[q] - expenseQuarterly[q],
        netCashFlow: revenueQuarterly[q] - expenseQuarterly[q] - investmentQuarterly[q],
      }));
    }, [revenueQuarterly, expenseQuarterly, investmentQuarterly]);

    const totals = useMemo(() => ({
      revenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
      expense: chartData.reduce((sum, d) => sum + d.expense, 0),
      investment: chartData.reduce((sum, d) => sum + d.investment, 0),
    }), [chartData]);

    return (
      <div ref={ref} className={className}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Çeyreklik Gelir/Gider Karşılaştırması</span>
              <div className="text-sm font-normal text-muted-foreground">
                Toplam: {formatUSD(totals.revenue)} gelir, {formatUSD(totals.expense)} gider
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={formatUSD} 
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--chart-2))" 
                  name="Gelir" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="expense" 
                  fill="hsl(var(--destructive))" 
                  name="Gider" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="investment" 
                  fill="hsl(var(--chart-4))" 
                  name="Yatırım" 
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  type="monotone" 
                  dataKey="netCashFlow" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Net Nakit Akışı"
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }
);
