import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlyDataPoint } from '@/types/reports';

interface MonthlyTrendChartProps {
  data: MonthlyDataPoint[];
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₺${(value / 1000).toFixed(0)}K`;
  return `₺${value.toFixed(0)}`;
};

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="monthName" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={formatCurrency} className="fill-muted-foreground" />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={formatCurrency} className="fill-muted-foreground" />
        <Tooltip
          formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Gelir' : name === 'expense' ? 'Gider' : 'Net']}
          labelFormatter={(label) => `${label}`}
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        />
        <Legend formatter={(value) => value === 'income' ? 'Gelir' : value === 'expense' ? 'Gider' : 'Net Kâr'} />
        <Bar yAxisId="left" dataKey="income" fill="hsl(142, 76%, 36%)" name="income" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="expense" fill="hsl(0, 84%, 60%)" name="expense" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="net" stroke="hsl(221, 83%, 53%)" strokeWidth={2} name="net" dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
