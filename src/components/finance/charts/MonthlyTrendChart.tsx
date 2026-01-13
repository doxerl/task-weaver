import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlyDataPoint } from '@/types/reports';
import { useMemo } from 'react';

interface MonthlyTrendChartProps {
  data: MonthlyDataPoint[];
  formatAmount?: (value: number) => string;
}

const defaultFormatCurrency = (value: number) => {
  if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₺${(value / 1000).toFixed(0)}K`;
  return `₺${value.toFixed(0)}`;
};

export function MonthlyTrendChart({ data, formatAmount }: MonthlyTrendChartProps) {
  // Create short format based on whether we have custom formatAmount
  const formatShort = useMemo(() => {
    if (formatAmount) {
      return (value: number) => {
        const formatted = formatAmount(value);
        const isUsd = formatted.includes('$');
        const symbol = isUsd ? '$' : '₺';
        if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`;
        return `${symbol}${value.toFixed(0)}`;
      };
    }
    return defaultFormatCurrency;
  }, [formatAmount]);

  const tooltipFormatter = useMemo(() => {
    const formatter = formatAmount || ((v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v));
    return (value: number, name: string) => [formatter(value), name === 'income' ? 'Gelir' : name === 'expense' ? 'Gider' : 'Net'];
  }, [formatAmount]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="monthName" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={formatShort} className="fill-muted-foreground" />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={formatShort} className="fill-muted-foreground" />
        <Tooltip
          formatter={tooltipFormatter}
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
